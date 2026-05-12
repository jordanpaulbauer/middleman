-- ═══════════════════════════════════════════════════════════════════
--  0008_platform_fee_tiers.sql
--  Sliding-scale platform fee. Replaces the flat 4% default on
--  closings.platform_fee_bps so each new closing's fee is computed
--  from its agreed_price_cents. Existing rows are untouched — they
--  keep whatever fee they had when finalized.
--
--  Tiers:
--    <  $1,000    →  4.0%
--    $1k – $5k    →  3.0%
--    $5k – $20k   →  2.0%
--    $20k – $100k →  1.5%
--    $100k+       →  1.0%
--
--  The matching JS mirror is in src/lib/fees.js — keep in lockstep.
-- ═══════════════════════════════════════════════════════════════════

create or replace function platform_fee_bps_for(p_price_cents bigint)
returns integer
language sql
immutable
as $$
  select case
    when p_price_cents <  100000   then 400  -- < $1,000     → 4.0%
    when p_price_cents <  500000   then 300  -- $1k–$5k      → 3.0%
    when p_price_cents <  2000000  then 200  -- $5k–$20k     → 2.0%
    when p_price_cents <  10000000 then 150  -- $20k–$100k   → 1.5%
    else                                100  -- $100k+       → 1.0%
  end;
$$;
grant execute on function platform_fee_bps_for(bigint) to authenticated;

-- Drop any prior overloads so PostgREST can dispatch unambiguously.
-- (A previous iteration of this migration created a second integer-typed
-- create_closing alongside the original bigint one; that ambiguity
-- caused supabase-js calls to hang.)
drop function if exists public.create_closing(uuid, text, text, integer);
drop function if exists public.create_closing(uuid, text, text, bigint);

create or replace function create_closing(
  p_listing_id uuid,
  p_buyer_name text,
  p_buyer_email text,
  p_agreed_price_cents bigint
) returns closings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_closing public.closings;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then raise exception 'listing not found'; end if;
  if v_listing.claimed_by <> v_user then raise exception 'not your claim'; end if;
  if v_listing.status not in ('claimed', 'negotiating') then
    raise exception 'listing is not in a claimable state (status=%)', v_listing.status;
  end if;

  -- Idempotency: if there's already a non-final closing for this
  -- listing by this closer, return it.
  select * into v_closing from public.closings
    where listing_id = p_listing_id
      and closer_id = v_user
      and status not in ('completed', 'refunded')
    order by created_at desc
    limit 1;
  if found then
    return v_closing;
  end if;

  insert into public.closings (
    listing_id, seller_id, closer_id, buyer_name, buyer_email,
    agreed_price_cents, commission_bps, platform_fee_bps
  ) values (
    p_listing_id, v_listing.seller_id, v_user, p_buyer_name, p_buyer_email,
    p_agreed_price_cents, v_listing.commission_bps,
    platform_fee_bps_for(p_agreed_price_cents)
  ) returning * into v_closing;

  insert into public.audit_log (entity_type, entity_id, actor_id, action, payload)
  values ('closing', v_closing.id, v_user, 'created', to_jsonb(v_closing));

  return v_closing;
end;
$$;

grant execute on function create_closing(uuid, text, text, bigint) to authenticated;
