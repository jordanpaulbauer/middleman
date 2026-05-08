-- ─────────────────────────────────────────────────────────────────
-- MIDDLEMAN initial schema
-- Run with: supabase db push  (or paste into Supabase SQL editor)
--
-- Models the commission marketplace: sellers list items, closers
-- claim them, find a buyer, and earn a commission on the closed deal.
-- All tables have RLS on. State transitions on listings/closings
-- run through SECURITY DEFINER RPCs to enforce business rules.
-- ─────────────────────────────────────────────────────────────────

-- Required extensions (gen_random_uuid lives in pgcrypto)
create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────
create type listing_status as enum ('open', 'claimed', 'negotiating', 'sold', 'expired');
create type closing_status as enum (
  'pending_payment', 'paid', 'item_confirmed', 'completed', 'disputed', 'refunded'
);
create type notification_type as enum (
  'message', 'claim', 'closing', 'review', 'completed', 'dispute', 'system'
);

-- ── Profiles (extends auth.users) ────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  photo_url text,
  location text,
  bio text,
  specialties text[] default '{}',
  joined_at timestamptz not null default now(),
  stripe_account_id text,
  stripe_payouts_enabled boolean not null default false,
  is_verified boolean not null default false,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on profiles (email);

-- ── Listings ─────────────────────────────────────────────────────
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles on delete cascade,
  title text not null,
  description text,
  category text not null,
  condition text not null,
  price_cents bigint not null check (price_cents > 0),
  commission_bps integer not null check (commission_bps between 0 and 10000), -- basis points (5% = 500)
  location text,
  photos text[] not null default '{}',
  status listing_status not null default 'open',
  claimed_by uuid references profiles,
  claim_start timestamptz,
  claim_end timestamptz,
  has_been_extended boolean not null default false,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Invariant: if claimed, claimed_by/claim_start/claim_end must be set
  constraint claim_consistency check (
    (status = 'open' and claimed_by is null and claim_start is null and claim_end is null)
    or (status in ('claimed', 'negotiating') and claimed_by is not null and claim_start is not null and claim_end is not null)
    or (status in ('sold', 'expired'))
  )
);

create index listings_status_idx on listings (status);
create index listings_seller_idx on listings (seller_id);
create index listings_claimed_by_idx on listings (claimed_by);
create index listings_created_idx on listings (created_at desc);

-- ── Closings ─────────────────────────────────────────────────────
create table closings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete restrict,
  seller_id uuid not null references profiles on delete restrict,
  closer_id uuid not null references profiles on delete restrict,
  buyer_name text not null,
  buyer_email text not null,
  agreed_price_cents bigint not null check (agreed_price_cents > 0),
  commission_bps integer not null,
  platform_fee_bps integer not null default 400, -- 4%
  status closing_status not null default 'pending_payment',
  stripe_payment_intent_id text,
  stripe_checkout_url text,
  stripe_transfer_seller_id text,
  stripe_transfer_closer_id text,
  dispute_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  -- Seller and closer cannot be the same person
  constraint closing_distinct_parties check (seller_id <> closer_id)
);

create index closings_listing_idx on closings (listing_id);
create index closings_seller_idx on closings (seller_id);
create index closings_closer_idx on closings (closer_id);
create index closings_status_idx on closings (status);

-- ── Conversations ────────────────────────────────────────────────
create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings on delete set null,
  seller_id uuid not null references profiles on delete cascade,
  closer_id uuid not null references profiles on delete cascade,
  last_message_text text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, seller_id, closer_id),
  constraint conv_distinct_parties check (seller_id <> closer_id)
);

create index conversations_seller_idx on conversations (seller_id);
create index conversations_closer_idx on conversations (closer_id);
create index conversations_last_msg_idx on conversations (last_message_at desc);

-- ── Messages ─────────────────────────────────────────────────────
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id uuid not null references profiles on delete cascade,
  text text not null check (length(text) > 0 and length(text) <= 4000),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at desc);
create index messages_unread_idx on messages (conversation_id, sender_id) where read = false;

-- ── Reviews ──────────────────────────────────────────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  closing_id uuid references closings on delete set null,
  seller_id uuid not null references profiles on delete cascade,
  closer_id uuid not null references profiles on delete cascade,
  stars integer not null check (stars between 1 and 5),
  text text,
  created_at timestamptz not null default now(),
  -- Only one review per closing
  unique (listing_id, seller_id, closer_id)
);

create index reviews_closer_idx on reviews (closer_id);

-- ── Watchlist ────────────────────────────────────────────────────
create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  listing_id uuid not null references listings on delete cascade,
  notify boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index watchlist_user_idx on watchlist (user_id);

-- ── Notifications ────────────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read = false;

-- ── Reports (trust & safety) ─────────────────────────────────────
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete set null,
  entity_type text not null check (entity_type in ('listing', 'user', 'message', 'review')),
  entity_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles
);

create index reports_status_idx on reports (status);

-- ── Audit log ────────────────────────────────────────────────────
create table audit_log (
  id bigserial primary key,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references profiles,
  action text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);

-- ── Triggers: updated_at ─────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger listings_updated_at before update on listings
  for each row execute function set_updated_at();

-- ── Trigger: create profile row on auth signup ───────────────────
-- When Supabase Auth creates a row in auth.users, mirror minimal data
-- into profiles so downstream FKs resolve.
create or replace function handle_new_user() returns trigger
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Trigger: keep conversations.last_message_* in sync ───────────
create or replace function update_conversation_last_message() returns trigger as $$
begin
  update conversations
    set last_message_text = new.text,
        last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_update_conversation
  after insert on messages
  for each row execute function update_conversation_last_message();

-- ─────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table listings enable row level security;
alter table closings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table watchlist enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table audit_log enable row level security;

-- ── Profiles ──
-- Public-readable; only the profile owner can update.
create policy profiles_select_all on profiles for select using (true);
create policy profiles_update_own on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert_self on profiles for insert
  with check (auth.uid() = id);

-- ── Listings ──
-- Anyone authenticated can read open marketplace inventory.
-- Sellers manage their own listings. Closers can claim via RPC (below).
create policy listings_select_all on listings for select
  to authenticated using (true);
create policy listings_insert_seller on listings for insert
  to authenticated with check (auth.uid() = seller_id);
create policy listings_update_seller on listings for update
  to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy listings_delete_seller on listings for delete
  to authenticated using (auth.uid() = seller_id and status = 'open');

-- ── Closings ──
-- Only the parties involved can read.
-- Inserts go through claim_listing/create_closing RPCs (SECURITY DEFINER).
create policy closings_select_parties on closings for select
  to authenticated
  using (auth.uid() in (seller_id, closer_id));

-- ── Conversations ──
-- Only the two participants can read or update.
create policy conversations_select_parties on conversations for select
  to authenticated
  using (auth.uid() in (seller_id, closer_id));
create policy conversations_insert_party on conversations for insert
  to authenticated
  with check (auth.uid() in (seller_id, closer_id));

-- ── Messages ──
-- Only conversation participants can read or send.
create policy messages_select_parties on messages for select
  to authenticated
  using (
    conversation_id in (
      select id from conversations where auth.uid() in (seller_id, closer_id)
    )
  );
create policy messages_insert_parties on messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and conversation_id in (
      select id from conversations where auth.uid() in (seller_id, closer_id)
    )
  );
create policy messages_update_parties on messages for update
  to authenticated
  using (
    conversation_id in (
      select id from conversations where auth.uid() in (seller_id, closer_id)
    )
  );

-- ── Reviews ──
-- Anyone authenticated can read reviews (they're part of public closer profile).
-- Only the seller of the closing can write a review.
create policy reviews_select_all on reviews for select to authenticated using (true);
create policy reviews_insert_seller on reviews for insert
  to authenticated with check (auth.uid() = seller_id);

-- ── Watchlist ──
-- Strictly private to each user.
create policy watchlist_select_own on watchlist for select
  to authenticated using (auth.uid() = user_id);
create policy watchlist_insert_own on watchlist for insert
  to authenticated with check (auth.uid() = user_id);
create policy watchlist_update_own on watchlist for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy watchlist_delete_own on watchlist for delete
  to authenticated using (auth.uid() = user_id);

-- ── Notifications ──
create policy notifications_select_own on notifications for select
  to authenticated using (auth.uid() = user_id);
create policy notifications_update_own on notifications for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_delete_own on notifications for delete
  to authenticated using (auth.uid() = user_id);
-- Inserts come from server-side functions only (no client policy).

-- ── Reports ──
create policy reports_insert_self on reports for insert
  to authenticated with check (auth.uid() = reporter_id);
create policy reports_select_own on reports for select
  to authenticated using (auth.uid() = reporter_id);

-- ── Audit log ──
-- Read-only to the actor, full access to admins via service role.
create policy audit_log_select_own on audit_log for select
  to authenticated using (auth.uid() = actor_id);

-- ─────────────────────────────────────────────────────────────────
-- RPCs (SECURITY DEFINER) for state transitions
-- These run with the function owner's privileges, bypassing RLS,
-- and enforce business rules in one atomic step.
-- ─────────────────────────────────────────────────────────────────

-- claim_listing: closer claims an open listing for a 7-day window
create or replace function claim_listing(p_listing_id uuid)
returns listings
language plpgsql security definer set search_path = public
as $$
declare
  v_listing listings;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_listing from listings where id = p_listing_id for update;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.status <> 'open' then raise exception 'listing not available'; end if;
  if v_listing.seller_id = v_user then raise exception 'cannot claim your own listing'; end if;

  update listings
    set status = 'claimed',
        claimed_by = v_user,
        claim_start = now(),
        claim_end = now() + interval '7 days'
    where id = p_listing_id
    returning * into v_listing;

  insert into audit_log (entity_type, entity_id, actor_id, action, payload)
  values ('listing', p_listing_id, v_user, 'claimed', jsonb_build_object('claim_end', v_listing.claim_end));

  insert into notifications (user_id, type, title, body, data)
  values (
    v_listing.seller_id,
    'claim',
    'Listing Claimed',
    'A closer has claimed your listing.',
    jsonb_build_object('listing_id', p_listing_id, 'closer_id', v_user)
  );

  return v_listing;
end;
$$;

-- extend_claim: closer can extend their own claim by 2 days, once
create or replace function extend_claim(p_listing_id uuid)
returns listings
language plpgsql security definer set search_path = public
as $$
declare
  v_listing listings;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_listing from listings where id = p_listing_id for update;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.claimed_by <> v_user then raise exception 'not your claim'; end if;
  if v_listing.has_been_extended then raise exception 'already extended once'; end if;
  if v_listing.status not in ('claimed', 'negotiating') then raise exception 'cannot extend in current status'; end if;

  update listings
    set status = 'negotiating',
        claim_end = claim_end + interval '2 days',
        has_been_extended = true
    where id = p_listing_id
    returning * into v_listing;

  insert into audit_log (entity_type, entity_id, actor_id, action, payload)
  values ('listing', p_listing_id, v_user, 'extended', jsonb_build_object('new_end', v_listing.claim_end));

  return v_listing;
end;
$$;

-- create_closing: closer creates the closing record once they've found a buyer
create or replace function create_closing(
  p_listing_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_agreed_price_cents bigint
)
returns closings
language plpgsql security definer set search_path = public
as $$
declare
  v_listing listings;
  v_closing closings;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_listing from listings where id = p_listing_id;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.claimed_by <> v_user then raise exception 'not your claim'; end if;

  insert into closings (
    listing_id, seller_id, closer_id, buyer_name, buyer_email,
    agreed_price_cents, commission_bps
  ) values (
    p_listing_id, v_listing.seller_id, v_user, p_buyer_name, p_buyer_email,
    p_agreed_price_cents, v_listing.commission_bps
  ) returning * into v_closing;

  insert into audit_log (entity_type, entity_id, actor_id, action, payload)
  values ('closing', v_closing.id, v_user, 'created', to_jsonb(v_closing));

  return v_closing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Storage buckets (run separately if SQL editor doesn't auto-create)
-- See SUPABASE_SETUP.md for storage policy SQL.
-- ─────────────────────────────────────────────────────────────────

-- End of migration.
