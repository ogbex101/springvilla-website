-- Users created in Supabase Auth before the schema existed have no profile row,
-- so their roles would not apply. Create the missing profiles (idempotent).
insert into public.profiles (id, email, display_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
