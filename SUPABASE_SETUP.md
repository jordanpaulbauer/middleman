# Supabase setup

This walks you through wiring MIDDLEMAN to a fresh Supabase project. Total time: ~10 minutes.

Until you finish step 4, the app keeps running on the in-memory demo backend. Step 4 flips it to your real database with one file.

---

## 1. Create a Supabase project (~2 min)

1. Go to **https://supabase.com** and sign in (free tier is fine).
2. Click **New project**.
3. Pick an organization, give it a name (e.g. `middleman-dev`), set a strong database password (save it — you'll need it for the CLI), choose a region close to your users.
4. Wait ~90s for the project to provision.

## 2. Run the schema migrations (~2 min)

Two SQL files create the entire database:

- `supabase/migrations/0001_init.sql` — tables, enums, triggers, RLS policies, RPCs.
- `supabase/migrations/0002_storage.sql` — storage buckets and access policies.

**Easiest path — Supabase SQL editor:**

1. In the Supabase dashboard, open **SQL Editor**.
2. Click **+ New query**.
3. Paste the contents of `supabase/migrations/0001_init.sql`, click **Run**.
4. Repeat with `supabase/migrations/0002_storage.sql`.

You should see "Success. No rows returned" both times.

**Alternative — Supabase CLI (recommended once you're past day one):**

```bash
brew install supabase/tap/supabase     # one-time
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

The project ref is in your project URL: `https://supabase.com/dashboard/project/<project-ref>`.

## 3. Configure auth providers (~2 min)

In the dashboard, go to **Authentication → Providers**:

- **Email** (already enabled). Under **Auth → Providers → Email**, turn off "Confirm email" while developing if you want instant signups; turn it back on before launch.
- **Google** (optional). Toggle on, paste OAuth client ID + secret from Google Cloud Console. Add the Supabase callback URL it gives you to your Google OAuth client's authorized redirect URIs.
- **Apple** (optional). Same flow with the Apple Developer console.

The client wrapper (`src/lib/supabase.js`) already passes `detectSessionInUrl: true`, so OAuth callbacks land on the homepage and resolve automatically.

## 4. Plug the keys into the app (~30 sec)

1. In the dashboard, go to **Project Settings → API**.
2. Copy **Project URL** and **anon public key**.
3. In the project root, copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

4. Open `.env.local` and paste the values:

   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Restart the Vite dev server (`Ctrl+C` then `npm run dev`). Vite only picks up env vars at boot.

When the app loads now, the dev console will no longer log the in-memory fallback notice — you're on Supabase.

## 5. Make your first user and seed demo data (~2 min)

1. In the app, register a new account through the auth modal (any email + 4+ char password).
2. Confirm the user exists by going to **Auth → Users** in the dashboard.
3. Open **SQL Editor** and run:

   ```sql
   select id, email from profiles order by joined_at desc limit 5;
   ```

   Copy the `id` of the user you just created.
4. Open `supabase/seed.sql`, replace `YOUR_USER_ID_HERE` with that uuid, and run the file in the SQL editor.
5. Reload the app. You should see 6 demo listings on the Browse page, owned by your account.

## 6. (Later) Set up local development

Once the project's working in the cloud, install the local stack so you can iterate without touching prod:

```bash
supabase init                 # adds supabase/ config
supabase start                # spins up local Postgres, Auth, Storage in Docker
supabase db reset             # applies all migrations + seed
```

Local API runs on `http://localhost:54321` — point `.env.local` at it during development, switch back to the cloud URL for staging/prod.

---

## What's wired so far

| Concern              | Status                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Schema + RLS         | ✅ `supabase/migrations/0001_init.sql`                                 |
| Storage buckets      | ✅ `supabase/migrations/0002_storage.sql` (avatars, listing-photos)    |
| Seed data            | ✅ `supabase/seed.sql` (replace one uuid, paste, run)                  |
| Client SDK           | ✅ `@supabase/supabase-js` installed                                   |
| Client wrapper       | ✅ `src/lib/supabase.js` (auto-fallback to in-memory if env unset)     |
| Env scaffolding      | ✅ `.env.example` + `.gitignore` allows it                             |
| **Auth migration**   | ⏳ next — replace `Auth.*` methods with `supabase.auth.*` calls        |
| Listings/Closings    | ⏳ replace in-memory tables with Postgres queries                      |
| Chat realtime        | ⏳ migrate `Chat.*` to Postgres + realtime channels                    |
| Photo uploads        | ⏳ replace `URL.createObjectURL` and base64 dataURLs with bucket uploads |
| Stripe               | ⏳ Connect onboarding, PaymentIntent, webhooks                         |

## Schema highlights

- **Money is stored in cents** as `bigint` (`price_cents`, `agreed_price_cents`). No more whole-dollar drift.
- **Commission is in basis points** (`commission_bps`) — 5% = 500. Avoids float math.
- **Listing state machine** is enforced by a check constraint and `claim_listing` / `extend_claim` RPCs (security definer). Closers can't bypass the 7-day window or extend twice.
- **Conversations are unique on `(listing_id, seller_id, closer_id)`** — no duplicate threads.
- **Messages are RLS-protected** by conversation participants; trigger keeps `conversations.last_message_*` in sync on insert.
- **`profiles` is auto-created** when a user signs up via the `on_auth_user_created` trigger — no race between auth and app data.
- **`audit_log`** records every state transition through the RPCs, so disputes and trust review have a paper trail.
- **`reports`** table backs an in-app flagging flow (UI not wired yet).

## Anti-patterns to avoid as you build

- Don't insert directly into `auth.users` — always use `supabase.auth.signUp()`. The `handle_new_user` trigger depends on it.
- Don't bypass the RPCs (`claim_listing`, `extend_claim`, `create_closing`) by writing to `listings.status` from the client. RLS will block most of these, but the RPCs also write to `audit_log` and create notifications.
- Don't put service role keys in client code. The anon key is the only one that ships.
