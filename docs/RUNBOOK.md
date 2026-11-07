# Runbook

What to do when something breaks in production.

> Handoff 01 PR B added `keep_alive`, and PR D1 the staging sections. PR D2 adds the database restore drill, the feature-flag kill switches and the cost-spike section. Handoff 04 adds Storage recovery.

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

## Staging recovery
The `staging-migrate` workflow stops instead of guessing whenever staging and its tags don't line up. While it's stopped, `staging-applied` may be absent, so every new preview build falls back to demo mode. That's safe, just less useful. The commands below assume:
- you're in the repo;
- the bot's scoped token is in `SUPABASE_ACCESS_TOKEN`;
- `STAGING_PROJECT_REF` and `PRODUCTION_PROJECT_REF` are set in your shell.

You can't move the tags yourself (only the GitHub App can), so every fix ends with a workflow run.

### First, look at the state
```bash
git fetch origin --tags --force
git ls-remote origin refs/tags/staging-applied refs/tags/staging-last-good
node scripts/db/target.mjs staging -- migration list --remote=$STAGING_PROJECT_REF
```
Compare the applied versions with `git ls-tree -r --name-only origin/staging-last-good -- supabase/migrations/` and with main.

### "The database and the tags disagree"
- **Staging is missing a migration that `staging-last-good` says was applied.** Someone reverted or edited staging by hand, or restored it.
  - Find out what happened in the staging dashboard (Database → Migrations).
  - If staging can simply be rebuilt, reset it (see § Rebuild staging).
  - Never edit migration history to make the numbers match without understanding why.
- **Staging has a migration that this commit doesn't contain.** A migration was applied from a branch, or by hand. Check `supabase_migrations.schema_migrations` on staging. Either merge the migration properly, or rebuild staging.

### `staging-last-good` is missing (outside bootstrap)
The check is never skipped. Don't recreate the tag by hand (you can't), and don't pick a commit that "looks right": a checkpoint is only ever created by a verified bootstrap. The supported path is to rebuild staging (§ Rebuild staging) and run the bootstrap, which pushes every migration to a fresh project, verifies it, compares it with a clean local build, and only then publishes both tags. Staging holds synthetic data only, so nothing of value is lost.

### A partial push (db push failed partway)
- If the failure was a **SQL error**: fix the migration in a new PR. Never edit a merged migration; add a corrective one. Merge it, and the next run continues from the partly applied state (allowed, because applied ⊆ this commit's migrations).
- If staging was **unavailable or auth failed**: fix that (§ Resume staging, or the token), then re-run the workflow for the same commit. Retrying is allowed.

### A bad migration on staging
Staging is disposable. Ship the fix as a new migration. If staging is badly broken, rebuild it.

### A bootstrap that failed after partly applying migrations
- Nothing was published: both tags are still absent.
- The bootstrap precondition (no app-owned objects, empty history) now fails, so you can't simply re-run it. Rebuild staging (§ Rebuild staging), fix the cause, and run the bootstrap again.
- If the run stopped because staging's objects **differed** from the local build, keep the workflow log for review **before** rebuilding.

### Rebuild staging
This erases staging, so only do it on staging: double-check the ref is **not** `fvbifyhaamgaebsltulu`. In the staging dashboard, pause and delete the project, or create a fresh `earwrm-staging` project in the staging org. Then:
1. Update `STAGING_PROJECT_REF`, the Vercel Preview env vars, `STAGING_ANON_KEY` and the bot token's project scope.
2. Repeat STAGING.md checklist steps 4–5.
3. Run the bootstrap.

## Resume staging
Staging is a Free project and pauses after about a week without activity. The daily `staging-keepalive` workflow is **best effort**: GitHub disables scheduled workflows after 60 days without repository activity, and it can't wake a project that's already paused.

**Signs:**
- `staging-migrate` fails with "UNAVAILABLE: staging is unavailable (status INACTIVE…), possibly paused";
- the keep-alive run fails;
- staging previews error.

**Fix:**
1. Supabase dashboard → the staging org → `earwrm-staging` → **Restore** (resume). Wait until it's healthy.
2. If GitHub disabled the schedule: Actions → *Staging keep-alive* → **Enable workflow**.
3. Re-run *Staging migrations* for the latest main commit, so the tags are confirmed.
4. Redeploy any previews you're using. Existing previews aren't rebuilt automatically.
