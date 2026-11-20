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
