-- Sign-in role check and MFA backup codes.
--
-- 1. my_assigned_roles(): the signed-in user's ASSIGNED roles, including super_admin,
--    at any assurance level. Used only to route sign-in (admin vs no access, MFA
--    enrolment vs challenge). It grants nothing: permissions still come from
--    current_roles(), which drops super_admin until the session is aal2.
-- 2. mfa_backup_codes: hashed one-time recovery codes. No API access at all; only the
--    server (service role) reads or writes them.

create or replace function public.my_assigned_roles()
returns setof public.app_role
language sql stable security definer set search_path = public as $$
  select distinct ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id and p.is_active
  where ur.user_id = auth.uid()
$$;
revoke execute on function public.my_assigned_roles() from public, anon;
grant execute on function public.my_assigned_roles() to authenticated, service_role;

create table if not exists public.mfa_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, code_hash)
);
create index if not exists mfa_backup_codes_user on public.mfa_backup_codes (user_id) where used_at is null;
alter table public.mfa_backup_codes enable row level security;
-- No policies: anon and authenticated can never see or change codes.
revoke all on public.mfa_backup_codes from public, anon, authenticated;
grant all on public.mfa_backup_codes to service_role;
