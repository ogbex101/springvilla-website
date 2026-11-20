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
