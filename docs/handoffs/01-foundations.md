# 01: Foundations (tooling, tests, CI, migrations, environments)

**Branch:** `chore/foundations`
**Goal:** every later PR is safe to make. No app behavior changes in this handoff.

## Context
Right now there are no tests, no CI and no migration history. The schema is two SQL files run by hand, and there's only one environment (production). Read `docs/ARCHITECTURE.md` §2, §3 and §8, `docs/DECISIONS.md` and `docs/CONVENTIONS.md`.

## Scope
**In:** tooling, test setup, CI, the migration baseline, a staging environment, generated types, error monitoring, the repo `CLAUDE.md`.
**Out:** fixing bugs (handoff 02) and moving files around (handoff 03).

## Starting state (from handoff 00)
- `docs/` has been copied in but isn't committed yet. Make it the first commit on this branch.
- Uncommitted on purpose: `package-lock.json` (regenerated), `.gitattributes`, and `supabase/config.toml` plus `supabase/.gitignore` (from `supabase init`). Commit them here.
- `.env.local` points at **production**. The values were copied by hand because Vercel marks them Sensitive, so `vercel env pull` can't fetch them.
- Local machine: Windows, Node 26 LTS, Supabase CLI 3.0, Docker Desktop on WSL 2.
- `supabase_vector` crash-loops on Docker Desktop for Windows because it can't reach the Docker socket. It only feeds Studio's Logs page.

## Tasks
1. **CLAUDE.md:** keep `@AGENTS.md` and add the contents of `docs/CONVENTIONS.md` under it.
2. **Migrations baseline:**
   - Run `supabase db pull` from production into `supabase/migrations/<timestamp>_baseline.sql`.
   - Compare it with `supabase/schema.sql` + `002_grants.sql` and note any differences in the PR.
   - Move the old files to `supabase/legacy/` with a README saying they're historical.
   - Add `supabase/seed.sql` with a test user, so `supabase db reset` gives a working local app.
   - **Local env:** local development must never write to production by accident. Add `.env.local.example` (or a section in `docs/STAGING.md`) with the local-stack values from `supabase status`, plus a documented way to switch between local and production (for example `.env.development.local`). Never print secret values.
   - **Vector container:** turn off the analytics/vector service for local dev in `config.toml`, or exclude it when starting (check the Supabase CLI 3 docs for the current option). Do the same in CI if it causes trouble.
   - **Prove the baseline two ways:** (a) rebuild an empty local database from migrations, and (b) restore a fixture dump shaped like today's production data, run the migrations on top, and diff the resulting schema against production.
3. **Scripts in `package.json`:**
   - `db:reset`, `db:types` (writes `src/data/database.types.ts`), `test` (Vitest), `test:db` (`supabase test db`), `test:e2e` (Playwright)
   - `check`, which runs typecheck, lint, test, test:db and build
4. **Generated types:** generate them and type the Supabase clients (`createClient<Database>`). Fix any type errors that show up *without changing behavior*. List them in the PR.
5. **Vitest:** set it up for `src/lib`. Write starter tests for `releaseType`, `initialsOf`, `firstSentence` and `TtlCache`.
6. **pgTAP:** set it up under `supabase/tests/`. Write one test file that proves the current RLS works: user A can't read or write user B's entries, queue, likes, favorites, lists or list_items, and anon can't read anything.
7. **Playwright:** a config that starts the dev server and runs against `/demo`. Starter e2e tests:
   - log an album with a rating, and it shows at the top of the diary
   - add to the queue, then remove it
   - create a list, add an album to it, then delete the list
   - Use a phone-sized viewport.
8. **CI:** `.github/workflows/ci.yml`, triggered on PRs and pushes to main. Node LTS with npm cache. **The first step is `npm ci`, and it must pass** (the lockfile is out of sync today). Then start local Supabase (`supabase start`), apply every migration to a fresh database, and run `npm run check` and `npm run test:e2e`. Upload Playwright traces when a run fails. This isolated local stack is how PRs that change the schema get validated before merge.
9. **Staging:**
   - Write `docs/STAGING.md` with the steps for me to create an `earwrm-staging` Supabase project (free tier) and point Vercel's **Preview** environment variables at it. Note that Sensitive Vercel variables can't be read back after saving, so I have to keep the values somewhere safe myself, such as a password manager.
   - Add a GitHub Action that applies migrations to staging when main is merged. It uses repo secrets `SUPABASE_ACCESS_TOKEN` and `STAGING_PROJECT_REF`, and the doc tells me how to add them.
   - Production migrations stay manual.
   - Vercel preview deployments of a PR that changes the schema can't use staging until it's merged. **Enforce this:** detect schema-changing PRs (any new file in `supabase/migrations/`) and build their preview with the demo adapter, or with mutations disabled, so incompatible code can never write to shared staging. The full flow that writes to the database is tested in isolated CI. Supabase Branching gives each PR its own isolated database but is billed by usage (verified, Micro compute starts at $0.01344/hour). Note it as an option for later. Don't turn it on now.
10. **Sentry:** set up `@sentry/nextjs` with Next 16 (check the docs). Use a DSN from env; with no DSN, it does nothing. Add the DSN to `.env.example`.
    - **Allowed data:** user ID, route **template** (e.g. `/u/[username]`, never the real path), error type, stack trace and release.
    - `beforeSend` only covers errors and messages (verified). Also set `beforeSendTransaction` and `beforeSendSpan` (plus the log and metric hooks if those are turned on). **Turn off Session Replay and attachments.** Turn on only the event types we actually need. **Never sent:** request and response bodies, review text, emails, file names, import rows, tokens, cookies or query strings.
    - A test captures a deliberate error **and a transaction**, from both the browser and the server. It intercepts the **outgoing Sentry payload** and checks it against the allowlist.
11. **Hygiene:**
    - commit the regenerated lockfile, `.gitattributes` and the Supabase config
    - add `engines.node` to `package.json`
    - add `.nvmrc` matching the local Node major (26), and have CI read it (`node-version-file`)
    - run `npm audit`. Apply fixes for critical and high issues only when they're non-breaking (no `--force`, no major upgrades) and don't change behavior. List the rest in the PR. Dependabot handles major upgrades as separate PRs.
    - note in the PR that eslint 9.39.5 is out of support, and that npm blocked `unrs-resolver`'s install script (confirm lint still works in CI). Don't upgrade ESLint's major version here.
    - add Prettier with a format check in CI, and do a single formatting commit
    - turn on Dependabot for npm and GitHub Actions
12. **Branch protection:** write `docs/STAGING.md` § "GitHub settings" for me, covering required CI checks on main and no direct pushes.
13. **Runbook and restore drill:** start `docs/RUNBOOK.md`. Cover how to restore the database from a Supabase backup into staging, run that drill once, and record the date and result. Handoff 04 adds Storage.
14. **Feature flags:** a simple `feature_flags` table, cached and readable by the server, plus a helper. Later handoffs use it for kill switches (imports, enrichment, recommendations) so they can be turned off without touching manual logging.
15. **Billing safety (COSTS.md):**
    - Create staging in a **separate Free Supabase organization**.
    - Start `docs/VENDOR-DEPENDENCIES.md`.
    - Write `docs/BILLING-SETUP.md`, a checklist for Vishnu covering:
      - spend headroom and projected month-end alerts
      - custom SMTP before real signups
    - which plan each service is on
    - Supabase Spend Cap status, and Vercel Spend Management plus Pause Production Deployments once on Pro
    - usage alerts
    - an empty `docs/COST-LOG.md`
    - a cost-spike section in `RUNBOOK.md`

    Add an ESLint rule (or a CI grep) that fails if `next/image` is used for external cover URLs without `unoptimized`.
16. **MetaBrainz contact:** draft an email for Vishnu to send (`docs/outreach/metabrainz.md`) asking which account type fits earwrm's use of the hosted MusicBrainz API, and about commercial licensing for tags and genres (non-commercial today). This doesn't block anything.

## Acceptance criteria
- On a fresh clone: `npm ci && supabase start && npm run db:reset && npm run check && npm run test:e2e` all pass on Windows.
- CI is green on the PR.
- `npm run dev` pointed at a reset local database (not production) lets me sign up and use the app locally.
- Production behaves exactly the same.

## PR
List what was added, the differences between the baseline and the old schema, and the manual steps I need to do (staging project, Vercel preview env vars, GitHub secrets, branch protection), as a numbered checklist.
