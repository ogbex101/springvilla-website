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
