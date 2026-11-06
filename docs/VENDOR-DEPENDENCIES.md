# Vendor dependencies

Every place earwrm depends on something specific to one provider, and roughly what replacing it would involve (COSTS.md § Lock-in). Add an entry whenever a handoff introduces one.

> Started in handoff 01, PR B, with the `keep_alive` entry. The rest of the list (Supabase Auth, Storage, Vercel, MusicBrainz, Cover Art Archive, Sentry, …) is filled in by handoff 01, PR D.

## Supabase

### `public.rls_auto_enable()` + event trigger `ensure_rls` (Supabase-managed)
- **What it is:** an event trigger, `ensure_rls`, enabled on production (checked 2026-11-06, `evtenabled = O`). It runs `public.rls_auto_enable()` after every `CREATE TABLE`, `CREATE TABLE AS` and `SELECT INTO` in `public`, and turns RLS on for the new table.
- **Who owns it:** Supabase. The app never created it, and it isn't on a fresh local stack (CLI 3.0.0), so it presumably comes from a project-level setting on the hosted platform.
- **Not in our migrations, on purpose:** the baseline leaves it out, and the app must **never rely on it**. Every migration enables RLS on its own tables (CONVENTIONS.md § Database). `supabase/tests/rls_enabled_test.sql` fails if any `public` table has RLS off, and it runs on the local stack, where this trigger doesn't exist.
- **Replacing it:** nothing to replace. Elsewhere, the convention and the pgTAP test do the same job.
- **Watch for:** the function sits in `public`, so it shows up in schema dumps and diffs of production. Expect it in any production-vs-migrations comparison, and ignore it there.

### `public.keep_alive()` (Free-plan pause prevention)
- **What it is:** a SQL function, `select 1`, with `EXECUTE` granted to `anon`. Created on production on 2026-10-05 by migration `20261005000453` (now `supabase/migrations/20261005000453_keep_alive.sql`). It can be called through the Data API as `POST /rest/v1/rpc/keep_alive` with the anon key.
- **Why it probably exists:** Supabase Free projects pause after a week with no activity (COSTS.md). An external pinger calling this function keeps the project awake.
- **Who calls it: unknown.** Nothing in this repository calls it. The caller is probably an external scheduler (a cron service, an uptime monitor, or a workflow in another repository). `docs/RUNBOOK.md` § keep_alive explains how to identify it from the API logs.
- **Supabase-specific because:** pausing is a Supabase Free-plan behaviour, and the function is reached through PostgREST's RPC endpoint. On another host or a paid plan it isn't needed.
- **Replacing or removing it:** find the caller first. Removing the function without stopping the caller makes the pinger fail. Stopping the pinger without a paid plan lets the project pause after 7 idle days. Staging (a separate Free organization) will need its own pinger or will pause.
