# AUD-03: CI and tooling guardrails

**Branch:** `chore/aud-03-guardrails`, two PRs: 03-i (workflows and repo config) and 03-ii (database tooling).
**Goal:** the staging workflow is safe to enable, Dependabot stops opening PRs that can't pass, every PR carries the checklist, and the database wrapper can't be pointed at production by a mistyped subcommand. Fixes findings **A-011, A-013, A-014 (PR template only), A-024** in `docs/audits/AUDIT_2026-11-16.md`.
**Depends on:** F-1 (the `main` ruleset) is recommended first, so these PRs are themselves gated. No code dependency.
**Read:** `CLAUDE.md`, `docs/STAGING.md` (§ How staging stays migrated, § Guards), `docs/EXTERNAL-SOURCES.md` § GitHub and § Supabase CLI v3, audit findings A-011, A-013, A-024.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `.github/workflows/*.yml`, `.github/dependabot.yml`, `scripts/staging/migrate.mjs`, `scripts/staging/core.mjs`, `scripts/db/target.mjs`, `scripts/db/verify-migrations.mjs`, `package.json`, `tests/unit/scripts/*`.
- **Updates:** the three workflow files, `.github/dependabot.yml`, new `.github/pull_request_template.md`, `scripts/staging/migrate.mjs` and `core.mjs`, `scripts/db/target.mjs`, a new small script for `db:types`, `package.json` (the `db:types` script line only), unit tests, `docs/STAGING.md` (only the lines these changes make wrong).

## Starting-state checks
Stop and report if any is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; branch cut from current `main`.
3. `vars.STAGING_ENABLED` is still unset or `false` (the "Staging migrations" check on the latest `main` commit shows **skipped**). If staging is already live, stop and ask: task 1 then changes a running pipeline.
4. `staging-migrate.yml` still mints the App token **before** `npm ci`, and `migrate.mjs` still spreads `process.env` into the CLI's environment. If not, that task is already done.
5. `npm test` passes before any change.

## Scope
**In:** the items below. **Out (non-goals):** applying GitHub rulesets (founder action F-1); merging or closing Dependabot PRs (Vishnu); upgrading the Supabase CLI or TypeScript; any `.claude/` settings (handoff 01b); app code.

## Tasks, PR 03-i (workflows and repo config)
1. **Order and scope in `staging-migrate.yml`.** Move "Install (npm ci)" above "Mint a GitHub App token". Give the token step explicit repository and permission inputs so the token is limited to this repository's contents (check the input names in the action's README for the pinned version; don't write them from memory).
   - **Verify (proposed, not run):** read the file: no step that runs dependency code comes after the mint step except the final migrate step. The workflow still parses: push the branch and confirm the "Staging migrations" check appears as **skipped**, not as a workflow syntax error.
2. **Minimal environment for the Supabase CLI.** In `scripts/staging/`, build the CLI's environment from a short allowlist (path, home and temp variables, `SUPABASE_ACCESS_TOKEN`, the two project refs, `CI`) in a pure function in `core.mjs`, and use it in `migrate.mjs`. `APP_TOKEN` must not be in it.
   - **Verify (proposed, not run):** a new unit test in `tests/unit/scripts/staging-core.test.ts` asserts the returned object has no `APP_TOKEN` and no `GITHUB_TOKEN`. `npm test` exits 0. On `main` the test would fail or not exist.
3. **Pin actions to commit SHAs.** Replace each `uses: owner/action@vN` with the full 40-character SHA of the release currently used on `main`, followed by `# vN.N.N`. Look the SHAs up from the action's own repository (a public, read-only lookup; ask before fetching). Dependabot keeps SHA pins updated.
   - **Verify (proposed, not run):** `git grep -nE "uses: [^@]+@[0-9a-f]{40} # v" .github/workflows` lists every `uses:` line, and `git grep -nE "uses: [^@]+@v[0-9]" .github/workflows` lists none. CI on the PR is green.
4. **Dependabot ignore rules.** In `.github/dependabot.yml`, ignore the `supabase` package entirely (CLI upgrades are manual: `CLI_VERSION` in `scripts/db/target.mjs` and the flags recorded in EXTERNAL-SOURCES must change together) and ignore semver-major updates of `typescript`. Say in the PR that Dependabot will then close or rebuild #22 and #23 by itself.
   - **Verify (proposed, not run):** after merge, the next Dependabot run opens no Supabase CLI or TypeScript-major PR. Failure means the rule's `dependency-name` is wrong.
5. **PR template.** Add `.github/pull_request_template.md` containing the "PR checklist" from `CLAUDE.md`, copied word for word, under headings for what changed, how it was tested, migrations to apply and env vars to add.
   - **Verify (proposed, not run):** open the PR for this branch; its description box is pre-filled.

## Tasks, PR 03-ii (database tooling)
6. **Local mode becomes an allowlist.** In `scripts/db/target.mjs`, local mode currently refuses hosted flags but runs any subcommand. List the subcommands the repo actually runs in local mode (search `package.json` and `scripts/` for `target.mjs local --` and for direct CLI calls in `verify-migrations.mjs`), allow exactly those, and refuse the rest with exit 2.
   - **Verify (proposed, not run):** new cases in `tests/unit/scripts/db-target.test.ts`: `checkInvocation("local", ["functions", "deploy", "x"])` throws; each allowed subcommand passes. Then, with the local stack running, `npm run db:types`, `npm run test:db` and `npm run verify:migrations` all still exit 0. A failure means a subcommand in real use was left off the list.
7. **`db:types` can't empty the tracked file.** Today the shell redirect truncates `src/data/database.types.ts` before the guard runs. Generate into a temporary file and replace the tracked file only when the command exits 0 and the output is non-empty.
   - **Verify (proposed, not run):** stop the local stack, run `npm run db:types`: it exits non-zero and `git status --short` shows no change. Start the stack, run it again: exit 0 and no diff.

## Tests
Unit tests named above. No e2e: nothing user-visible changes.

## Stop and ask
- Staging is already enabled.
- A SHA lookup needs network access you haven't been allowed.
- The CLI needs an environment variable that isn't on the allowlist (say which, and why).
- A change would alter what `docs/STAGING.md` tells Vishnu to configure in GitHub (secret names, permissions).

## Rollback
Revert the PR. Nothing here touches a database or a live setting.

## Acceptance criteria
- With staging disabled, CI is green and both staging jobs still show **skipped**.
- The CLI subprocess in the staging migration never receives the GitHub App token (unit test).
- No workflow references an action by a mutable tag.
- `node scripts/db/target.mjs local -- functions deploy x` exits 2 and runs nothing; `npm run test:db` still works.
- Negative: `npm run db:types` with the stack stopped leaves `src/data/database.types.ts` untouched.
