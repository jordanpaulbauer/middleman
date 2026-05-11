-- ═══════════════════════════════════════════════════════════════════
--  0003_reviews_mutual.sql
--  Airbnb-style mutual reviews with double-blind 21-day publish window.
--
--  Both parties (seller + closer) can review each other after a closing
--  completes. Each review stays invisible to the counterparty and to the
--  public until one of two things happens:
--    1) The counterparty also submits a review → both publish immediately
--    2) The 21-day window expires → whatever review exists publishes alone
-- ═══════════════════════════════════════════════════════════════════

-- ── Schema changes ────────────────────────────────────────────────
alter table reviews add column if not exists author_id uuid references profiles on delete cascade;
alter table reviews add column if not exists published_at timestamptz;

-- Backfill legacy rows: treat existing reviews as seller-authored and
-- already published (matches the old immediate-publish behavior so nothing
-- on existing profiles disappears retroactively).
update reviews set author_id = seller_id where author_id is null;
update reviews set published_at = created_at where published_at is null;

alter table reviews alter column author_id set not null;

-- Replace the old uniqueness rule with "one review per author per closing".
alter table reviews drop constraint if exists reviews_listing_id_seller_id_closer_id_key;
create unique index if not exists reviews_one_per_closing_per_author
  on reviews (closing_id, author_id) where closing_id is not null;

create index if not exists reviews_pending_idx on reviews (published_at) where published_at is null;

-- ── RLS ───────────────────────────────────────────────────────────
drop policy if exists reviews_select_all on reviews;
drop policy if exists reviews_insert_seller on reviews;

-- Read: a review is visible if (any of):
--   - it's been published, OR
--   - the caller is its author, OR
--   - 21 days have elapsed since the closing completed
-- The last clause is a "lazy publish" safety net — even before the cron
-- job runs, expired pending reviews become visible to everyone.
create policy reviews_select on reviews for select to authenticated using (
  published_at is not null
  or auth.uid() = author_id
  or exists (
    select 1 from closings c
    where c.id = reviews.closing_id
      and c.completed_at is not null
      and c.completed_at + interval '21 days' < now()
  )
);

-- No direct inserts/updates/deletes from clients — all writes go through
-- submit_review(). The lack of an insert policy denies direct INSERTs.

-- ── submit_review RPC ─────────────────────────────────────────────
create or replace function submit_review(
  p_closing_id uuid,
  p_stars integer,
  p_text text
) returns reviews
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_closing closings;
  v_counterparty uuid;
  v_other_review uuid;
  v_inserted reviews;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_closing from closings where id = p_closing_id;
  if v_closing.id is null then
    raise exception 'Closing not found';
  end if;

  if v_uid != v_closing.seller_id and v_uid != v_closing.closer_id then
    raise exception 'You are not a party to this closing';
  end if;

  if v_closing.status != 'completed' then
    raise exception 'Closing is not yet completed';
  end if;

  if v_closing.completed_at is null or v_closing.completed_at + interval '21 days' < now() then
    raise exception 'Review window has closed';
  end if;

  if p_stars < 1 or p_stars > 5 then
    raise exception 'Stars must be between 1 and 5';
  end if;

  v_counterparty := case
    when v_uid = v_closing.seller_id then v_closing.closer_id
    else v_closing.seller_id
  end;

  select id into v_other_review from reviews
    where closing_id = p_closing_id and author_id = v_counterparty;

  insert into reviews (listing_id, closing_id, seller_id, closer_id, author_id, stars, text, published_at)
  values (
    v_closing.listing_id, p_closing_id, v_closing.seller_id, v_closing.closer_id, v_uid, p_stars, p_text,
    -- If counterparty already reviewed, publish both right now.
    case when v_other_review is not null then now() else null end
  )
  returning * into v_inserted;

  if v_other_review is not null then
    update reviews set published_at = now() where id = v_other_review;
  end if;

  return v_inserted;
end;
$$;

grant execute on function submit_review(uuid, integer, text) to authenticated;

-- ── Background publish for expired pending reviews ───────────────
-- The RLS policy already exposes expired pending reviews on read, but
-- this function flips published_at = completed_at + 21d so the field
-- stays accurate for analytics and the UI's "published vs pending" pill.
create or replace function publish_expired_pending_reviews() returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  update reviews r
  set published_at = (c.completed_at + interval '21 days')
  from closings c
  where r.closing_id = c.id
    and r.published_at is null
    and c.completed_at is not null
    and c.completed_at + interval '21 days' < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function publish_expired_pending_reviews() to authenticated;

-- Schedule a daily run at 03:30 UTC via pg_cron when available.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Drop any prior job with this name so re-running the migration is safe.
    perform cron.unschedule(jobid) from cron.job where jobname = 'publish-expired-reviews';
    perform cron.schedule(
      'publish-expired-reviews',
      '30 3 * * *',
      'select public.publish_expired_pending_reviews()'
    );
  end if;
exception when others then
  raise notice 'pg_cron scheduling skipped: %', sqlerrm;
end$$;
