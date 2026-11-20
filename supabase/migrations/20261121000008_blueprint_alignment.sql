-- Blueprint v1.0 alignment (see docs/BLUEPRINT_GAPS.md).

-- ---------------------------------------------------------------- enums
alter type public.blog_status add value if not exists 'revised' after 'published';
alter type public.anonymity_level add value if not exists 'initials';
alter type public.anonymity_level add value if not exists 'pseudonym';

-- ---------------------------------------------------------------- settings (§19: Nigerian audience)
alter table public.site_settings alter column default_timezone set default 'Africa/Lagos';
update public.site_settings set default_timezone = 'Africa/Lagos' where default_timezone = 'UTC';

-- ---------------------------------------------------------------- join applications (§12.2 / §12.3)
alter table public.join_applications alter column email drop not null;
alter table public.join_applications alter column phone drop not null;
alter table public.join_applications alter column consent_contact drop not null;
alter table public.join_applications alter column consent_contact set default false;
alter table public.join_applications
  add column if not exists occupation text check (occupation in ('student', 'employed', 'self_employed', 'other', 'prefer_not_to_say')),
  add column if not exists message text check (char_length(message) <= 1500),
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists consent_version text,
  add constraint join_email_or_phone check (email is not null or phone is not null);

-- ---------------------------------------------------------------- contact routes (§12.4)
alter table public.contact_enquiries drop constraint if exists contact_enquiries_enquiry_type_check;
alter table public.contact_enquiries add constraint contact_enquiries_enquiry_type_check check (enquiry_type in (
  'general', 'media', 'partnership', 'office_information', 'product', 'privacy', 'technical',
  -- earlier values kept valid for existing rows
  'office_visit', 'member_support', 'feedback', 'safeguarding'
));

-- ---------------------------------------------------------------- offices (§11.2 / §11.3)
alter table public.offices
  add column if not exists preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'email', 'visit')),
  add column if not exists lead_contact_consent boolean not null default false,
  add column if not exists visit_appointment text,
  add column if not exists what_to_bring text,
  add column if not exists eligibility_costs text;

-- Leader names are high-trust (§11.3): extend the guard.
create or replace function public.tg_office_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_central() then
    return new;
  end if;
  if (new.name, new.slug, new.status, new.address_line, new.postcode, new.city, new.state, new.country,
      new.lat, new.lng, new.phone, new.email, new.whatsapp, new.verification_status, new.last_verified_at,
      new.lead_contact_name, new.lead_contact_role)
     is distinct from
     (old.name, old.slug, old.status, old.address_line, old.postcode, old.city, old.state, old.country,
      old.lat, old.lng, old.phone, old.email, old.whatsapp, old.verification_status, old.last_verified_at,
      old.lead_contact_name, old.lead_contact_role) then
    raise exception 'High-trust office fields need central approval. Submit them as pending changes.';
  end if;
  if new.pending_changes is distinct from old.pending_changes and new.pending_changes is not null then
    new.pending_submitted_by := auth.uid();
    new.pending_submitted_at := now();
  end if;
  return new;
end $$;

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
    lead_contact_name = coalesce(pc->>'lead_contact_name', lead_contact_name),
    lead_contact_role = coalesce(pc->>'lead_contact_role', lead_contact_role),
    pending_changes = null,
    verification_status = case when p_verify then 'verified' else verification_status end,
    last_verified_at = case when p_verify then now() else last_verified_at end,
    verified_by = case when p_verify then auth.uid() else verified_by end
  where id = p_office;
  perform public.write_audit('approve', 'offices', p_office::text, jsonb_build_object('pending_changes', pc), null);
end $$;

-- ---------------------------------------------------------------- journeys + consent (§10.3 / §10.4)
alter table public.member_journeys
  add column if not exists growth_statement text,
  add column if not exists starting_point text,
  add column if not exists challenge text,
  add column if not exists support_received text,
  add column if not exists actions_taken text,
  add column if not exists skills_developed text[] not null default '{}',
  add column if not exists current_progress text,
  add column if not exists advice text,
  add column if not exists quote text,
  add column if not exists contains_claims boolean not null default false,
  add column if not exists claims_approved_by uuid,
  add column if not exists claims_approved_at timestamptz;

alter table public.consent_records
  add column if not exists subject_is_minor boolean not null default false,
  add column if not exists guardian_name text,
  add column if not exists guardian_consent boolean not null default false;

-- Publishing rules: verified + valid consent (+ guardian for minors) + central approval of strong claims.
create or replace function public.tg_journey_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.consent_records;
begin
  if new.status = 'published' and new.contains_claims and new.claims_approved_by is null then
    if auth.uid() is null or public.is_central() then
      new.claims_approved_by := coalesce(auth.uid(), new.claims_approved_by);
      new.claims_approved_at := now();
    else
      raise exception 'This story contains earnings, health or other strong claims. A central admin must approve it before publishing.';
    end if;
  end if;
  if new.status = 'published' then
    if not new.verified then
      raise exception 'Journey must be verified before publishing';
    end if;
    select * into c from public.consent_records where id = new.consent_record_id;
    if not found or c.withdrawn_at is not null or (c.expires_on is not null and c.expires_on < current_date) then
      raise exception 'Journey needs a valid consent record before publishing';
    end if;
    if c.subject_is_minor and not c.guardian_consent then
      raise exception 'The person is under 18: a parent or guardian must also consent before publishing.';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

-- Re-grant the public column list for journeys to include the new public fields (never person_name).
revoke select on public.member_journeys from anon;
grant select (id, slug, title, public_name, anonymity_level, path, summary, body_html, portrait_asset_id,
              office_id, consent_record_id, verified, status, published_at, featured, seo_title,
              seo_description, created_at, updated_at, growth_statement, starting_point, challenge,
              support_received, actions_taken, skills_developed, current_progress, advice, quote)
  on public.member_journeys to anon;

-- ---------------------------------------------------------------- events (§10.5)
alter table public.events
  add column if not exists category text,
  add column if not exists organiser text,
  add column if not exists capacity int check (capacity is null or capacity > 0),
  add column if not exists eligibility text,
  add column if not exists contact text;

-- ---------------------------------------------------------------- articles (§10.1 / §10.2)
alter table public.blog_posts
  add column if not exists author_role text,
  add column if not exists sources jsonb not null default '[]'::jsonb,   -- [{label, url}]
  add column if not exists related_ids uuid[] not null default '{}',
  add column if not exists review_notes text;

-- ---------------------------------------------------------------- announcements (§13.2)
alter table public.announcements
  add column if not exists priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  add column if not exists expires_at timestamptz;

-- ---------------------------------------------------------------- member growth (§13.2 My Growth)
alter table public.profiles add column if not exists goals text[] not null default '{}';
