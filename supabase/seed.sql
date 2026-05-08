-- ─────────────────────────────────────────────────────────────────
-- MIDDLEMAN seed data
--
-- This file populates a fresh database with demo listings, reviews,
-- and notifications for testing. It assumes you have already signed
-- up at least one user (which auto-creates a row in `profiles` via
-- the on_auth_user_created trigger).
--
-- HOW TO RUN
-- 1. Sign up in the app at least once with the email you want to
--    own the demo content (this creates your profiles row).
-- 2. In the Supabase SQL editor, find your user id:
--      select id, email from profiles order by joined_at desc limit 5;
-- 3. Replace 'YOUR_USER_ID_HERE' below with the uuid from step 2.
-- 4. Run this file in the SQL editor.
--
-- Re-running is safe — listings use a deterministic seed comment so
-- you can identify and delete them with:
--      delete from listings where description like '%[demo seed]%';
-- ─────────────────────────────────────────────────────────────────

do $$
declare
  v_owner uuid := 'YOUR_USER_ID_HERE'::uuid; -- ← replace before running
  v_listing_id uuid;
begin
  -- Listings owned by the demo user. Photos use Unsplash placeholders;
  -- replace with real Storage URLs once you've migrated upload flow.

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     'MacBook Pro M3 Max — Bulk Lot (10 units)',
     'New-in-box MacBook Pro 16" M3 Max, bulk of 10. Corporate refresh leftovers. [demo seed]',
     'Electronics', 'New', 3500000, 500, 'Austin, TX',
     array['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
     'open');

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     '2022 Porsche 911 GT3',
     'Track-prepped 911 GT3, 8k miles, full PPF. [demo seed]',
     'Vehicles', 'Excellent', 21900000, 600, 'Austin, TX',
     array['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'],
     'open');

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     'Hermès Birkin 30 — Gold Togo',
     'Authenticated Hermès Birkin 30, Gold Togo leather, palladium hardware. [demo seed]',
     'Fashion', 'Excellent', 2450000, 800, 'Seattle, WA',
     array['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'],
     'open');

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     'Tesla Model X Plaid 2023',
     'Tesla Model X Plaid, white on black, FSD transferable. [demo seed]',
     'Vehicles', 'Excellent', 8900000, 700, 'Austin, TX',
     array['https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800'],
     'open');

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     'Commercial Property — Downtown Warehouse',
     '12,000 sqft commercial warehouse, prime downtown location, zoned mixed-use. [demo seed]',
     'Real Estate', 'Good', 125000000, 500, 'Miami, FL',
     array['https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800'],
     'open');

  insert into listings (seller_id, title, description, category, condition, price_cents, commission_bps, location, photos, status)
  values
    (v_owner,
     'Vintage Rolex Submariner 5513',
     '1978 Rolex Submariner 5513, gilt dial, original parts. [demo seed]',
     'Collectibles', 'Fair', 3200000, 1000, 'Miami, FL',
     array['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800'],
     'open');

  -- Welcome notification
  insert into notifications (user_id, type, title, body, data)
  values (
    v_owner,
    'system',
    'Welcome to MIDDLEMAN',
    'Your demo listings are ready. Switch between Closer and Seller views from the avatar menu.',
    '{}'::jsonb
  );

  raise notice 'Seeded % demo listings for user %', 6, v_owner;
end $$;
