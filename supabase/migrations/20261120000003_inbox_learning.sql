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
