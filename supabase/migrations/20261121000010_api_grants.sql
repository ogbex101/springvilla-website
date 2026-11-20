-- Explicit privileges for the Supabase API roles.
-- Newer Supabase projects no longer grant anon/authenticated/service_role access to
-- tables created in SQL, so every grant is stated here. RLS still decides which rows
-- each role can see or change; these grants only decide which tables/columns are reachable.

grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------- service_role (server only, bypasses RLS)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------- authenticated (staff and members; RLS applies)
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- Drafts are never selectable through the API (admins read them via admin_page_sections()).
revoke select on public.page_sections from authenticated;
grant select (id, page_id, section_key, sort_order, visible, palette_layer, content, status,
              published_at, created_at, updated_at) on public.page_sections to authenticated;
-- System tables are written only by triggers / the server.
revoke insert, update, delete on public.audit_log, public.analytics_events, public.rate_limits, public.login_attempts from authenticated;

-- ---------------------------------------------------------------- anon (public visitors; read-only, RLS limits to published)
grant select on public.media_assets, public.offices, public.site_settings, public.navigation_items, public.pages,
  public.categories, public.tags, public.blog_posts, public.blog_post_tags, public.journey_updates,
  public.events, public.programmes, public.announcements to anon;
grant select (id, page_id, section_key, sort_order, visible, palette_layer, content, status,
              published_at, created_at, updated_at) on public.page_sections to anon;
grant select (id, slug, title, public_name, anonymity_level, path, summary, body_html, portrait_asset_id,
              office_id, consent_record_id, verified, status, published_at, featured, seo_title,
              seo_description, created_at, updated_at, growth_statement, starting_point, challenge,
              support_received, actions_taken, skills_developed, current_progress, advice, quote)
  on public.member_journeys to anon;

-- ---------------------------------------------------------------- functions
-- Policies call the role helpers, and the admin/analytics RPCs check permissions themselves.
grant execute on all functions in schema public to anon, authenticated;
-- Internal functions stay server-only.
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.login_locked(text, text) from public, anon, authenticated;
revoke execute on function public.write_audit(text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.analytics_prune() from public, anon, authenticated;

-- ---------------------------------------------------------------- future tables
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
