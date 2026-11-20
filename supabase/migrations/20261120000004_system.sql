-- Audit log, rate limiting, login lockout, analytics events, page-builder RPCs.

-- ---------------------------------------------------------------- audit
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  actor_email text,
  action text not null,                 -- insert | update | delete | publish | restore | approve ...
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (created_at desc);
create index on public.audit_log (entity, entity_id);
alter table public.audit_log enable row level security;

create or replace function public.write_audit(p_action text, p_entity text, p_entity_id text, p_before jsonb, p_after jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor, actor_email, action, entity, entity_id, before, after)
  values (auth.uid(), auth.jwt()->>'email', p_action, p_entity, p_entity_id, p_before, p_after);
end $$;
revoke all on function public.write_audit(text, text, text, jsonb, jsonb) from public, anon;

-- Strip bulky/HTML columns from audit snapshots to keep the log readable.
create or replace function public.tg_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  b jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'body_json' end;
  a jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'body_json' end;
begin
  if tg_op = 'UPDATE' and b - 'updated_at' - 'updated_by' = a - 'updated_at' - 'updated_by' then
    return new;  -- no meaningful change
  end if;
  insert into public.audit_log (actor, actor_email, action, entity, entity_id, before, after)
  values (auth.uid(), auth.jwt()->>'email', lower(tg_op), tg_table_name,
          coalesce(a->>'id', b->>'id'), b, a);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'media_assets', 'offices', 'user_roles', 'site_settings', 'navigation_items', 'pages',
    'page_sections', 'categories', 'tags', 'blog_posts', 'consent_records', 'member_journeys',
    'journey_updates', 'events', 'programmes', 'announcements', 'join_applications',
    'contact_enquiries', 'courses', 'modules', 'lessons', 'resources'
  ] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.tg_audit()', t, t);
  end loop;
end $$;

-- profiles: audit only staff-relevant changes (activation, office)
create trigger profiles_audit after update of is_active, office_id on public.profiles
  for each row execute function public.tg_audit();

-- ---------------------------------------------------------------- office high-trust fields
-- Office admins cannot change high-trust fields directly; they submit pending_changes
-- which a central admin approves (blueprint 11.3).
create or replace function public.tg_office_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_central() then
    return new;
  end if;
  if (new.name, new.slug, new.status, new.address_line, new.postcode, new.city, new.state, new.country,
      new.lat, new.lng, new.phone, new.email, new.whatsapp, new.verification_status, new.last_verified_at)
     is distinct from
     (old.name, old.slug, old.status, old.address_line, old.postcode, old.city, old.state, old.country,
      old.lat, old.lng, old.phone, old.email, old.whatsapp, old.verification_status, old.last_verified_at) then
    raise exception 'High-trust office fields need central approval. Submit them as pending changes.';
  end if;
  if new.pending_changes is distinct from old.pending_changes and new.pending_changes is not null then
    new.pending_submitted_by := auth.uid();
    new.pending_submitted_at := now();
  end if;
  return new;
end $$;
create trigger offices_guard before update on public.offices
  for each row execute function public.tg_office_guard();

create or replace function public.approve_office_changes(p_office uuid, p_verify boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare o public.offices; pc jsonb;
begin
  if not public.is_central() then raise exception 'forbidden'; end if;
  select * into o from public.offices where id = p_office for update;
  pc := coalesce(o.pending_changes, '{}'::jsonb);
  update public.offices set
    name = coalesce(pc->>'name', name),
    address_line = coalesce(pc->>'address_line', address_line),
    postcode = coalesce(pc->>'postcode', postcode),
    city = coalesce(pc->>'city', city),
    state = coalesce(pc->>'state', state),
    country = coalesce(pc->>'country', country),
    lat = coalesce((pc->>'lat')::double precision, lat),
    lng = coalesce((pc->>'lng')::double precision, lng),
    phone = coalesce(pc->>'phone', phone),
    email = coalesce(pc->>'email', email),
    whatsapp = coalesce(pc->>'whatsapp', whatsapp),
    pending_changes = null,
    verification_status = case when p_verify then 'verified' else verification_status end,
    last_verified_at = case when p_verify then now() else last_verified_at end,
    verified_by = case when p_verify then auth.uid() else verified_by end
  where id = p_office;
  perform public.write_audit('approve', 'offices', p_office::text, jsonb_build_object('pending_changes', pc), null);
end $$;

-- ---------------------------------------------------------------- page builder RPCs
create or replace function public.can_edit_site()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_central()
$$;

-- Admin read including drafts (anon/authenticated cannot select draft_content directly).
create or replace function public.admin_page_sections(p_page_key text)
returns table (id uuid, section_key text, sort_order int, visible boolean, palette_layer text,
               content jsonb, draft_content jsonb, status public.content_status,
               published_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_edit_site() then raise exception 'forbidden'; end if;
  return query
    select s.id, s.section_key, s.sort_order, s.visible, s.palette_layer, s.content, s.draft_content,
           s.status, s.published_at, s.updated_at
    from public.page_sections s join public.pages p on p.id = s.page_id
    where p.key = p_page_key order by s.sort_order;
end $$;

create or replace function public.save_section_draft(p_section uuid, p_draft jsonb, p_layer text default null, p_visible boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_site() then raise exception 'forbidden'; end if;
  update public.page_sections
     set draft_content = p_draft,
         palette_layer = coalesce(p_layer, palette_layer),
         visible = coalesce(p_visible, visible)
   where id = p_section;
end $$;

create or replace function public.publish_section(p_section uuid)
returns text language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.can_edit_site() then raise exception 'forbidden'; end if;
  update public.page_sections
     set content = coalesce(draft_content, content), draft_content = null, published_at = now()
   where id = p_section;
  insert into public.section_revisions (section_id, content, palette_layer, visible, action)
    select id, content, palette_layer, visible, 'publish' from public.page_sections where id = p_section;
  select p.key into k from public.pages p join public.page_sections s on s.page_id = p.id where s.id = p_section;
  return k;
end $$;

create or replace function public.restore_section_revision(p_revision uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.section_revisions; k text;
begin
  if not public.can_edit_site() then raise exception 'forbidden'; end if;
  select * into r from public.section_revisions where id = p_revision;
  if not found then raise exception 'revision not found'; end if;
  update public.page_sections
     set content = r.content, draft_content = null,
         palette_layer = coalesce(r.palette_layer, palette_layer), published_at = now()
   where id = r.section_id;
  insert into public.section_revisions (section_id, content, palette_layer, visible, action)
    values (r.section_id, r.content, r.palette_layer, r.visible, 'restore');
  select p.key into k from public.pages p join public.page_sections s on s.page_id = p.id where s.id = r.section_id;
  return k;
end $$;

create or replace function public.reorder_sections(p_page uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_edit_site() then raise exception 'forbidden'; end if;
  update public.page_sections s set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where s.id = x.id and s.page_id = p_page;
end $$;

-- ---------------------------------------------------------------- media usage
create or replace function public.asset_usage(p_asset uuid)
returns table (entity text, entity_id text, label text)
language sql stable security definer set search_path = public as $$
  select 'page_section', s.id::text, p.title || ' › ' || s.section_key
    from public.page_sections s join public.pages p on p.id = s.page_id
   where s.content::text like '%' || p_asset::text || '%' or coalesce(s.draft_content::text, '') like '%' || p_asset::text || '%'
  union all select 'blog_post', id::text, title from public.blog_posts
   where cover_asset_id = p_asset or og_image_asset_id = p_asset or body_html like '%' || p_asset::text || '%'
  union all select 'office', id::text, name from public.offices where hero_asset_id = p_asset or p_asset = any(gallery)
  union all select 'event', id::text, title from public.events where cover_asset_id = p_asset
  union all select 'announcement', id::text, title from public.announcements where cover_asset_id = p_asset
  union all select 'journey', id::text, title from public.member_journeys where portrait_asset_id = p_asset
  union all select 'journey_update', id::text, title from public.journey_updates where asset_id = p_asset
  union all select 'site_settings', '1', 'Site settings' from public.site_settings
   where p_asset in (logo_asset_id, logo_alt_asset_id, favicon_asset_id, og_image_asset_id)
  union all select 'page', id::text, title from public.pages where og_image_asset_id = p_asset
  union all select 'resource', id::text, title from public.resources where asset_id = p_asset
  union all select 'course', id::text, title from public.courses where cover_asset_id = p_asset
$$;

-- ---------------------------------------------------------------- rate limiting
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
alter table public.rate_limits enable row level security;

-- Returns true when the call is allowed. Service role only.
create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into public.rate_limits as r (key, window_start, count) values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into c;
  return c <= p_max;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------- login lockout
create table public.login_attempts (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index on public.login_attempts (email_hash, created_at desc);
create index on public.login_attempts (ip_hash, created_at desc);
alter table public.login_attempts enable row level security;

-- Locked when 5+ failures for this email (or 20+ from this IP hash) in 15 minutes.
create or replace function public.login_locked(p_email_hash text, p_ip_hash text)
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.login_attempts
           where email_hash = p_email_hash and not success and created_at > now() - interval '15 minutes') >= 5
      or (select count(*) from public.login_attempts
           where ip_hash = p_ip_hash and not success and created_at > now() - interval '15 minutes') >= 20
$$;
revoke all on function public.login_locked(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- analytics events
create table public.analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_hash text,                    -- null when visitor has not consented
  event_name text not null,
  path text not null,
  referrer_domain text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  country text,
  props jsonb not null default '{}'::jsonb
);
create index on public.analytics_events (created_at desc);
create index on public.analytics_events (event_name, created_at desc);
create index on public.analytics_events (path, created_at desc);
alter table public.analytics_events enable row level security;
