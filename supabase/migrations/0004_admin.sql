-- ═══════════════════════════════════════════════════════════════════
--  0004_admin.sql
--  Admin role + moderation hooks. Admins can read/delete any listing
--  regardless of ownership so they can take down content that violates
--  the guidelines. All other tables stay locked down — admins only get
--  what they need for moderation.
-- ═══════════════════════════════════════════════════════════════════

alter table profiles add column if not exists is_admin boolean not null default false;

-- Bootstrap the founder account as the first admin. Adjust as needed.
update profiles set is_admin = true where email = 'jordanpaulbauer@gmail.com';

-- ── Admin RLS additions ──────────────────────────────────────────
-- Admins can SELECT every listing (regardless of status filters elsewhere).
drop policy if exists listings_select_admin on listings;
create policy listings_select_admin on listings for select
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Admins can DELETE any listing. The default seller-only DELETE policy
-- still applies for non-admins; this is an additive permission.
drop policy if exists listings_delete_admin on listings;
create policy listings_delete_admin on listings for delete
  to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Helper used by edge functions to verify the caller's admin status.
create or replace function is_admin() returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function is_admin() to authenticated;
