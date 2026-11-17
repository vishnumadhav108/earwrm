# AUD-04: Preview guard checks the target project

**Branch:** `fix/aud-04-preview-guard-target`, one PR.
**Goal:** a Vercel preview build can never run against the production Supabase project, even when its migrations match staging and someone left production values in Vercel's Preview scope. Fixes finding **A-012** in `docs/audits/AUDIT_2026-11-16.md`.
**Depends on:** nothing. Must merge before staging setup step 6 (`docs/STAGING.md`).
**Read:** `CLAUDE.md`, `docs/STAGING.md` § Preview guard, `docs/EXTERNAL-SOURCES.md` § Vercel, audit finding A-012.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `scripts/vercel-build.mjs`, `scripts/preview-guard-core.mjs`, `src/lib/supabase/guard.ts`, `tests/unit/scripts/preview-guard-core.test.ts`, `tests/e2e-guard/guard.spec.ts`.
- **Updates:** `scripts/preview-guard-core.mjs`, `scripts/vercel-build.mjs`, `tests/unit/scripts/preview-guard-core.test.ts`, `docs/STAGING.md` § Preview guard (one bullet), `docs/VENDOR-DEPENDENCIES.md` (one line).

## Starting-state checks
Stop and report if any is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; branch cut from current `main`.
3. `decideGuard()` in `scripts/preview-guard-core.mjs` still decides from `vercelEnv`, `head`, `tag` and `error` only, and returns `skip` for any `vercelEnv` other than `"preview"`.
4. The production project ref is still the one named in `docs/STAGING.md` (`PRODUCTION_PROJECT_REF`). It is a public identifier, not a secret.
5. `npm test` passes before any change.

## Scope
**In:** one more reason for a preview build to fall back to demo mode.
**Out (non-goals):** changing what happens when `VERCEL_ENV` is unset (a wrong rule there could put production into demo mode; see Stop and ask); the migration comparison; the runtime guard in `src/`; any Vercel setting.

## Tasks
1. **Failing tests first**, in `tests/unit/scripts/preview-guard-core.test.ts`:
   - preview + migrations match the tag + Supabase URL host begins with the production ref → **demo**, with a reason that names production;
   - preview + migrations match + a different project's URL → **full**;
   - preview + migrations match + URL missing or unparseable → **demo**;
   - production build + production URL → **skip** (unchanged);
   - every existing test still passes unchanged.
   - **Verify (proposed, not run):** repo root, `npm test`. Expected on `main`: the first and third new cases fail.
2. **Implement.** `decideGuard()` takes the build's `NEXT_PUBLIC_SUPABASE_URL` and the production ref. The production-target check runs before the "migrations match" result can return `full`. `vercel-build.mjs` passes both in; the ref comes from one exported constant, not from an environment variable that could be missing.
   - **Verify (proposed, not run):** `npm test` exits 0. Then simulate the builds without Vercel (PowerShell shown; Git Bash uses `VAR=value command`):
     `$env:VERCEL_ENV="preview"; $env:NEXT_PUBLIC_SUPABASE_URL="https://<production ref>.supabase.co"; node scripts/vercel-build.mjs`
     Expected first log line: `[preview-guard] demo: …production…`. The build that follows must use the local placeholders only; run this with `.env.local` moved aside or in CI, never with real values loaded. If the line says `full`, the check isn't wired in.
3. **Guard suite still proves isolation.** `npm run test:e2e:guard`. Expected: exit 0 (5 tests). Prerequisites: Chromium installed for Playwright, network access for the font fetch during build. A failure means the demo-mode build changed.
4. **Docs.** Add one bullet to `docs/STAGING.md` § Preview guard: a preview configured with the production project always builds in demo mode. Add the constant to the Vercel entry in `docs/VENDOR-DEPENDENCIES.md`.

## Tests
Unit tests above; the existing guard e2e suite unchanged.

## Stop and ask
- You find `VERCEL_ENV` can be unset on real Vercel builds and want to treat that as demo. Don't: confirm with Vishnu and against Vercel's current docs first, because the same rule would apply to production builds.
- The production ref has changed or more than one production project exists.
- The fix seems to need a change in `src/`.

## Rollback
Revert the PR. Previews return to today's behaviour: demo unless the migrations match the tag.

## Acceptance criteria
- A preview build whose environment points at production logs `[preview-guard] demo:` and the deployed preview redirects every page to `/demo` and answers app APIs with 503.
- A preview build pointing at staging with matching migrations still logs `[preview-guard] full:`.
- Negative: a production build is never put into demo mode by this change (unit test), and no existing guard test was edited to pass.
