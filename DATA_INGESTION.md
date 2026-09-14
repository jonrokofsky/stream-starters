# Data ingestion foundation

This foundation stores validated, versioned JSON snapshots in the existing Supabase project. The pitcher page now reads its approved pitcher and team-offense snapshots from Stream Starters; unresolved datasets keep their current sources until D-0002 records an approved provider and every transformation formula.

Server environments use `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY` for snapshot storage. The existing private controls also require `HQ_PASSWORD` and the server-only `HQ_SESSION_SECRET`. Scheduled calls require `CRON_SECRET`, a separate high-entropy server secret that Vercel sends as a Bearer credential. Keep values in `.env.local` locally and in encrypted Vercel environment settings for production; never use client-prefixed variables for credentials.

Apply `supabase/migrations/202609120001_data_snapshots.sql` to a non-production Supabase project first. It creates immutable snapshots, atomic active pointers, refresh metadata, and a per-dataset refresh lock. No browser role receives table access.

Run `npm run test:data` for source-neutral fixture checks and `npm run build` for the application build. After the migration, sign in at `/hq`; Data Operations shows status and starts one or all refreshes. Until approved provider adapters are configured, refreshes return a safe setup message and preserve any active snapshot.

Production migration and provider configuration require separate review. Do not include provider credentials, secret URLs, response bodies, or stack traces in adapter errors.


The `mlb_pitchers` and `mlb_team_offense` adapters use the confirmed public FanGraphs 2026 leaderboards and need no provider credential. The other four adapters remain intentionally unconfigured until D-0002 records their providers and formulas.

## Daily MLB schedule

`vercel.json` calls `/api/cron/mlb-pitchers` once daily at `10:00 UTC`. This is 6:00 AM Eastern during daylight saving time and 5:00 AM Eastern during standard time because the schedule stays fixed in UTC. The existing route now refreshes `mlb_pitchers` and `mlb_team_offense`; each dataset uses the same validated refresh service as the private HQ button with an independent store, result, and atomic activation. One failure does not prevent the other dataset from completing. The schedule does not provide live or continuous updates.

The 2026 MLB guard is visible in `lib/data/scheduledPitchers.ts`: March 25 through October 31, inclusive, compared in UTC. Update both constants before the next season. Outside that window the route returns `outside_mlb_season` before creating storage or calling FanGraphs. The manual HQ refresh remains available as a fallback.

Before deployment, add `CRON_SECRET` to the Vercel production environment and apply the data migration through the normal reviewed database process. Do not call the cron endpoint from client code or reuse the HQ password as the cron secret.
