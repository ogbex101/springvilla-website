-- =====================================================================
-- Springvilla: complete database setup (schema + seed)
-- Seed version: 2026-11-21.blueprint-v1
--
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Run it ONCE on a fresh project. It creates every table, policy, function
-- and storage bucket, then seeds page copy, categories, settings and menus.
-- It never creates offices, people, stories, events or numbers.
-- Later schema changes: run `npm run db:migrate` from your own computer.
-- Regenerate with: npm run db:setup-sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Migration: 20261120000001_core.sql
-- ---------------------------------------------------------------------
-- Springvilla core schema: enums, helpers, identity, settings, pages, media, offices.
-- Every table has RLS enabled (policies in 20261120000005_rls.sql).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type public.app_role as enum (
  'super_admin', 'central_admin', 'office_admin', 'blog_editor', 'story_editor',
  'events_editor', 'training_admin', 'member_support', 'member'
);
create type public.content_status as enum ('draft', 'in_review', 'published', 'archived');
create type public.blog_status as enum (
  'idea', 'draft', 'in_review', 'claims_review', 'approved', 'scheduled', 'published', 'archived'
);
create type public.media_type as enum ('image', 'video', 'document');
create type public.inbox_status as enum ('new', 'contacted', 'visited', 'closed');
create type public.nav_location as enum ('header', 'footer', 'mobile', 'legal');
create type public.verification_status as enum ('unverified', 'pending', 'verified');
create type public.anonymity_level as enum ('named', 'first_name', 'anonymous');
create type public.growth_path as enum ('digital', 'business', 'both', 'foundation');

-- ---------------------------------------------------------------- generic triggers
create or replace function public.tg_set_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------- media (FK to offices added later)
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-media' check (bucket in ('public-media', 'private-docs', 'consent-proofs')),
  path text not null,
  type public.media_type not null,
  mime text not null,
  width int,
  height int,
  duration numeric,
  size_bytes bigint not null default 0,
  alt_text text,
  caption text,
  credit text,
  date_taken date,
  location text,
  consent_confirmed boolean not null default false,
  usage_restrictions text,
  variants jsonb not null default '[]'::jsonb,
  blur_data_url text,
  office_id uuid,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (bucket, path)
);
create index on public.media_assets (type, created_at desc);
create trigger media_assets_updated before update on public.media_assets
  for each row execute function public.tg_set_updated();

-- ---------------------------------------------------------------- offices
create table public.offices (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  status public.content_status not null default 'draft',
  city text,
  state text,
  country text,
  address_line text,
  postcode text,
  lat double precision,
  lng double precision,
  phone text,
  email text,
  whatsapp text,
  hours jsonb not null default '[]'::jsonb,            -- [{day, opens, closes, note}]
  summary text,
  welcome text,                                          -- office page part: welcome
  what_happens text,                                     -- what happens here
  programmes text,                                       -- programmes offered (rich text)
  first_visit text,                                      -- what to expect on a first visit
  getting_there text,
  accessibility text,
  lead_contact_name text,
  lead_contact_role text,
  hero_asset_id uuid references public.media_assets(id) on delete set null,
  gallery uuid[] not null default '{}',
  verification_status public.verification_status not null default 'unverified',
  last_verified_at timestamptz,
  verified_by uuid,
  pending_changes jsonb,                                 -- high-trust edits awaiting central approval
  pending_submitted_by uuid,
  pending_submitted_at timestamptz,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create index on public.offices (status, state, city);
create trigger offices_updated before update on public.offices
  for each row execute function public.tg_set_updated();

alter table public.media_assets
  add constraint media_assets_office_fk foreign key (office_id) references public.offices(id) on delete set null;

-- ---------------------------------------------------------------- identity
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_asset_id uuid references public.media_assets(id) on delete set null,
  office_id uuid references public.offices(id) on delete set null,
  phone text,
  is_active boolean not null default true,
  privacy jsonb not null default '{"show_name_to_office": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.tg_set_updated();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  office_id uuid references public.offices(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint user_roles_unique unique nulls not distinct (user_id, role, office_id),
  constraint office_admin_needs_office check (role <> 'office_admin' or office_id is not null)
);
create index on public.user_roles (user_id);

-- Create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- role helpers
-- super_admin only counts when the session has passed MFA (aal2).
create or replace function public.current_roles()
returns setof public.app_role
language sql stable security definer set search_path = public as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id and p.is_active
  where ur.user_id = auth.uid()
    and (ur.role <> 'super_admin' or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2')
$$;

create or replace function public.has_role(variadic roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.current_roles() r where r = any(roles))
$$;

create or replace function public.is_central()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('super_admin', 'central_admin')
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.current_roles() r where r <> 'member')
$$;

create or replace function public.my_office_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct ur.office_id), '{}')
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id and p.is_active
  where ur.user_id = auth.uid() and ur.role = 'office_admin' and ur.office_id is not null
$$;

create or replace function public.my_member_office()
returns uuid language sql stable security definer set search_path = public as $$
  select office_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.can_manage_office(oid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_central() or (oid is not null and oid = any(public.my_office_ids()))
$$;

-- ---------------------------------------------------------------- settings & navigation
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'Springvilla',
  tagline text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  logo_alt_asset_id uuid references public.media_assets(id) on delete set null,
  favicon_asset_id uuid references public.media_assets(id) on delete set null,
  contact jsonb not null default '{}'::jsonb,      -- {email, phone, whatsapp, address}
  social jsonb not null default '[]'::jsonb,       -- [{platform, url}] shown only when url filled
  default_seo_title text,
  default_seo_description text,
  og_image_asset_id uuid references public.media_assets(id) on delete set null,
  default_timezone text not null default 'UTC',
  analytics_enabled boolean not null default true,
  vercel_analytics_enabled boolean not null default false,
  cookie_banner_enabled boolean not null default true,
  cookie_banner_text text,
  newsletter_enabled boolean not null default false,
  newsletter_action_url text,
  footer jsonb not null default '{}'::jsonb,       -- {closing_statement, highlight, disclaimers[], legal_name}
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.site_settings (id) values (1);
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.tg_set_updated();

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  location public.nav_location not null,
  group_label text,
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create index on public.navigation_items (location, sort_order);
create trigger navigation_items_updated before update on public.navigation_items
  for each row execute function public.tg_set_updated();

-- ---------------------------------------------------------------- pages & sections
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  route text not null unique,
  title text not null,
  seo_title text,
  seo_description text,
  og_image_asset_id uuid references public.media_assets(id) on delete set null,
  noindex boolean not null default false,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create trigger pages_updated before update on public.pages
  for each row execute function public.tg_set_updated();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  section_key text not null,                       -- selects the Zod schema / component
  sort_order int not null default 0,
  visible boolean not null default true,
  palette_layer text not null default 'milky'
    check (palette_layer in ('canopy', 'sand', 'cyprus', 'milky', 'signal', 'energy')),
  content jsonb not null default '{}'::jsonb,      -- published
  draft_content jsonb,                             -- working copy (null = no unpublished changes)
  status public.content_status not null default 'published',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create index on public.page_sections (page_id, sort_order);
create trigger page_sections_updated before update on public.page_sections
  for each row execute function public.tg_set_updated();

create table public.section_revisions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.page_sections(id) on delete cascade,
  content jsonb not null,
  palette_layer text,
  visible boolean,
  action text not null default 'publish' check (action in ('publish', 'restore', 'seed')),
  author uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.section_revisions (section_id, created_at desc);

alter table public.media_assets enable row level security;
alter table public.offices enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.navigation_items enable row level security;
alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
alter table public.section_revisions enable row level security;

-- ---------------------------------------------------------------------
-- Migration: 20261120000002_content.sql
-- ---------------------------------------------------------------------
-- Editorial content, journeys + consent, events, programmes, announcements.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_updated before update on public.categories
  for each row execute function public.tg_set_updated();

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tags_updated before update on public.tags
  for each row execute function public.tg_set_updated();

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  excerpt text,
  body_html text not null default '',
  body_json jsonb,
  key_takeaways text[] not null default '{}',
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  status public.blog_status not null default 'draft',
  published_at timestamptz,
  reading_minutes int not null default 1,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  og_image_asset_id uuid references public.media_assets(id) on delete set null,
  claims_reviewed_by uuid,
  claims_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid,
  constraint scheduled_needs_date check (status not in ('scheduled', 'published') or published_at is not null)
);
create index on public.blog_posts (status, published_at desc);
create index blog_posts_search on public.blog_posts
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '')));
create trigger blog_posts_updated before update on public.blog_posts
  for each row execute function public.tg_set_updated();

create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- Only central admins may move a post past claims review.
create or replace function public.tg_blog_workflow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved', 'scheduled', 'published')
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
     and not public.is_central()
     and auth.uid() is not null then
    raise exception 'Only a central admin can approve or publish after claims review';
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.claims_reviewed_by := auth.uid();
    new.claims_reviewed_at := now();
  end if;
  return new;
end $$;
create trigger blog_posts_workflow before insert or update on public.blog_posts
  for each row execute function public.tg_blog_workflow();

-- ---------------------------------------------------------------- consent & journeys
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  subject_name text not null,
  subject_email text,
  scope text[] not null default '{}',              -- e.g. {name, photo, story, video}
  proof_path text,                                 -- object path in consent-proofs bucket
  signed_on date not null,
  expires_on date,
  withdrawn_at timestamptz,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create trigger consent_records_updated before update on public.consent_records
  for each row execute function public.tg_set_updated();

create table public.member_journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  person_name text,                                -- internal; public name derived from anonymity level
  public_name text,
  anonymity_level public.anonymity_level not null default 'first_name',
  path public.growth_path,
  summary text,
  body_html text not null default '',
  portrait_asset_id uuid references public.media_assets(id) on delete set null,
  office_id uuid references public.offices(id) on delete set null,
  consent_record_id uuid references public.consent_records(id) on delete restrict,
  verified boolean not null default false,
  verified_by uuid,
  verified_at timestamptz,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create trigger member_journeys_updated before update on public.member_journeys
  for each row execute function public.tg_set_updated();

-- A journey can only be published with valid, unwithdrawn consent and verification.
create or replace function public.tg_journey_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' then
    if not new.verified then
      raise exception 'Journey must be verified before publishing';
    end if;
    if new.consent_record_id is null or not exists (
      select 1 from public.consent_records c
      where c.id = new.consent_record_id and c.withdrawn_at is null
        and (c.expires_on is null or c.expires_on >= current_date)
    ) then
      raise exception 'Journey needs a valid consent record before publishing';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;
create trigger member_journeys_guard before insert or update on public.member_journeys
  for each row execute function public.tg_journey_guard();

create table public.journey_updates (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.member_journeys(id) on delete cascade,
  occurred_on date not null,
  title text not null,
  body text,
  asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index on public.journey_updates (journey_id, occurred_on);

-- ---------------------------------------------------------------- events & programmes
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body_html text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  event_state text not null default 'scheduled' check (event_state in ('scheduled', 'postponed', 'cancelled', 'full')),
  office_id uuid references public.offices(id) on delete set null,
  venue text,
  online_url text,
  registration_url text,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  audience text not null default 'public' check (audience in ('public', 'members')),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid,
  check (ends_at is null or ends_at >= starts_at)
);
create index on public.events (status, starts_at);
create trigger events_updated before update on public.events
  for each row execute function public.tg_set_updated();

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  path public.growth_path not null,
  summary text,
  body_html text not null default '',
  office_id uuid references public.offices(id) on delete set null,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create trigger programmes_updated before update on public.programmes
  for each row execute function public.tg_set_updated();

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'news' check (kind in ('news', 'member', 'office')),
  title text not null,
  summary text,
  body_html text not null default '',
  office_id uuid references public.offices(id) on delete set null,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  pinned boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create index on public.announcements (kind, status, published_at desc);
create trigger announcements_updated before update on public.announcements
  for each row execute function public.tg_set_updated();

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.consent_records enable row level security;
alter table public.member_journeys enable row level security;
alter table public.journey_updates enable row level security;
alter table public.events enable row level security;
alter table public.programmes enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- ---------------------------------------------------------------------
-- Migration: 20261120000003_inbox_learning.sql
-- ---------------------------------------------------------------------
-- Applications, enquiries, member support, learning, resources.

create table public.join_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  state text,
  office_id uuid references public.offices(id) on delete set null,
  interest text not null check (interest in ('digital', 'business', 'both', 'not_sure')),
  age_range text check (age_range in ('16-17', '18-24', '25-34', '35-44', '45+')),
  current_situation text,
  hoped_outcome text,
  how_heard text,
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'email')),
  consent_contact boolean not null,
  consent_privacy boolean not null check (consent_privacy),
  status public.inbox_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  notes jsonb not null default '[]'::jsonb,         -- [{author, author_name, text, at}]
  source_path text,
  utm jsonb,
  dedupe_key text,                                  -- sha256(email|phone|day): duplicate-submit protection
  updated_by uuid,
  unique (dedupe_key)
);
create index on public.join_applications (office_id, status, created_at desc);
create trigger join_applications_updated before update on public.join_applications
  for each row execute function public.tg_set_updated();

create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enquiry_type text not null check (enquiry_type in ('general', 'office_visit', 'partnership', 'media', 'member_support', 'feedback', 'safeguarding')),
  name text not null,
  email text not null,
  phone text,
  office_id uuid references public.offices(id) on delete set null,
  subject text,
  message text not null,
  consent_privacy boolean not null check (consent_privacy),
  status public.inbox_status not null default 'new',
  assigned_to uuid references public.profiles(id) on delete set null,
  notes jsonb not null default '[]'::jsonb,
  source_path text,
  dedupe_key text unique,
  updated_by uuid
);
create index on public.contact_enquiries (enquiry_type, status, created_at desc);
create trigger contact_enquiries_updated before update on public.contact_enquiries
  for each row execute function public.tg_set_updated();

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  office_id uuid references public.offices(id) on delete set null,
  category text not null default 'general',
  subject text not null,
  message text not null,
  status public.inbox_status not null default 'new',
  notes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create trigger support_requests_updated before update on public.support_requests
  for each row execute function public.tg_set_updated();

-- ---------------------------------------------------------------- learning
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  path public.growth_path,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  office_id uuid references public.offices(id) on delete set null,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create trigger courses_updated before update on public.courses
  for each row execute function public.tg_set_updated();

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  summary text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger modules_updated before update on public.modules
  for each row execute function public.tg_set_updated();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  body_html text not null default '',
  video_asset_id uuid references public.media_assets(id) on delete set null,
  duration_minutes int,
  sort_order int not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lessons_updated before update on public.lessons
  for each row execute function public.tg_set_updated();

create table public.member_progress (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  office_id uuid references public.offices(id) on delete set null,
  category text,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid
);
create trigger resources_updated before update on public.resources
  for each row execute function public.tg_set_updated();

alter table public.join_applications enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.support_requests enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.member_progress enable row level security;
alter table public.resources enable row level security;

-- ---------------------------------------------------------------------
-- Migration: 20261120000004_system.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Migration: 20261120000005_rls.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Migration: 20261120000006_storage.sql
-- ---------------------------------------------------------------------
-- Storage buckets with MIME + size limits, and object policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-media', 'public-media', true, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm']),
  ('private-docs', 'private-docs', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'video/mp4']),
  ('consent-proofs', 'consent-proofs', false, 15728640,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- public-media: anyone reads; content roles write; only central deletes.
create policy "public-media read" on storage.objects for select using (bucket_id = 'public-media');
create policy "public-media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and public.has_role('super_admin', 'central_admin', 'office_admin',
    'blog_editor', 'story_editor', 'events_editor', 'training_admin'));
create policy "public-media update" on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (public.is_central() or owner = auth.uid()));
create policy "public-media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and public.is_central());

-- private-docs: signed-in members read; training/central/office admins write.
create policy "private-docs read" on storage.objects for select to authenticated
  using (bucket_id = 'private-docs');
create policy "private-docs write" on storage.objects for insert to authenticated
  with check (bucket_id = 'private-docs' and public.has_role('super_admin', 'central_admin', 'training_admin', 'office_admin'));
create policy "private-docs update" on storage.objects for update to authenticated
  using (bucket_id = 'private-docs' and public.has_role('super_admin', 'central_admin', 'training_admin', 'office_admin'));
create policy "private-docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'private-docs' and public.has_role('super_admin', 'central_admin', 'training_admin'));

-- consent-proofs: super + central admin only, every operation.
create policy "consent-proofs all" on storage.objects for all to authenticated
  using (bucket_id = 'consent-proofs' and public.is_central())
  with check (bucket_id = 'consent-proofs' and public.is_central());

-- ---------------------------------------------------------------------
-- Migration: 20261120000007_analytics.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Migration: 20261121000008_blueprint_alignment.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Migration: 20261121000009_backfill_profiles.sql
-- ---------------------------------------------------------------------
-- Users created in Supabase Auth before the schema existed have no profile row,
-- so their roles would not apply. Create the missing profiles (idempotent).
insert into public.profiles (id, email, display_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Record applied migrations so `npm run db:migrate` skips them later
-- ---------------------------------------------------------------------
create schema if not exists ops;
create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz default now());
insert into ops.schema_migrations (name) values
  ('20261120000001_core.sql'),
  ('20261120000002_content.sql'),
  ('20261120000003_inbox_learning.sql'),
  ('20261120000004_system.sql'),
  ('20261120000005_rls.sql'),
  ('20261120000006_storage.sql'),
  ('20261120000007_analytics.sql'),
  ('20261121000008_blueprint_alignment.sql'),
  ('20261121000009_backfill_profiles.sql')
on conflict (name) do nothing;

-- =====================================================================
-- Seed (only fills pages that have no sections yet; safe to re-run)
-- =====================================================================

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('home', '/', 'Home', 'Springvilla: where growth begins', 'Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'home';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.hero', 0, true, 'canopy', $j${"eyebrow":"Springvilla / Where growth begins","headline":"There's more in you.\nLet's grow it.","highlight":"grow","body":"Discover an environment built around practical skills, business development, personal growth and people who believe progress is something you work toward together.","primaryCta":{"label":"Explore Springvilla","href":"#what-is"},"secondaryCta":{"label":"Find an Office","href":"/offices"},"poster":null,"videoDesktop":null,"videoDesktopWebm":null,"videoMobile":null,"allowMobileVideo":false,"overlay":45,"badge":"Scroll · Discover · Grow ·"}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Springvilla / Where growth begins","headline":"There's more in you.\nLet's grow it.","highlight":"grow","body":"Discover an environment built around practical skills, business development, personal growth and people who believe progress is something you work toward together.","primaryCta":{"label":"Explore Springvilla","href":"#what-is"},"secondaryCta":{"label":"Find an Office","href":"/offices"},"poster":null,"videoDesktop":null,"videoDesktopWebm":null,"videoMobile":null,"allowMobileVideo":false,"overlay":45,"badge":"Scroll · Discover · Grow ·"}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.marquee', 1, true, 'canopy', $j${"rowOne":["Learn.","Practise.","Build.","Grow."],"rowTwo":["Orient","Learn","Practise","Apply","Reflect"]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"rowOne":["Learn.","Practise.","Build.","Grow."],"rowTwo":["Orient","Learn","Practise","Apply","Reflect"]}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.what_is', 2, true, 'sand', $j${"anchor":"what-is","navLabel":"","eyebrow":"What Springvilla is","heading":"More than a place to learn.","highlight":"learn","body":"Springvilla is an organisation within FHG that operates offices and development communities. Here, members learn practical digital and business skills, develop confidence, build relationships and practise the discipline of personal and professional growth.","image":null,"nodesHeading":"How it fits together","nodes":[{"title":"FHG","body":"The wider growth and training environment."},{"title":"Springvilla","body":"Offices and communities within FHG."},{"title":"NeoLife","body":"The business vehicle used in the network-marketing pathway."}],"cta":{"label":"Discover our story","href":"/discover"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"what-is","navLabel":"","eyebrow":"What Springvilla is","heading":"More than a place to learn.","highlight":"learn","body":"Springvilla is an organisation within FHG that operates offices and development communities. Here, members learn practical digital and business skills, develop confidence, build relationships and practise the discipline of personal and professional growth.","image":null,"nodesHeading":"How it fits together","nodes":[{"title":"FHG","body":"The wider growth and training environment."},{"title":"Springvilla","body":"Offices and communities within FHG."},{"title":"NeoLife","body":"The business vehicle used in the network-marketing pathway."}],"cta":{"label":"Discover our story","href":"/discover"}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.two_paths', 3, true, 'canopy', $j${"anchor":"two-paths","navLabel":"","eyebrow":"Two paths, one environment","heading":"Two paths. One environment.\nRoom to grow.","highlight":"grow","intro":"Digital skills and freelancing, and network marketing and business, are two complementary paths, not competing brands.","cards":[{"label":"Path A","title":"Digital Skills & Freelancing","body":"Develop useful digital skills, learn to deliver work professionally and explore client-facing opportunities.","image":null,"layer":"signal","href":"/our-system/digital-skills"},{"label":"Path B","title":"Network Marketing & Business","body":"Learn product education, customer acquisition, communication, follow-up, teamwork and leadership through a real business model.","image":null,"layer":"canopy","href":"/our-system/business"}],"bridge":"Communication, discipline, personal development, relationships and accountability strengthen both paths.","comparisonHeading":"How the two paths compare","leftLabel":"Digital","rightLabel":"Business","rows":[{"left":"Learn skills","right":"Learn products"},{"left":"Find clients","right":"Find customers"},{"left":"Deliver services","right":"Serve and lead a team"}],"disclaimer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","cta":{"label":"See how the system works","href":"/our-system"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"two-paths","navLabel":"","eyebrow":"Two paths, one environment","heading":"Two paths. One environment.\nRoom to grow.","highlight":"grow","intro":"Digital skills and freelancing, and network marketing and business, are two complementary paths, not competing brands.","cards":[{"label":"Path A","title":"Digital Skills & Freelancing","body":"Develop useful digital skills, learn to deliver work professionally and explore client-facing opportunities.","image":null,"layer":"signal","href":"/our-system/digital-skills"},{"label":"Path B","title":"Network Marketing & Business","body":"Learn product education, customer acquisition, communication, follow-up, teamwork and leadership through a real business model.","image":null,"layer":"canopy","href":"/our-system/business"}],"bridge":"Communication, discipline, personal development, relationships and accountability strengthen both paths.","comparisonHeading":"How the two paths compare","leftLabel":"Digital","rightLabel":"Business","rows":[{"left":"Learn skills","right":"Learn products"},{"left":"Find clients","right":"Find customers"},{"left":"Deliver services","right":"Serve and lead a team"}],"disclaimer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","cta":{"label":"See how the system works","href":"/our-system"}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.journey_words', 4, true, 'canopy', $j${"words":["Orient.","Learn.","Practise.","Apply.","Grow."],"caption":"Every member's journey moves through the same steps: orient, learn, practise, apply, reflect and grow."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"words":["Orient.","Learn.","Practise.","Apply.","Grow."],"caption":"Every member's journey moves through the same steps: orient, learn, practise, apply, reflect and grow."}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.life_inside', 5, true, 'milky', $j${"anchor":"life-inside","navLabel":"","eyebrow":"Life inside Springvilla","heading":"Growth is something\nwe practise together.","highlight":"together","body":"An office can be more than desks and meetings. It can be a place to practise presenting, learn new skills, work on projects, ask better questions, build friendships and take responsibility for progress.","tiles":[],"chips":["Training","Peer collaboration","Business activities","Digital project work","Public speaking","Office experiences","Social and welfare support"],"cta":{"label":"Experience life here","href":"/life-here"},"dayHeading":"A day at Springvilla","dayKind":"illustrative","dayDate":"","dayChapters":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"life-inside","navLabel":"","eyebrow":"Life inside Springvilla","heading":"Growth is something\nwe practise together.","highlight":"together","body":"An office can be more than desks and meetings. It can be a place to practise presenting, learn new skills, work on projects, ask better questions, build friendships and take responsibility for progress.","tiles":[],"chips":["Training","Peer collaboration","Business activities","Digital project work","Public speaking","Office experiences","Social and welfare support"],"cta":{"label":"Experience life here","href":"/life-here"},"dayHeading":"A day at Springvilla","dayKind":"illustrative","dayDate":"","dayChapters":[]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.journeys', 6, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Real journeys","heading":"Progress looks different\nfor everyone.","highlight":"different","body":"A first presentation. A first completed project. A new responsibility. A skill finally put to use. We tell the real stories behind meaningful steps forward.","emptyText":"We only share journeys that are verified and told with the person's consent. As members choose to share their stories, they will appear here.","limit":3,"cta":{"label":"Read member journeys","href":"/journeys"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Real journeys","heading":"Progress looks different\nfor everyone.","highlight":"different","body":"A first presentation. A first completed project. A new responsibility. A skill finally put to use. We tell the real stories behind meaningful steps forward.","emptyText":"We only share journeys that are verified and told with the person's consent. As members choose to share their stories, they will appear here.","limit":3,"cta":{"label":"Read member journeys","href":"/journeys"}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.ideas', 7, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Ideas and happenings","heading":"Keep learning.\nKeep connected.","highlight":"connected","body":"Articles, member journeys, news and upcoming events from across Springvilla.","featuredSlug":"","showOfficeUpdate":true,"emptyText":"Our first articles and events are being prepared. In the meantime, explore how the 2-in-1 system works or find an office near you.","cta":{"label":"Explore stories & ideas","href":"/stories-and-ideas"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Ideas and happenings","heading":"Keep learning.\nKeep connected.","highlight":"connected","body":"Articles, member journeys, news and upcoming events from across Springvilla.","featuredSlug":"","showOfficeUpdate":true,"emptyText":"Our first articles and events are being prepared. In the meantime, explore how the 2-in-1 system works or find an office near you.","cta":{"label":"Explore stories & ideas","href":"/stories-and-ideas"}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.find_place', 8, true, 'canopy', $j${"anchor":"","navLabel":"","eyebrow":"Find your place","heading":"Your next step can start\nclose to home.","highlight":"home","body":"Explore official Springvilla offices and development communities, find contact information and learn what to expect before visiting.","image":null,"previewHeading":"What applying looks like","previewSteps":["Tell us a little about yourself","Choose an office, or ask us to help you find one","Receive next steps by your preferred contact method"],"enquiryNote":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Join Springvilla","href":"/join"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Find your place","heading":"Your next step can start\nclose to home.","highlight":"home","body":"Explore official Springvilla offices and development communities, find contact information and learn what to expect before visiting.","image":null,"previewHeading":"What applying looks like","previewSteps":["Tell us a little about yourself","Choose an office, or ask us to help you find one","Receive next steps by your preferred contact method"],"enquiryNote":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Join Springvilla","href":"/join"}}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('discover', '/discover', 'Discover', 'Discover Springvilla', 'Who Springvilla is, its place within FHG, how its offices work and the commitments behind it.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'discover';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"Discover","heading":"A place for people committed\nto becoming more capable.","highlight":"capable","body":"We believe growth is easier to pursue when people have a place to practise, ask questions, develop skills and move forward together. Springvilla brings that idea to life through development communities within FHG.","media":null,"video":null,"variant":"image","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Discover","heading":"A place for people committed\nto becoming more capable.","highlight":"capable","body":"We believe growth is easier to pursue when people have a place to practise, ask questions, develop skills and move forward together. Springvilla brings that idea to life through development communities within FHG.","media":null,"video":null,"variant":"image","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'relationship', 1, true, 'sand', $j${"anchor":"who-we-are","navLabel":"Who we are","eyebrow":"Who we are","heading":"An organisation within FHG","highlight":"within","intro":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system.","nodes":[{"title":"FHG","caption":"The wider growth and training environment."},{"title":"Springvilla","caption":"Offices and development communities within FHG."},{"title":"2-in-1 system","caption":"Digital skills and business, side by side."}],"note":"Springvilla is an organisation within FHG. It is not FHG, it does not own FHG, and it does not operate all FHG activities."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"who-we-are","navLabel":"Who we are","eyebrow":"Who we are","heading":"An organisation within FHG","highlight":"within","intro":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system.","nodes":[{"title":"FHG","caption":"The wider growth and training environment."},{"title":"Springvilla","caption":"Offices and development communities within FHG."},{"title":"2-in-1 system","caption":"Digital skills and business, side by side."}],"note":"Springvilla is an organisation within FHG. It is not FHG, it does not own FHG, and it does not operate all FHG activities."}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 2, true, 'milky', $j${"anchor":"why","navLabel":"Why we exist","eyebrow":"Why Springvilla exists","heading":"A deliberate environment\nfor growth.","highlight":"deliberate","body":"Springvilla exists to be a deliberate environment for learning, opportunity, responsibility and shared growth: a place where people practise the skills, habits and relationships that progress depends on.","bullets":[],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"why","navLabel":"Why we exist","eyebrow":"Why Springvilla exists","heading":"A deliberate environment\nfor growth.","highlight":"deliberate","body":"Springvilla exists to be a deliberate environment for learning, opportunity, responsibility and shared growth: a place where people practise the skills, habits and relationships that progress depends on.","bullets":[],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 3, true, 'canopy', $j${"anchor":"philosophy","navLabel":"Our philosophy","eyebrow":"Our philosophy","heading":"Six ideas we build on","highlight":"build","intro":"","style":"numbered","items":[{"title":"Environment","body":"Where you practise shapes how you grow."},{"title":"Practice","body":"Skills develop through repeated, real attempts."},{"title":"Skill","body":"Practical, useful abilities, not just inspiration."},{"title":"Leadership","body":"Taking responsibility and helping others grow."},{"title":"Community","body":"People who support, challenge and learn from one another."},{"title":"Responsibility","body":"Owning your effort, your choices and your progress."}],"cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"philosophy","navLabel":"Our philosophy","eyebrow":"Our philosophy","heading":"Six ideas we build on","highlight":"build","intro":"","style":"numbered","items":[{"title":"Environment","body":"Where you practise shapes how you grow."},{"title":"Practice","body":"Skills develop through repeated, real attempts."},{"title":"Skill","body":"Practical, useful abilities, not just inspiration."},{"title":"Leadership","body":"Taking responsibility and helping others grow."},{"title":"Community","body":"People who support, challenge and learn from one another."},{"title":"Responsibility","body":"Owning your effort, your choices and your progress."}],"cta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 4, true, 'sand', $j${"anchor":"offices","navLabel":"How offices work","eyebrow":"How the offices work","heading":"Local communities,\none shared standard.","highlight":"shared","body":"Each Springvilla office is a local development community. Offices share one identity, one set of standards and one way of working, while each brings its own people, activities and local events.","bullets":[],"image":null,"imageSide":"left","cta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"offices","navLabel":"How offices work","eyebrow":"How the offices work","heading":"Local communities,\none shared standard.","highlight":"shared","body":"Each Springvilla office is a local development community. Offices share one identity, one set of standards and one way of working, while each brings its own people, activities and local events.","bullets":[],"image":null,"imageSide":"left","cta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'card_grid', 5, true, 'milky', $j${"anchor":"culture","navLabel":"Culture","eyebrow":"Culture in action","heading":"What our culture looks like","highlight":"culture","intro":"","cards":[{"title":"Training","body":"Regular sessions that build practical skills and knowledge.","image":null,"href":""},{"title":"Relationships","body":"Friendships and working relationships built through shared effort.","image":null,"href":""},{"title":"Welfare","body":"Looking out for one another, with practical help when it's needed.","image":null,"href":""},{"title":"Accountability","body":"Clear expectations, honest feedback and following through.","image":null,"href":""},{"title":"Celebration","body":"Marking real milestones and the effort behind them.","image":null,"href":""},{"title":"Member support","body":"People teaching people, and help from those further along.","image":null,"href":""}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"culture","navLabel":"Culture","eyebrow":"Culture in action","heading":"What our culture looks like","highlight":"culture","intro":"","cards":[{"title":"Training","body":"Regular sessions that build practical skills and knowledge.","image":null,"href":""},{"title":"Relationships","body":"Friendships and working relationships built through shared effort.","image":null,"href":""},{"title":"Welfare","body":"Looking out for one another, with practical help when it's needed.","image":null,"href":""},{"title":"Accountability","body":"Clear expectations, honest feedback and following through.","image":null,"href":""},{"title":"Celebration","body":"Marking real milestones and the effort behind them.","image":null,"href":""},{"title":"Member support","body":"People teaching people, and help from those further along.","image":null,"href":""}]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'leadership', 6, true, 'sand', $j${"anchor":"leadership","navLabel":"Leadership","eyebrow":"Leadership and story","heading":"The people who lead","highlight":"lead","intro":"","people":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"leadership","navLabel":"Leadership","eyebrow":"Leadership and story","heading":"The people who lead","highlight":"lead","intro":"","people":[]}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'reality', 7, true, 'canopy', $j${"anchor":"commitment","navLabel":"Our commitment","eyebrow":"Ethical commitment","heading":"Honest about opportunity.","highlight":"Honest","body":"We explain opportunities transparently, make no income or health promises, and reach out to people respectfully.","points":["Transparent explanations of every opportunity, including the effort involved.","No promises of income, work, promotion or health outcomes.","Respectful outreach: no pressure, no fear-based recruiting, and 'no' is always an acceptable answer.","Stories we share are individual experiences, never presented as typical."]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"commitment","navLabel":"Our commitment","eyebrow":"Ethical commitment","heading":"Honest about opportunity.","highlight":"Honest","body":"We explain opportunities transparently, make no income or health promises, and reach out to people respectfully.","points":["Transparent explanations of every opportunity, including the effort involved.","No promises of income, work, promotion or health outcomes.","Respectful outreach: no pressure, no fear-based recruiting, and 'no' is always an acceptable answer.","Stories we share are individual experiences, never presented as typical."]}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'faq', 8, true, 'milky', $j${"anchor":"faq","navLabel":"FAQ","eyebrow":"Questions","heading":"Frequently asked questions","highlight":"","items":[{"question":"What is Springvilla? How does it relate to FHG?","answer":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system. FHG is the wider growth and training environment. Springvilla is not FHG, and it does not own FHG."},{"question":"What actually happens in an office?","answer":"Offices are places to practise: training sessions, peer collaboration, business activities, digital project work, public-speaking practice, office experiences, and social and welfare support. Activities vary by office; each office page lists what that office offers once it has been verified."},{"question":"Is Springvilla only for students?","answer":"No. Members include students and people who are working, each managing growth alongside their other responsibilities. Eligibility details are being confirmed and will be published on the Join page."},{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Can I visit before applying?","answer":"Visiting arrangements differ by office. Each verified office page explains whether you need an appointment; you can also ask an office directly using the contact page."},{"question":"Are there costs, purchases, time commitments or eligibility requirements?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What happens after an application?","answer":"An office representative contacts you, or sends approved next-step instructions, using the contact method you chose. Applying is not a promise of acceptance."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"faq","navLabel":"FAQ","eyebrow":"Questions","heading":"Frequently asked questions","highlight":"","items":[{"question":"What is Springvilla? How does it relate to FHG?","answer":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system. FHG is the wider growth and training environment. Springvilla is not FHG, and it does not own FHG."},{"question":"What actually happens in an office?","answer":"Offices are places to practise: training sessions, peer collaboration, business activities, digital project work, public-speaking practice, office experiences, and social and welfare support. Activities vary by office; each office page lists what that office offers once it has been verified."},{"question":"Is Springvilla only for students?","answer":"No. Members include students and people who are working, each managing growth alongside their other responsibilities. Eligibility details are being confirmed and will be published on the Join page."},{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Can I visit before applying?","answer":"Visiting arrangements differ by office. Each verified office page explains whether you need an appointment; you can also ask an office directly using the contact page."},{"question":"Are there costs, purchases, time commitments or eligibility requirements?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What happens after an application?","answer":"An office representative contacts you, or sends approved next-step instructions, using the contact method you chose. Applying is not a promise of acceptance."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'cta_band', 9, true, 'canopy', $j${"eyebrow":"","heading":"Find an office or ask us a question.","highlight":"question","body":"Find an office near you, or send an enquiry and the right team will reply.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Contact us","href":"/contact"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"","heading":"Find an office or ask us a question.","highlight":"question","body":"Find an office near you, or send an enquiry and the right team will reply.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Contact us","href":"/contact"}}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('our-system', '/our-system', 'Our System', 'Our System: the Springvilla 2-in-1 model', 'How FHG, Springvilla, NeoLife, digital work and network marketing fit together, explained without jargon.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'our-system';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"Our System","heading":"Practical skills and business\nknowledge both matter.","highlight":"both","body":"Skills help you create useful work. Business knowledge helps you serve customers and build something with others. Springvilla's 2-in-1 system develops both in one environment.","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Our System","heading":"Practical skills and business\nknowledge both matter.","highlight":"both","body":"Skills help you create useful work. Business knowledge helps you serve customers and build something with others. Springvilla's 2-in-1 system develops both in one environment.","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'relationship', 1, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"How it fits together","heading":"FHG, Springvilla and the 2-in-1 model","highlight":"2-in-1","intro":"FHG is the wider environment. Springvilla is an office and development community within it. Inside Springvilla, members grow through the 2-in-1 development model.","nodes":[{"title":"FHG","caption":"The wider growth and training environment."},{"title":"Springvilla","caption":"Office and development community."},{"title":"2-in-1 model","caption":"Digital skills + network marketing & business."}],"note":"NeoLife appears only inside the business pathway, as the company and business vehicle members work with. Springvilla does not own NeoLife or manufacture its products."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"How it fits together","heading":"FHG, Springvilla and the 2-in-1 model","highlight":"2-in-1","intro":"FHG is the wider environment. Springvilla is an office and development community within it. Inside Springvilla, members grow through the 2-in-1 development model.","nodes":[{"title":"FHG","caption":"The wider growth and training environment."},{"title":"Springvilla","caption":"Office and development community."},{"title":"2-in-1 model","caption":"Digital skills + network marketing & business."}],"note":"NeoLife appears only inside the business pathway, as the company and business vehicle members work with. Springvilla does not own NeoLife or manufacture its products."}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'home.two_paths', 2, true, 'canopy', $j${"anchor":"","navLabel":"","eyebrow":"The two pathways","heading":"Two paths.\nOne environment.","highlight":"One","intro":"Each path starts separately. What connects them is the personal development both require.","cards":[{"label":"Path A","title":"Digital Skills & Freelancing","body":"Develop useful digital skills, learn to deliver work professionally and explore client-facing opportunities.","image":null,"layer":"signal","href":"/our-system/digital-skills"},{"label":"Path B","title":"Network Marketing & Business","body":"Learn product education, customer acquisition, communication, follow-up, teamwork and leadership through a real business model.","image":null,"layer":"canopy","href":"/our-system/business"}],"bridge":"Communication, discipline, personal development, relationships and accountability strengthen both paths.","comparisonHeading":"","leftLabel":"Digital","rightLabel":"Business","rows":[],"disclaimer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","cta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"The two pathways","heading":"Two paths.\nOne environment.","highlight":"One","intro":"Each path starts separately. What connects them is the personal development both require.","cards":[{"label":"Path A","title":"Digital Skills & Freelancing","body":"Develop useful digital skills, learn to deliver work professionally and explore client-facing opportunities.","image":null,"layer":"signal","href":"/our-system/digital-skills"},{"label":"Path B","title":"Network Marketing & Business","body":"Learn product education, customer acquisition, communication, follow-up, teamwork and leadership through a real business model.","image":null,"layer":"canopy","href":"/our-system/business"}],"bridge":"Communication, discipline, personal development, relationships and accountability strengthen both paths.","comparisonHeading":"","leftLabel":"Digital","rightLabel":"Business","rows":[],"disclaimer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","cta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 3, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Digital-skills pathway","heading":"A realistic freelancing workflow","highlight":"realistic","intro":"Learning, a portfolio, service delivery and client communication.","style":"pipeline","items":[{"title":"Brief","body":"Understand what the client actually needs."},{"title":"Learn","body":"Build the skill the work requires."},{"title":"Create","body":"Produce the work to a professional standard."},{"title":"Review","body":"Check quality and ask for feedback."},{"title":"Deliver","body":"Hand over on time and communicate clearly."}],"cta":{"label":"Explore the digital path","href":"/our-system/digital-skills"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Digital-skills pathway","heading":"A realistic freelancing workflow","highlight":"realistic","intro":"Learning, a portfolio, service delivery and client communication.","style":"pipeline","items":[{"title":"Brief","body":"Understand what the client actually needs."},{"title":"Learn","body":"Build the skill the work requires."},{"title":"Create","body":"Produce the work to a professional standard."},{"title":"Review","body":"Check quality and ask for feedback."},{"title":"Deliver","body":"Hand over on time and communicate clearly."}],"cta":{"label":"Explore the digital path","href":"/our-system/digital-skills"}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 4, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Network-marketing pathway","heading":"How the business path works","highlight":"works","intro":"NeoLife handles the product-side infrastructure. Members focus on customers, retention, trust, accurate product information, ethical follow-up and leadership. This is an educational model, not a guaranteed path to earnings.","style":"pipeline","items":[{"title":"Learn the product","body":"Understand what it is, who it helps and what it does not do."},{"title":"Connect with interested people","body":"Build genuine relationships; never pressure people who aren't interested."},{"title":"Explain accurately","body":"Describe products and the opportunity honestly, without exaggerated claims."},{"title":"Follow up respectfully","body":"Check in without pressure."},{"title":"Serve the customer","body":"Look after customers so they get real value."},{"title":"Support new team members","body":"Help newer people learn the same responsible habits."}],"cta":{"label":"Explore the business path","href":"/our-system/business"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Network-marketing pathway","heading":"How the business path works","highlight":"works","intro":"NeoLife handles the product-side infrastructure. Members focus on customers, retention, trust, accurate product information, ethical follow-up and leadership. This is an educational model, not a guaranteed path to earnings.","style":"pipeline","items":[{"title":"Learn the product","body":"Understand what it is, who it helps and what it does not do."},{"title":"Connect with interested people","body":"Build genuine relationships; never pressure people who aren't interested."},{"title":"Explain accurately","body":"Describe products and the opportunity honestly, without exaggerated claims."},{"title":"Follow up respectfully","body":"Check in without pressure."},{"title":"Serve the customer","body":"Look after customers so they get real value."},{"title":"Support new team members","body":"Help newer people learn the same responsible habits."}],"cta":{"label":"Explore the business path","href":"/our-system/business"}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 5, true, 'canopy', $j${"anchor":"","navLabel":"","eyebrow":"The shared foundation","heading":"What strengthens\nboth paths","highlight":"both","body":"Whichever path you choose, the same personal foundation makes progress possible.","bullets":["Confidence","Communication","Public speaking","Discipline","Teamwork","Ongoing learning"],"image":null,"imageSide":"left","cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"The shared foundation","heading":"What strengthens\nboth paths","highlight":"both","body":"Whichever path you choose, the same personal foundation makes progress possible.","bullets":["Confidence","Communication","Public speaking","Discipline","Teamwork","Ongoing learning"],"image":null,"imageSide":"left","cta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 6, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"How members engage","heading":"Orient, learn, practise,\napply, reflect and grow.","highlight":"practise","intro":"","style":"timeline","items":[{"title":"Orient","body":"Understand the environment, the two pathways and what is expected of members."},{"title":"Learn","body":"Build knowledge through training sessions and guided study."},{"title":"Practise","body":"Try what you've learned with peers: presentations, projects and conversations."},{"title":"Apply","body":"Use your skills with real projects, clients or customers."},{"title":"Reflect and grow","body":"Review what worked, ask for feedback and choose your next step."}],"cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"How members engage","heading":"Orient, learn, practise,\napply, reflect and grow.","highlight":"practise","intro":"","style":"timeline","items":[{"title":"Orient","body":"Understand the environment, the two pathways and what is expected of members."},{"title":"Learn","body":"Build knowledge through training sessions and guided study."},{"title":"Practise","body":"Try what you've learned with peers: presentations, projects and conversations."},{"title":"Apply","body":"Use your skills with real projects, clients or customers."},{"title":"Reflect and grow","body":"Review what worked, ask for feedback and choose your next step."}],"cta":{"label":"","href":""}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'comparison_table', 7, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Who does what","heading":"Clear roles, no confusion","highlight":"Clear","intro":"What each part is, and what it is not.","col1":"Entity","col2":"What it is","col3":"What it does not mean","rows":[{"c1":"FHG","c2":"The wider growth environment and support/training system.","c3":"Springvilla does not own FHG or represent all FHG entities."},{"c1":"Springvilla","c2":"An organisation within FHG running offices and development communities.","c3":"Not a university, an accredited employer or a guaranteed-income scheme."},{"c1":"NeoLife","c2":"The company and business vehicle used in the network-marketing pathway.","c3":"Springvilla does not manufacture, control or medically endorse NeoLife products."},{"c1":"Freelancing","c2":"Skill-based services and professional client work.","c3":"Not every participant receives clients or earnings."},{"c1":"Network marketing","c2":"Products, customers, ethical distribution, relationship-building and leadership.","c3":"Payments are not earned merely for recruiting people."}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Who does what","heading":"Clear roles, no confusion","highlight":"Clear","intro":"What each part is, and what it is not.","col1":"Entity","col2":"What it is","col3":"What it does not mean","rows":[{"c1":"FHG","c2":"The wider growth environment and support/training system.","c3":"Springvilla does not own FHG or represent all FHG entities."},{"c1":"Springvilla","c2":"An organisation within FHG running offices and development communities.","c3":"Not a university, an accredited employer or a guaranteed-income scheme."},{"c1":"NeoLife","c2":"The company and business vehicle used in the network-marketing pathway.","c3":"Springvilla does not manufacture, control or medically endorse NeoLife products."},{"c1":"Freelancing","c2":"Skill-based services and professional client work.","c3":"Not every participant receives clients or earnings."},{"c1":"Network marketing","c2":"Products, customers, ethical distribution, relationship-building and leadership.","c3":"Payments are not earned merely for recruiting people."}]}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'reality', 8, true, 'canopy', $j${"anchor":"","navLabel":"","eyebrow":"Reality and responsibility","heading":"No shortcuts.\nNo guarantees.","highlight":"guarantees","body":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","points":["Results depend on your own effort, circumstances, access and training.","We never promise income, jobs, promotion or health outcomes.","Ask questions, take your time and decide for yourself."]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Reality and responsibility","heading":"No shortcuts.\nNo guarantees.","highlight":"guarantees","body":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","points":["Results depend on your own effort, circumstances, access and training.","We never promise income, jobs, promotion or health outcomes.","Ask questions, take your time and decide for yourself."]}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'faq', 9, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Questions","heading":"Common questions","highlight":"","items":[{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Questions","heading":"Common questions","highlight":"","items":[{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'cta_band', 10, true, 'sand', $j${"eyebrow":"","heading":"Ready for a next step?","highlight":"next","body":"Find an office, read our latest ideas, or explore joining.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Explore joining Springvilla","href":"/join"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"","heading":"Ready for a next step?","highlight":"next","body":"Find an office, read our latest ideas, or explore joining.","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Explore joining Springvilla","href":"/join"}}$j$::jsonb, 'sand', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('digital-skills', '/our-system/digital-skills', 'Digital Skills & Freelancing', 'Digital Skills & Freelancing', 'Learn skills that help you create useful work, and the habits that make professional work possible.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'digital-skills';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'signal', $j${"eyebrow":"Path A · Digital Skills & Freelancing","heading":"Build skills that\ncreate value.","highlight":"value","body":"Learn skills that help you create useful work. Practise communicating with clients, solving problems, delivering projects and building the habits that make professional work possible.","media":null,"video":null,"variant":"split","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Path A · Digital Skills & Freelancing","heading":"Build skills that\ncreate value.","highlight":"value","body":"Learn skills that help you create useful work. Practise communicating with clients, solving problems, delivering projects and building the habits that make professional work possible.","media":null,"video":null,"variant":"split","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'signal', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'card_grid', 1, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Areas of digital work","heading":"What you can learn","highlight":"learn","intro":"Only areas currently offered are listed. This list is being confirmed with each office.","cards":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Areas of digital work","heading":"What you can learn","highlight":"learn","intro":"Only areas currently offered are listed. This list is being confirmed with each office.","cards":[]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 2, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Project lifecycle","heading":"Brief → learn → create\n→ review → deliver","highlight":"deliver","intro":"","style":"pipeline","items":[{"title":"Brief","body":"Understand the request and agree what 'done' means."},{"title":"Learn","body":"Close the skill gap the project reveals."},{"title":"Create","body":"Do the work carefully and keep the client informed."},{"title":"Review","body":"Check quality against the brief; welcome feedback."},{"title":"Deliver","body":"Hand over professionally and reflect on what to improve."}],"cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Project lifecycle","heading":"Brief → learn → create\n→ review → deliver","highlight":"deliver","intro":"","style":"pipeline","items":[{"title":"Brief","body":"Understand the request and agree what 'done' means."},{"title":"Learn","body":"Close the skill gap the project reveals."},{"title":"Create","body":"Do the work carefully and keep the client informed."},{"title":"Review","body":"Check quality against the brief; welcome feedback."},{"title":"Deliver","body":"Hand over professionally and reflect on what to improve."}],"cta":{"label":"","href":""}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 3, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Portfolio and client standards","heading":"Work you can stand behind","highlight":"stand","body":"Members build portfolios from real practice projects and learn the standards clients expect: clear communication, honest timelines and dependable delivery. Training support is available as you learn.","bullets":["Portfolio","Client communication","Problem solving","Reliable delivery","Training support"],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Portfolio and client standards","heading":"Work you can stand behind","highlight":"stand","body":"Members build portfolios from real practice projects and learn the standards clients expect: clear communication, honest timelines and dependable delivery. Training support is available as you learn.","bullets":["Portfolio","Client communication","Problem solving","Reliable delivery","Training support"],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'reality', 4, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Boundaries","heading":"Learning first.\nNo promise of gigs.","highlight":"gigs","body":"Learning projects and paid work are kept clearly separate. Springvilla does not promise clients, gigs or earnings; finding and keeping clients depends on your skills, effort and circumstances.","points":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Boundaries","heading":"Learning first.\nNo promise of gigs.","highlight":"gigs","body":"Learning projects and paid work are kept clearly separate. Springvilla does not promise clients, gigs or earnings; finding and keeping clients depends on your skills, effort and circumstances.","points":[]}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'cta_band', 5, true, 'signal', $j${"eyebrow":"","heading":"Curious about the digital path?","highlight":"digital","body":"","primaryCta":{"label":"Explore joining Springvilla","href":"/join"},"secondaryCta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"","heading":"Curious about the digital path?","highlight":"digital","body":"","primaryCta":{"label":"Explore joining Springvilla","href":"/join"},"secondaryCta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'signal', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('business', '/our-system/business', 'Network Marketing & Business', 'Network Marketing & Business', 'Understand the business behind the business: products, customers, ethical follow-up and leadership.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'business';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"Path B · Network Marketing & Business","heading":"Understand the business\nbehind the business.","highlight":"behind","body":"Behind every product business are the people, systems and relationships that bring real value to customers. Members learn how to understand products, communicate responsibly, support customers and develop leadership within an established business model.","media":null,"video":null,"variant":"split","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Path B · Network Marketing & Business","heading":"Understand the business\nbehind the business.","highlight":"behind","body":"Behind every product business are the people, systems and relationships that bring real value to customers. Members learn how to understand products, communicate responsibly, support customers and develop leadership within an established business model.","media":null,"video":null,"variant":"split","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 1, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Who does what","heading":"NeoLife provides the\nproduct infrastructure.","highlight":"infrastructure","body":"NeoLife handles the product side: the products and company infrastructure. Members focus on customer acquisition, retention, trust and leadership duplication: helping others learn the same responsible habits. Springvilla does not own NeoLife or manufacture its products.","bullets":["Customers","Retention","Trust","Product information","Ethical follow-up","Leadership"],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Who does what","heading":"NeoLife provides the\nproduct infrastructure.","highlight":"infrastructure","body":"NeoLife handles the product side: the products and company infrastructure. Members focus on customer acquisition, retention, trust and leadership duplication: helping others learn the same responsible habits. Springvilla does not own NeoLife or manufacture its products.","bullets":["Customers","Retention","Trust","Product information","Ethical follow-up","Leadership"],"image":null,"imageSide":"right","cta":{"label":"","href":""}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 2, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"The business pipeline","heading":"Step by step","highlight":"step","intro":"An educational model, not a guaranteed path to earnings.","style":"pipeline","items":[{"title":"Learn the product","body":"Understand what it is, who it helps and what it does not do."},{"title":"Connect with interested people","body":"Build genuine relationships."},{"title":"Explain accurately","body":"Describe products honestly, without exaggerated or health claims."},{"title":"Follow up respectfully","body":"Check in without pressure."},{"title":"Serve the customer","body":"Make sure customers receive real value."},{"title":"Support new team members","body":"Help newer people learn responsibly."}],"cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"The business pipeline","heading":"Step by step","highlight":"step","intro":"An educational model, not a guaranteed path to earnings.","style":"pipeline","items":[{"title":"Learn the product","body":"Understand what it is, who it helps and what it does not do."},{"title":"Connect with interested people","body":"Build genuine relationships."},{"title":"Explain accurately","body":"Describe products honestly, without exaggerated or health claims."},{"title":"Follow up respectfully","body":"Check in without pressure."},{"title":"Serve the customer","body":"Make sure customers receive real value."},{"title":"Support new team members","body":"Help newer people learn responsibly."}],"cta":{"label":"","href":""}}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'reality', 3, true, 'canopy', $j${"anchor":"","navLabel":"","eyebrow":"What we warn against","heading":"Honest by design","highlight":"Honest","body":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","points":["No manipulation or 'miracle money' framing.","No pressuring people who aren't interested.","No ignoring genuine product value.","No health claims about products.","Payments are never earned merely for recruiting people."]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"What we warn against","heading":"Honest by design","highlight":"Honest","body":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work.","points":["No manipulation or 'miracle money' framing.","No pressuring people who aren't interested.","No ignoring genuine product value.","No health claims about products.","Payments are never earned merely for recruiting people."]}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'cta_band', 4, true, 'sand', $j${"eyebrow":"","heading":"Want to understand the business path?","highlight":"understand","body":"","primaryCta":{"label":"Explore joining Springvilla","href":"/join"},"secondaryCta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"","heading":"Want to understand the business path?","highlight":"understand","body":"","primaryCta":{"label":"Explore joining Springvilla","href":"/join"},"secondaryCta":{"label":"Find an Office","href":"/offices"}}$j$::jsonb, 'sand', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('life-here', '/life-here', 'Life Here', 'Life at Springvilla', 'An authentic look at everyday Springvilla life: practice, training, speaking, leadership, community and events.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'life-here';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"Life Here","heading":"Growth is something\nwe practise together.","highlight":"together","body":"An observable look at everyday Springvilla life, told through real experiences rather than adjectives.","media":null,"video":null,"variant":"image","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Life Here","heading":"Growth is something\nwe practise together.","highlight":"together","body":"An observable look at everyday Springvilla life, told through real experiences rather than adjectives.","media":null,"video":null,"variant":"image","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'card_grid', 1, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"Experiences","heading":"What happens here","highlight":"here","intro":"","cards":[{"title":"Skills in practice","body":"Screens, project reviews, workshops and client-simulation sessions.","image":null,"href":""},{"title":"Business training","body":"Product education, presentation practice and customer communication.","image":null,"href":""},{"title":"Public speaking","body":"Member presentations, feedback sessions and building confidence.","image":null,"href":""},{"title":"Leadership & teamwork","body":"Planning sessions, accountability and people teaching people.","image":null,"href":""},{"title":"Community & welfare","body":"Peer support, mentorship, social care and practical help.","image":null,"href":""},{"title":"Events & recognition","body":"Office activities, training events, celebrations and milestones.","image":null,"href":""},{"title":"Learning alongside other responsibilities","body":"Students and working members managing growth around their other commitments.","image":null,"href":""}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Experiences","heading":"What happens here","highlight":"here","intro":"","cards":[{"title":"Skills in practice","body":"Screens, project reviews, workshops and client-simulation sessions.","image":null,"href":""},{"title":"Business training","body":"Product education, presentation practice and customer communication.","image":null,"href":""},{"title":"Public speaking","body":"Member presentations, feedback sessions and building confidence.","image":null,"href":""},{"title":"Leadership & teamwork","body":"Planning sessions, accountability and people teaching people.","image":null,"href":""},{"title":"Community & welfare","body":"Peer support, mentorship, social care and practical help.","image":null,"href":""},{"title":"Events & recognition","body":"Office activities, training events, celebrations and milestones.","image":null,"href":""},{"title":"Learning alongside other responsibilities","body":"Students and working members managing growth around their other commitments.","image":null,"href":""}]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'gallery', 2, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Gallery","heading":"Moments from inside","highlight":"inside","intro":"Every photo is captioned with what actually happened, where and when.","images":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Gallery","heading":"Moments from inside","highlight":"inside","intro":"Every photo is captioned with what actually happened, where and when.","images":[]}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'cta_band', 3, true, 'canopy', $j${"eyebrow":"","heading":"See it for yourself","highlight":"yourself","body":"","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Explore joining Springvilla","href":"/join"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"","heading":"See it for yourself","highlight":"yourself","body":"","primaryCta":{"label":"Find an Office","href":"/offices"},"secondaryCta":{"label":"Explore joining Springvilla","href":"/join"}}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('stories-and-ideas', '/stories-and-ideas', 'Stories & Ideas', 'Stories & Ideas', 'Ideas, verified member journeys, news and events from Springvilla.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'stories-and-ideas';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Stories & Ideas","heading":"Keep learning.\nKeep connected.","highlight":"connected","body":"Ideas (articles), Journeys (member stories) and Community (news and events).","emptyText":""}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Stories & Ideas","heading":"Keep learning.\nKeep connected.","highlight":"connected","body":"Ideas (articles), Journeys (member stories) and Community (news and events).","emptyText":""}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('ideas', '/ideas', 'Ideas', 'Ideas', 'Articles on business, network-marketing education, digital skills, leadership, personal development and the Springvilla community.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'ideas';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Ideas","heading":"Read the latest ideas","highlight":"ideas","body":"Practical articles on skills, business, leadership and personal growth.","emptyText":"No articles have been published yet."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Ideas","heading":"Read the latest ideas","highlight":"ideas","body":"Practical articles on skills, business, leadership and personal growth.","emptyText":"No articles have been published yet."}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('journeys', '/journeys', 'Journeys', 'Journeys', 'Verified member journeys, shared with consent.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'journeys';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Journeys","heading":"Progress looks different\nfor everyone.","highlight":"different","body":"Every journey here is verified and shared with the person's consent. Each is one person's experience, not a typical result.","emptyText":"We only share journeys that are verified and told with consent. None have been published yet."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Journeys","heading":"Progress looks different\nfor everyone.","highlight":"different","body":"Every journey here is verified and shared with the person's consent. Each is one person's experience, not a typical result.","emptyText":"We only share journeys that are verified and told with consent. None have been published yet."}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('news', '/news', 'News', 'News', 'Verified news from Springvilla and its offices.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'news';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Community","heading":"News","highlight":"","body":"","emptyText":"No news has been published yet."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Community","heading":"News","highlight":"","body":"","emptyText":"No news has been published yet."}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('events', '/events', 'Events', 'Events', 'Upcoming Springvilla events.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'events';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Community","heading":"See upcoming events","highlight":"upcoming","body":"Times are shown in each event's own timezone.","emptyText":"No upcoming events right now. Please check back soon."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Community","heading":"See upcoming events","highlight":"upcoming","body":"Times are shown in each event's own timezone.","emptyText":"No upcoming events right now. Please check back soon."}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('offices', '/offices', 'Find an Office', 'Find an Office', 'Find an official Springvilla office or development community.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'offices';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'listing_intro', 0, true, 'canopy', $j${"eyebrow":"Find an Office","heading":"Your next step can start\nclose to home.","highlight":"home","body":"Search by city or state. Only verified offices are listed.","emptyText":"Office details are being verified and will appear here soon. You can still send an enquiry."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Find an Office","heading":"Your next step can start\nclose to home.","highlight":"home","body":"Search by city or state. Only verified offices are listed.","emptyText":"Office details are being verified and will appear here soon. You can still send an enquiry."}$j$::jsonb, 'canopy', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('join', '/join', 'Join Springvilla', 'Join Springvilla', 'Start by learning what Springvilla offers near you. Send an enquiry and an office will share the next steps.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'join';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"Join Springvilla","heading":"Start by learning what\nSpringvilla offers near you.","highlight":"near you","body":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Join Springvilla","heading":"Start by learning what\nSpringvilla offers near you.","highlight":"near you","body":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'split_feature', 1, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"What participation involves","heading":"Learning, practice\nand two pathways","highlight":"practice","body":"Members take part in training, practise with peers and apply what they learn. You can focus on Digital Skills & Freelancing, on Network Marketing & Business, or explore both, with personal development running through everything.","bullets":["Training","Practice with peers","Two pathways","Personal development","Clear expectations"],"image":null,"imageSide":"right","cta":{"label":"See how the system works","href":"/our-system"}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"What participation involves","heading":"Learning, practice\nand two pathways","highlight":"practice","body":"Members take part in training, practise with peers and apply what they learn. You can focus on Digital Skills & Freelancing, on Network Marketing & Business, or explore both, with personal development running through everything.","bullets":["Training","Practice with peers","Two pathways","Personal development","Clear expectations"],"image":null,"imageSide":"right","cta":{"label":"See how the system works","href":"/our-system"}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'rich_text', 2, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Who might benefit","heading":"People ready to put in the work","highlight":"work","html":"<p>Springvilla may suit people who want to build practical skills, understand business, grow in confidence and practise alongside others, including students and people who are working. It isn't the right fit for everyone, and eligibility is confirmed by each office.</p>"}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Who might benefit","heading":"People ready to put in the work","highlight":"work","html":"<p>Springvilla may suit people who want to build practical skills, understand business, grow in confidence and practise alongside others, including students and people who are working. It isn't the right fit for everyone, and eligibility is confirmed by each office.</p>"}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'reality', 3, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"What is required","heading":"Fees, purchases, age\nand schedule","highlight":"schedule","body":"Any fees, purchases, eligibility rules, minimum age, schedule and steps will be listed here once they've been verified. We won't ask you to commit to anything before you understand it.","points":[]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"What is required","heading":"Fees, purchases, age\nand schedule","highlight":"schedule","body":"Any fees, purchases, eligibility rules, minimum age, schedule and steps will be listed here once they've been verified. We won't ask you to commit to anything before you understand it.","points":[]}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'join_form', 4, true, 'sand', $j${"anchor":"apply","navLabel":"","eyebrow":"Enquiry form","heading":"Tell us about yourself","highlight":"","intro":"Fields marked * are required. It takes about two minutes.","privacyExplanation":"We use these details only to respond to your enquiry and connect you with an office. We don't sell your data or show it publicly. Updates by email or message are a separate, optional choice.","enquiryNote":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","successHeading":"Thank you for your interest.","successBody":"Your enquiry has been received. The next step will be shared using your preferred contact method.","privacyLabel":"I've read how Springvilla will use my details to respond to this enquiry.","marketingLabel":"Send me occasional updates from Springvilla (optional).","consentVersion":"2026-11-draft"}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"apply","navLabel":"","eyebrow":"Enquiry form","heading":"Tell us about yourself","highlight":"","intro":"Fields marked * are required. It takes about two minutes.","privacyExplanation":"We use these details only to respond to your enquiry and connect you with an office. We don't sell your data or show it publicly. Updates by email or message are a separate, optional choice.","enquiryNote":"Submitting an enquiry is a first step to receiving information, not a guarantee of membership, employment or earnings.","successHeading":"Thank you for your interest.","successBody":"Your enquiry has been received. The next step will be shared using your preferred contact method.","privacyLabel":"I've read how Springvilla will use my details to respond to this enquiry.","marketingLabel":"Send me occasional updates from Springvilla (optional).","consentVersion":"2026-11-draft"}$j$::jsonb, 'sand', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'steps', 5, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"What happens next","heading":"After you send the form","highlight":"after","intro":"","style":"numbered","items":[{"title":"We receive your enquiry","body":"It goes to the office you chose, or to the team that will help you find one."},{"title":"An office representative responds","body":"They contact you, or send approved next-step instructions, by your preferred method."},{"title":"You ask questions","body":"Learn what the office offers and what would be expected of you."},{"title":"You decide","body":"Applying is not a promise of acceptance, and there's no obligation."}],"cta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"What happens next","heading":"After you send the form","highlight":"after","intro":"","style":"numbered","items":[{"title":"We receive your enquiry","body":"It goes to the office you chose, or to the team that will help you find one."},{"title":"An office representative responds","body":"They contact you, or send approved next-step instructions, by your preferred method."},{"title":"You ask questions","body":"Learn what the office offers and what would be expected of you."},{"title":"You decide","body":"Applying is not a promise of acceptance, and there's no obligation."}],"cta":{"label":"","href":""}}$j$::jsonb, 'milky', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'faq', 6, true, 'sand', $j${"anchor":"","navLabel":"","eyebrow":"Before you apply","heading":"Questions about joining","highlight":"","items":[{"question":"Does it cost anything?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"How much time is involved?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Will I have to buy products?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What training is available?","answer":"Training covers digital skills, business and personal development. The programmes offered vary by office and are listed on each office page once verified."},{"question":"Is there an office near me?","answer":"See Find an Office. If there isn't one listed near you yet, send the form anyway and choose 'Help me find one'."},{"question":"What results can I expect?","answer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work."}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"Before you apply","heading":"Questions about joining","highlight":"","items":[{"question":"Does it cost anything?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"How much time is involved?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Will I have to buy products?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What training is available?","answer":"Training covers digital skills, business and personal development. The programmes offered vary by office and are listed on each office page once verified."},{"question":"Is there an office near me?","answer":"See Find an Office. If there isn't one listed near you yet, send the form anyway and choose 'Help me find one'."},{"question":"What results can I expect?","answer":"Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work."}]}$j$::jsonb, 'sand', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('contact', '/contact', 'Contact', 'Contact Springvilla', 'Send an enquiry to the right Springvilla team.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'contact';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'contact_form', 0, true, 'milky', $j${"eyebrow":"Contact","heading":"How can we help?","highlight":"help","intro":"Choose what your enquiry is about so it reaches the right team. Existing members: please use Support inside My Springvilla for account questions.","types":[{"value":"general","label":"General enquiry","description":"Anything about Springvilla."},{"value":"office_information","label":"Office information","description":"Visiting, details or corrections for an office."},{"value":"partnership","label":"Partnership","description":"Organisations that want to work with us."},{"value":"media","label":"Media","description":"Press and interview requests."},{"value":"product","label":"Product-related enquiry","description":"Questions about products on the business path."},{"value":"privacy","label":"Privacy request","description":"Access, correction or deletion of your data."},{"value":"technical","label":"Technical support","description":"Problems using this website."}],"successHeading":"Thank you. Your message has been received.","successBody":"The right team will reply using the details you provided."}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"Contact","heading":"How can we help?","highlight":"help","intro":"Choose what your enquiry is about so it reaches the right team. Existing members: please use Support inside My Springvilla for account questions.","types":[{"value":"general","label":"General enquiry","description":"Anything about Springvilla."},{"value":"office_information","label":"Office information","description":"Visiting, details or corrections for an office."},{"value":"partnership","label":"Partnership","description":"Organisations that want to work with us."},{"value":"media","label":"Media","description":"Press and interview requests."},{"value":"product","label":"Product-related enquiry","description":"Questions about products on the business path."},{"value":"privacy","label":"Privacy request","description":"Access, correction or deletion of your data."},{"value":"technical","label":"Technical support","description":"Problems using this website."}],"successHeading":"Thank you. Your message has been received.","successBody":"The right team will reply using the details you provided."}$j$::jsonb, 'milky', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('faq', '/faq', 'FAQ', 'Frequently asked questions', 'Answers to common questions about Springvilla, FHG, NeoLife and the 2-in-1 system.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'faq';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'page_hero', 0, true, 'canopy', $j${"eyebrow":"FAQ","heading":"Questions, answered.","highlight":"answered","body":"","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"eyebrow":"FAQ","heading":"Questions, answered.","highlight":"answered","body":"","media":null,"video":null,"variant":"typographic","primaryCta":{"label":"","href":""},"secondaryCta":{"label":"","href":""}}$j$::jsonb, 'canopy', true, 'seed');
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'faq', 1, true, 'milky', $j${"anchor":"","navLabel":"","eyebrow":"","heading":"","highlight":"","items":[{"question":"What is Springvilla? How does it relate to FHG?","answer":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system. FHG is the wider growth and training environment. Springvilla is not FHG, and it does not own FHG."},{"question":"What actually happens in an office?","answer":"Offices are places to practise: training sessions, peer collaboration, business activities, digital project work, public-speaking practice, office experiences, and social and welfare support. Activities vary by office; each office page lists what that office offers once it has been verified."},{"question":"Is Springvilla only for students?","answer":"No. Members include students and people who are working, each managing growth alongside their other responsibilities. Eligibility details are being confirmed and will be published on the Join page."},{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Can I visit before applying?","answer":"Visiting arrangements differ by office. Each verified office page explains whether you need an appointment; you can also ask an office directly using the contact page."},{"question":"Are there costs, purchases, time commitments or eligibility requirements?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What happens after an application?","answer":"An office representative contacts you, or sends approved next-step instructions, using the contact method you chose. Applying is not a promise of acceptance."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"anchor":"","navLabel":"","eyebrow":"","heading":"","highlight":"","items":[{"question":"What is Springvilla? How does it relate to FHG?","answer":"Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system. FHG is the wider growth and training environment. Springvilla is not FHG, and it does not own FHG."},{"question":"What actually happens in an office?","answer":"Offices are places to practise: training sessions, peer collaboration, business activities, digital project work, public-speaking practice, office experiences, and social and welfare support. Activities vary by office; each office page lists what that office offers once it has been verified."},{"question":"Is Springvilla only for students?","answer":"No. Members include students and people who are working, each managing growth alongside their other responsibilities. Eligibility details are being confirmed and will be published on the Join page."},{"question":"What is the 2-in-1 system?","answer":"Two complementary paths in one environment: Digital Skills & Freelancing, and Network Marketing & Business. Communication, discipline, personal development, relationships and accountability strengthen both paths."},{"question":"Is it only network marketing?","answer":"No. Network marketing and business is one of the two paths. The other is digital skills and freelancing. Members can focus on one path or explore both."},{"question":"Is NeoLife owned by Springvilla?","answer":"No. NeoLife is the company and business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products."},{"question":"Can I visit before applying?","answer":"Visiting arrangements differ by office. Each verified office page explains whether you need an appointment; you can also ask an office directly using the contact page."},{"question":"Are there costs, purchases, time commitments or eligibility requirements?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"What happens after an application?","answer":"An office representative contacts you, or sends approved next-step instructions, using the contact method you chose. Applying is not a promise of acceptance."},{"question":"Do I need previous digital or business experience?","answer":"This information is being confirmed by Springvilla leadership and will be published here. Until then, please ask the office you're interested in before applying."},{"question":"Does participation guarantee income, work or a promotion?","answer":"No. Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work. Any example we share is one person's experience, not a typical result."}]}$j$::jsonb, 'milky', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('privacy', '/privacy', 'Privacy policy', 'Privacy policy', 'Springvilla privacy policy.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'privacy';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'legal', 0, true, 'milky', $j${"heading":"Privacy policy","html":"<p>This document is being prepared and will be published after legal review, in line with applicable Nigerian data-protection requirements.</p>","pendingReview":true,"lastUpdated":""}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"heading":"Privacy policy","html":"<p>This document is being prepared and will be published after legal review, in line with applicable Nigerian data-protection requirements.</p>","pendingReview":true,"lastUpdated":""}$j$::jsonb, 'milky', true, 'seed');
  end if;
end $seed$;

insert into public.pages (key, route, title, seo_title, seo_description, status) values ('terms', '/terms', 'Terms of use', 'Terms of use', 'Springvilla terms of use.', 'published') on conflict (key) do nothing;
do $seed$
declare pid uuid; sid uuid;
begin
  select id into pid from public.pages where key = 'terms';
  if not exists (select 1 from public.page_sections where page_id = pid) then
    insert into public.page_sections (page_id, section_key, sort_order, visible, palette_layer, content, status, published_at) values (pid, 'legal', 0, true, 'milky', $j${"heading":"Terms of use","html":"<p>This document is being prepared and will be published after legal review, in line with applicable Nigerian data-protection requirements.</p>","pendingReview":true,"lastUpdated":""}$j$::jsonb, 'published', now()) returning id into sid;
    insert into public.section_revisions (section_id, content, palette_layer, visible, action) values (sid, $j${"heading":"Terms of use","html":"<p>This document is being prepared and will be published after legal review, in line with applicable Nigerian data-protection requirements.</p>","pendingReview":true,"lastUpdated":""}$j$::jsonb, 'milky', true, 'seed');
  end if;
end $seed$;

-- Article categories (blueprint section 10.1)
insert into public.categories (slug, name, description, sort_order) values ('business-entrepreneurship', 'Business & Entrepreneurship', 'Customer acquisition, repeat customers, honest selling, systems, basic finance.', 0) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('network-marketing-education', 'Network Marketing Education', 'The business model explained, ethical outreach, follow-up, duplication, product value.', 1) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('digital-skills-freelancing', 'Digital Skills & Freelancing', 'Skill selection, service delivery, client communication, portfolios, project habits.', 2) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('leadership-communication', 'Leadership & Communication', 'Public speaking, feedback, listening, conflict, responsibility.', 3) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('mindset-personal-development', 'Mindset & Personal Development', 'Discipline, time, resilience, deliberate practice, growth habits.', 4) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('student-growth', 'Student Growth', 'Learning with academic and personal commitments.', 5) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('wellness-product-education', 'Wellness & Product Education', 'Evidence-aware product education with approved claims and qualified review.', 6) on conflict (slug) do nothing;
insert into public.categories (slug, name, description, sort_order) values ('springvilla-community', 'Springvilla Community', 'Events, training recaps, office news, verified recognition.', 7) on conflict (slug) do nothing;

-- Site settings
update public.site_settings set
  site_name = coalesce(nullif(site_name, ''), 'Springvilla'),
  tagline = coalesce(tagline, 'Where growth begins'),
  default_seo_title = coalesce(default_seo_title, 'Springvilla'),
  default_seo_description = coalesce(default_seo_description, 'Springvilla is an organisation within FHG that operates offices and development communities, bringing people together to learn, practise and grow through a 2-in-1 system.'),
  default_timezone = 'Africa/Lagos',
  cookie_banner_text = coalesce(cookie_banner_text, 'We''d like to measure how the site is used so we can improve it. We never sell data or use advertising trackers.'),
  footer = case when footer = '{}'::jsonb then $j${"closing_statement":"There's more in you.\nLet's grow it.","highlight":"grow","disclaimers":["Springvilla is an organisation within FHG that operates offices and development communities.","NeoLife is the business vehicle used in the network-marketing pathway. Springvilla does not own NeoLife or manufacture its products.","Participation never guarantees income, work, a promotion or any other result. Skill and business results are individual and uncertain, and they take work."],"legal_name":""}$j$::jsonb else footer end
where id = 1;

-- Navigation (only if empty)
do $nav$
begin
  if not exists (select 1 from public.navigation_items) then
    insert into public.navigation_items (label, href, location, group_label, sort_order) values
      ('Discover', '/discover', 'header'::public.nav_location, null, 0),
      ('Our System', '/our-system', 'header'::public.nav_location, null, 1),
      ('Life Here', '/life-here', 'header'::public.nav_location, null, 2),
      ('Stories & Ideas', '/stories-and-ideas', 'header'::public.nav_location, null, 3),
      ('Find an Office', '/offices', 'header'::public.nav_location, null, 4),
      ('Discover', '/discover', 'footer'::public.nav_location, 'Explore', 0),
      ('Our System', '/our-system', 'footer'::public.nav_location, 'Explore', 1),
      ('Life Here', '/life-here', 'footer'::public.nav_location, 'Explore', 2),
      ('Stories & Ideas', '/stories-and-ideas', 'footer'::public.nav_location, 'Explore', 3),
      ('Find an Office', '/offices', 'footer'::public.nav_location, 'Take part', 4),
      ('Join Springvilla', '/join', 'footer'::public.nav_location, 'Take part', 5),
      ('Events', '/events', 'footer'::public.nav_location, 'Take part', 6),
      ('Contact', '/contact', 'footer'::public.nav_location, 'Take part', 7),
      ('Ideas', '/ideas', 'footer'::public.nav_location, 'Read', 8),
      ('Journeys', '/journeys', 'footer'::public.nav_location, 'Read', 9),
      ('News', '/news', 'footer'::public.nav_location, 'Read', 10),
      ('FAQ', '/faq', 'footer'::public.nav_location, 'Read', 11),
      ('Privacy', '/privacy', 'legal'::public.nav_location, null, 0),
      ('Terms', '/terms', 'legal'::public.nav_location, null, 1);
  end if;
end $nav$;

create table if not exists ops.seed_runs (version text, ran_at timestamptz default now(), kept text[]);
insert into ops.seed_runs (version, kept) values ('2026-11-21.blueprint-v1', '{}');

-- Done. Next: promote your account to super_admin (docs/OWNER_TODO.md, section C).
