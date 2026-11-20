-- Row Level Security policies.
-- Rules: public sees published only; office_admin only their office; editors only
-- their content type; members only their own records; central = super + central admin.

-- ---------------------------------------------------------------- media
create policy media_read on public.media_assets for select
  using (bucket = 'public-media' or public.is_staff());
create policy media_insert on public.media_assets for insert to authenticated
  with check (
    public.has_role('super_admin', 'central_admin', 'blog_editor', 'story_editor', 'events_editor', 'training_admin')
    or (public.has_role('office_admin') and office_id = any(public.my_office_ids()))
  );
create policy media_update on public.media_assets for update to authenticated
  using (public.is_central() or uploaded_by = auth.uid())
  with check (public.is_central() or uploaded_by = auth.uid());
create policy media_delete on public.media_assets for delete to authenticated using (public.is_central());

-- ---------------------------------------------------------------- offices
create policy offices_read on public.offices for select
  using (status = 'published' or public.is_staff());
create policy offices_insert on public.offices for insert to authenticated with check (public.is_central());
create policy offices_update on public.offices for update to authenticated
  using (public.can_manage_office(id)) with check (public.can_manage_office(id));
create policy offices_delete on public.offices for delete to authenticated using (public.is_central());

-- ---------------------------------------------------------------- profiles & roles
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_central()
    or public.has_role('member_support')
    or (office_id is not null and office_id = any(public.my_office_ids()))
  );
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_central())
  with check (id = auth.uid() or public.is_central());

-- Members may not change their own office or activation flag.
create or replace function public.tg_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_central()
     and (new.is_active is distinct from old.is_active or new.office_id is distinct from old.office_id) then
    raise exception 'Only a central admin can change office or activation';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.tg_profile_guard();

create policy roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_central());
create policy roles_write on public.user_roles for all to authenticated
  using (public.is_central() and (role <> 'super_admin' or public.has_role('super_admin')))
  with check (public.is_central() and (role <> 'super_admin' or public.has_role('super_admin')));

-- ---------------------------------------------------------------- settings, nav, pages
create policy settings_read on public.site_settings for select using (true);
create policy settings_update on public.site_settings for update to authenticated
  using (public.is_central()) with check (public.is_central());

create policy nav_read on public.navigation_items for select using (visible or public.is_staff());
create policy nav_write on public.navigation_items for all to authenticated
  using (public.is_central()) with check (public.is_central());

create policy pages_read on public.pages for select using (status = 'published' or public.is_staff());
create policy pages_write on public.pages for all to authenticated
  using (public.is_central()) with check (public.is_central());

create policy sections_read on public.page_sections for select
  using ((visible and status = 'published'
          and exists (select 1 from public.pages p where p.id = page_id and p.status = 'published'))
         or public.is_staff());
create policy sections_write on public.page_sections for all to authenticated
  using (public.is_central()) with check (public.is_central());

-- Drafts are never readable through the table API (use admin_page_sections()).
revoke select on public.page_sections from anon, authenticated;
grant select (id, page_id, section_key, sort_order, visible, palette_layer, content, status,
              published_at, created_at, updated_at) on public.page_sections to anon, authenticated;

create policy revisions_read on public.section_revisions for select to authenticated using (public.is_central());

-- ---------------------------------------------------------------- blog
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'blog_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'blog_editor'));
create policy tags_read on public.tags for select using (true);
create policy tags_write on public.tags for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'blog_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'blog_editor'));

create policy posts_read on public.blog_posts for select
  using ((status in ('published', 'scheduled') and published_at <= now())
         or public.has_role('super_admin', 'central_admin', 'blog_editor'));
create policy posts_write on public.blog_posts for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'blog_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'blog_editor'));
create policy post_tags_read on public.blog_post_tags for select using (true);
create policy post_tags_write on public.blog_post_tags for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'blog_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'blog_editor'));

-- ---------------------------------------------------------------- journeys & consent
create policy consent_all on public.consent_records for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'story_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'story_editor'));

create policy journeys_read on public.member_journeys for select
  using ((status = 'published' and verified and consent_record_id is not null)
         or public.has_role('super_admin', 'central_admin', 'story_editor'));
create policy journeys_write on public.member_journeys for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'story_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'story_editor'));

-- Public never sees the internal person_name: expose a safe view instead.
revoke select on public.member_journeys from anon;
grant select (id, slug, title, public_name, anonymity_level, path, summary, body_html, portrait_asset_id,
              office_id, consent_record_id, verified, status, published_at, featured, seo_title,
              seo_description, created_at, updated_at) on public.member_journeys to anon;

create policy journey_updates_read on public.journey_updates for select
  using (exists (select 1 from public.member_journeys j where j.id = journey_id
                 and j.status = 'published' and j.verified)
         or public.has_role('super_admin', 'central_admin', 'story_editor'));
create policy journey_updates_write on public.journey_updates for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'story_editor'))
  with check (public.has_role('super_admin', 'central_admin', 'story_editor'));

-- ---------------------------------------------------------------- events, programmes, announcements
create policy events_read on public.events for select
  using ((status = 'published' and (audience = 'public' or auth.uid() is not null))
         or public.has_role('super_admin', 'central_admin', 'events_editor')
         or (public.has_role('office_admin') and office_id = any(public.my_office_ids())));
create policy events_write on public.events for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'events_editor')
         or (public.has_role('office_admin') and office_id = any(public.my_office_ids())))
  with check (public.has_role('super_admin', 'central_admin', 'events_editor')
              or (public.has_role('office_admin') and office_id = any(public.my_office_ids())));

create policy programmes_read on public.programmes for select using (status = 'published' or public.is_staff());
create policy programmes_write on public.programmes for all to authenticated
  using (public.is_central()) with check (public.is_central());

create policy announcements_read on public.announcements for select
  using (
    (status = 'published' and kind = 'news')
    or (status = 'published' and auth.uid() is not null
        and (office_id is null or office_id = public.my_member_office()))
    or public.is_central()
    or (kind = 'news' and public.has_role('events_editor'))
    or (kind = 'member' and public.has_role('training_admin'))
    or (public.has_role('office_admin') and office_id = any(public.my_office_ids()))
  );
create policy announcements_write on public.announcements for all to authenticated
  using (public.is_central()
         or (kind = 'news' and public.has_role('events_editor'))
         or (kind = 'member' and public.has_role('training_admin'))
         or (kind = 'office' and public.has_role('office_admin') and office_id = any(public.my_office_ids())))
  with check (public.is_central()
              or (kind = 'news' and public.has_role('events_editor'))
              or (kind = 'member' and public.has_role('training_admin'))
              or (kind = 'office' and public.has_role('office_admin') and office_id = any(public.my_office_ids())));

create policy reads_own on public.announcement_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- inbox (inserts come from the server via service role)
create policy applications_read on public.join_applications for select to authenticated
  using (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id));
create policy applications_update on public.join_applications for update to authenticated
  using (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id))
  with check (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id));
create policy applications_delete on public.join_applications for delete to authenticated using (public.is_central());

create policy enquiries_read on public.contact_enquiries for select to authenticated
  using (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id));
create policy enquiries_update on public.contact_enquiries for update to authenticated
  using (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id))
  with check (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id));
create policy enquiries_delete on public.contact_enquiries for delete to authenticated using (public.is_central());

create policy support_own on public.support_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role('super_admin', 'central_admin', 'member_support')
         or public.can_manage_office(office_id));
create policy support_insert on public.support_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy support_update on public.support_requests for update to authenticated
  using (public.has_role('super_admin', 'central_admin', 'member_support') or public.can_manage_office(office_id));

-- ---------------------------------------------------------------- learning & resources (members only)
create policy courses_read on public.courses for select to authenticated
  using ((status = 'published' and (office_id is null or office_id = public.my_member_office()))
         or public.has_role('super_admin', 'central_admin', 'training_admin'));
create policy courses_write on public.courses for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'training_admin'))
  with check (public.has_role('super_admin', 'central_admin', 'training_admin'));

create policy modules_read on public.modules for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id));  -- inherits course visibility via RLS
create policy modules_write on public.modules for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'training_admin'))
  with check (public.has_role('super_admin', 'central_admin', 'training_admin'));

create policy lessons_read on public.lessons for select to authenticated
  using ((status = 'published' and exists (select 1 from public.modules m where m.id = module_id))
         or public.has_role('super_admin', 'central_admin', 'training_admin'));
create policy lessons_write on public.lessons for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'training_admin'))
  with check (public.has_role('super_admin', 'central_admin', 'training_admin'));

create policy progress_own on public.member_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy resources_read on public.resources for select to authenticated
  using ((status = 'published' and (office_id is null or office_id = public.my_member_office()))
         or public.has_role('super_admin', 'central_admin', 'training_admin')
         or public.can_manage_office(office_id));
create policy resources_write on public.resources for all to authenticated
  using (public.has_role('super_admin', 'central_admin', 'training_admin') or public.can_manage_office(office_id))
  with check (public.has_role('super_admin', 'central_admin', 'training_admin') or public.can_manage_office(office_id));

-- ---------------------------------------------------------------- system
create policy audit_read on public.audit_log for select to authenticated using (public.is_central());
-- analytics_events, rate_limits, login_attempts: no policies → service role only.
