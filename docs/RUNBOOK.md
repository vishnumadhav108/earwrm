# Runbook

What to do when something breaks in production.

> Started in handoff 01, PR B, with the `keep_alive` section. Handoff 01, PR D adds the database restore drill, the feature-flag kill switches and the cost-spike section. Handoff 04 adds Storage recovery.

## keep_alive: the project paused, or someone asks what `keep_alive` is

`public.keep_alive()` is a no-op function (`select 1`) that anon may call. It almost certainly exists so that an external pinger can keep the Supabase Free project from pausing after a week of inactivity. See `docs/VENDOR-DEPENDENCIES.md` § keep_alive.

**The caller is unknown** (as of 2026-11-06). To find it:
1. Supabase dashboard → Logs → **API Gateway** (edge logs). Filter on the path `/rest/v1/rpc/keep_alive`.
2. Check the timestamps (a regular interval points to a scheduler), the user agent and the source IP.
   - A GitHub Actions user agent or IP: search your other repositories for `keep_alive`.
   - An uptime or cron service user agent: check those accounts.
3. Record the caller in `docs/VENDOR-DEPENDENCIES.md`, including where its schedule is configured and which key it uses.

**If production paused:**
1. Supabase dashboard → the project → **Restore** (Free projects can be resumed by hand).
2. Then check that the pinger is still running. It's the one thing that should have prevented the pause.

**Before removing or changing `keep_alive`:** find and update the caller first (see above). Changes go through a new migration, never a dashboard edit.
