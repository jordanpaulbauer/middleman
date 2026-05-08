-- ─────────────────────────────────────────────────────────────────
-- Storage buckets and policies
-- Run after 0001_init.sql.
-- ─────────────────────────────────────────────────────────────────

-- Public buckets: anyone can read; only authenticated users can upload to their own folders.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-photos', 'listing-photos', true, 8 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ── Avatars ──
-- Path convention: avatars/{user_id}/{filename}
create policy avatars_read_all on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Listing photos ──
-- Path convention: listing-photos/{user_id}/{listing_id}/{filename}
-- Policies match avatars pattern; the seller-of-listing relationship
-- is enforced at upload time by the client and validated by the
-- listings.seller_id RLS at write-time of the listing row itself.
create policy listing_photos_read_all on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy listing_photos_insert_own on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy listing_photos_update_own on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy listing_photos_delete_own on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
