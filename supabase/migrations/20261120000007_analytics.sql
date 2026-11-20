-- Analytics aggregates. Central admins only. Aggregates never expose session hashes.

create or replace function public.analytics_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_central() then raise exception 'forbidden'; end if;

  with ev as (
    select * from public.analytics_events where created_at >= p_from and created_at < p_to
  ),
  pv as (select * from ev where event_name = 'page_view'),
  days as (
    select generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day')::date as d
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'page_views', (select count(*) from pv),
      'visitors', (select count(distinct session_hash) from pv where session_hash is not null),
      'anonymous_views', (select count(*) from pv where session_hash is null)
    ),
    'timeseries', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', v, 'visitors', u) order by d), '[]')
                   from (select days.d,
                                count(pv.id) as v,
                                count(distinct pv.session_hash) as u
                         from days left join pv on pv.created_at::date = days.d group by days.d) t),
    'top_pages', (select coalesce(jsonb_agg(x), '[]') from (select path as label, count(*) as value from pv group by path order by 2 desc limit 15) x),
    'referrers', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(referrer_domain, 'Direct') as label, count(*) as value from pv group by 1 order by 2 desc limit 15) x),
    'campaigns', (select coalesce(jsonb_agg(x), '[]') from (select concat_ws(' / ', utm_source, utm_medium, utm_campaign) as label, count(*) as value from pv where utm_source is not null or utm_campaign is not null group by 1 order by 2 desc limit 15) x),
    'devices', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(device_type, 'unknown') as label, count(*) as value from pv group by 1 order by 2 desc) x),
    'browsers', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(browser, 'other') as label, count(*) as value from pv group by 1 order by 2 desc limit 8) x),
    'countries', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(country, 'unknown') as label, count(*) as value from pv group by 1 order by 2 desc limit 15) x),
    'ctas', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(props->>'id', 'unknown') as label, count(*) as value from ev where event_name = 'cta_click' group by 1 order by 2 desc limit 20) x),
    'hero', jsonb_build_object(
      'home_views', (select count(*) from pv where path = '/'),
      'plays', (select count(*) from ev where event_name = 'hero_video_play'),
      'pauses', (select count(*) from ev where event_name = 'hero_video_pause')
    ),
    'scroll_depth', (select coalesce(jsonb_agg(x), '[]') from (
        select path as label,
               count(*) filter (where (props->>'depth')::int = 25) as d25,
               count(*) filter (where (props->>'depth')::int = 50) as d50,
               count(*) filter (where (props->>'depth')::int = 75) as d75,
               count(*) filter (where (props->>'depth')::int = 100) as d100
        from ev where event_name = 'scroll_depth' group by path order by d25 desc limit 15) x),
    'funnel', jsonb_build_object(
      'visited', (select count(*) from pv where path = '/join'),
      'started', (select count(*) from ev where event_name = 'join_started'),
      'submitted', (select count(*) from ev where event_name = 'join_submitted')
    ),
    'articles', (select coalesce(jsonb_agg(x), '[]') from (select path as label, count(*) as value from ev where event_name = 'article_read' group by 1 order by 2 desc limit 10) x),
    'events', (select coalesce(jsonb_agg(x), '[]') from (select event_name as label, count(*) as value from ev group by 1 order by 2 desc) x)
  ) into result;
  return result;
end $$;

-- Raw rows for CSV export (no session hash).
create or replace function public.analytics_export(p_from timestamptz, p_to timestamptz)
returns table (created_at timestamptz, event_name text, path text, referrer_domain text, utm_source text,
               utm_medium text, utm_campaign text, device_type text, browser text, country text, props jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_central() then raise exception 'forbidden'; end if;
  return query select e.created_at, e.event_name, e.path, e.referrer_domain, e.utm_source, e.utm_medium,
    e.utm_campaign, e.device_type, e.browser, e.country, e.props
    from public.analytics_events e where e.created_at >= p_from and e.created_at < p_to
    order by e.created_at limit 100000;
end $$;

-- Visitors for the dashboard (central only), today / 7d / 30d.
create or replace function public.analytics_visitor_counts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_central() then return null; end if;
  return jsonb_build_object(
    'today', (select count(distinct coalesce(session_hash, id::text)) from public.analytics_events where event_name = 'page_view' and created_at >= date_trunc('day', now())),
    'd7', (select count(distinct coalesce(session_hash, id::text)) from public.analytics_events where event_name = 'page_view' and created_at >= now() - interval '7 days'),
    'd30', (select count(distinct coalesce(session_hash, id::text)) from public.analytics_events where event_name = 'page_view' and created_at >= now() - interval '30 days'),
    'spark', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', c) order by d), '[]') from (
       select g::date as d, (select count(*) from public.analytics_events e where e.event_name = 'page_view' and e.created_at::date = g::date) as c
       from generate_series(now() - interval '13 days', now(), interval '1 day') g) s)
  );
end $$;

-- Retention: drop raw analytics older than 13 months (call from a scheduled job).
create or replace function public.analytics_prune()
returns void language sql security definer set search_path = public as $$
  delete from public.analytics_events where created_at < now() - interval '13 months';
  delete from public.login_attempts where created_at < now() - interval '30 days';
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
revoke all on function public.analytics_prune() from public, anon, authenticated;
