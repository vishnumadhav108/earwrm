# AUD-01: Sign-up username collision

**Branch:** `fix/aud-01-signup-username`, one migration-only PR.
**Goal:** a new account can always be created, even when its email local part (or requested username) is already someone's username. Fixes finding **A-001** in `docs/audits/AUDIT_2026-11-16.md`.
**Depends on:** F-2 (a production data dump exists) before the production step. Nothing else. Runs before AUD-02 so the migrations stay in order.
**Read:** `CLAUDE.md` (Database, Release order, Tests), `docs/STAGING.md` § Local development and § Guards, audit finding A-001.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `supabase/migrations/20260831000000_baseline.sql` (the current `handle_new_user()`, lines 33–48, and `profiles_username_key`, line 59), `src/app/login/page.tsx`, `tests/e2e/local-supabase.spec.ts`, `supabase/tests/rls_test.sql` (style to copy).
- **Updates:** one new file under `supabase/migrations/`, one new file under `supabase/tests/`, `tests/e2e/local-supabase.spec.ts`.

## Starting-state checks
Stop and report if any of these is not true.
1. `node -v` prints `v24.` If it prints another major, fix the shell first (`docs/STAGING.md`, or `fnm use 24`).
2. `git status --short` prints nothing, and the branch was cut from current `main`.
3. `public.handle_new_user()` in the newest migration that defines it still inserts `split_part(new.email, '@', 1)` as the username and handles only `on conflict (id)`. If a later migration already changed it, this handoff may be done: check the acceptance criteria instead of coding.
4. `profiles.username` is still `unique`. If handoff 04 has replaced it with `citext`, stop and ask.
5. The local stack is running on loopback: `npm run test:db` passes before any change.

## Scope
**In:** the trigger function, a pgTAP test, an e2e test.
**Out (non-goals):** changing how the default username is chosen (handoff 04 does that, audit A-007); making the username editable (handoff 02 item 14); any app code; `search_path` hardening; display names.

## Tasks
1. **Failing tests first.**
   - pgTAP, new file `supabase/tests/signup_username_test.sql`, wrapped in `begin … rollback` like the existing tests. Insert two `auth.users` rows whose emails share a local part on different domains. Assert both inserts succeed, both have a `profiles` row, and the usernames differ. Add a case where `raw_user_meta_data->>'username'` equals an existing username. Add a case proving a re-insert of the same `id` is still a no-op.
   - E2E, in `tests/e2e/local-supabase.spec.ts`: sign up `<random>@a.test`, sign out, sign up the same local part `@b.test`; the second account reaches the diary.
   - **Verify (proposed, not run):** from the repo root, with the local stack running, `npm run test:db`. Expected: the new file **fails** on `main`'s schema with `duplicate key value violates unique constraint "profiles_username_key"`. If it passes, the test isn't exercising the trigger.
2. **Migration.** `npx supabase migration new signup_username_collision`. In it, `create or replace function public.handle_new_user()` with the same signature, `security definer` and `search_path` as today. Behaviour:
   - first try exactly what it does today, so an account with no collision gets the same username as before;
   - on a `unique_violation`, retry a bounded number of times with the same base plus `_` and four random hex characters;
   - if every retry collides, fall back to `user_` followed by the user id without dashes;
   - keep `on conflict (id) do nothing`; never swallow any other error.
   - **Verify (proposed, not run):** `npm run db:reset` (this wipes the **local** database; the script prints `mode=local` and refuses anything else), then `npm run test:db`. Expected: every file passes, including the new one. A failure in `rls_test.sql` means the function body changed something it shouldn't.
   - **Optional, added after the audit's approved live check (finding A-027); skip it if Vishnu says so.** In the same migration, `revoke execute on function public.handle_new_user() from public, anon, authenticated`. Supabase's security advisor reports the function as callable through the API. Add a pgTAP assertion that `has_function_privilege` is false for `anon` and `authenticated`, and keep the assertions that sign-up still creates a profile (the trigger runs as the function's owner, so it doesn't need the grant). If sign-up breaks in the local stack after the revoke, remove the revoke and report it.
3. **Checks the PR needs.**
   - `npm run verify:migrations`. Expected: exit 0 ("clean build vs legacy upgrade" identical). Failure means the migration doesn't apply on the prototype-shaped fixture.
   - `npm run db:types`, then `git diff --exit-code -- src/data/database.types.ts`. Expected: no diff, because no signature changed. A diff means something else in the schema moved: stop and ask.
   - `npm run check`, then `npm run test:e2e`. Expected: exit 0.
4. **PR description.** Per the CLAUDE.md checklist. State: migration-only; compatible with the deployed app (a function replacement, no table change); the rollback below; that production's next `db push` will also apply `20261106211527_feature_flags` (approved, audit Q-08).

## Production step (Vishnu, by hand)
1. Confirm a data dump newer than the last production change exists in `C:\earwrm-backups`.
2. List what is pending, read-only: `node scripts/db/target.mjs production-read -- migration list --remote=<production ref> --password <password>`. Expected pending: `20261106211527` and this migration, nothing else. Anything else pending: stop.
3. Apply with the Supabase CLI by hand, as the release-order rule describes.
4. Verify in production: in the dashboard, `public.handle_new_user` shows the new body; then create two throwaway accounts that share a local part and delete them again from Settings.

## Stop and ask
- Any production row or fixture row already violates an assumption above.
- The fix seems to need a change to `profiles`, to the client, or to a product rule.
- `verify:migrations` reports a difference you can't explain.

## Rollback
A new migration that restores the function body from `baseline.sql` lines 33–48. Never edit a merged migration. Accounts created with a suffixed username keep it; nothing else to undo.

## Acceptance criteria
- Signing up `sam@a.test` and then `sam@b.test` creates two working accounts with different usernames.
- A first sign-up with an unused local part gets exactly the username it would have got before (no suffix).
- Negative: the trigger still raises for errors other than a username conflict, and a duplicate `id` still does nothing.
- The pgTAP file fails on `main` and passes on the branch; the PR says so with the output.
