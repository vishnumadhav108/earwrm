# Conventions

Handoff 01 copies this into the repo's `CLAUDE.md`, under the existing `@AGENTS.md` line.

## Working rules
- Read `AGENTS.md` first. This is Next.js 16, which has breaking changes, so check `node_modules/next/dist/docs/` before using a Next API.
- Start every task in plan mode. Don't change files outside the handoff's scope without asking.
- One branch per handoff, split into several PRs where pieces deserve separate review. Commits are small and say what they do.
- If a spec is wrong or something can't be done, stop and say so. Don't work around it quietly.
- Check third-party API behavior against current docs, and record new limits in `docs/EXTERNAL-SOURCES.md`.

## Code
- TypeScript strict. No `any` without a comment explaining why.
- Components never import the Supabase client. All data access goes through `src/data/*`.
- Database types come from `npm run db:types` (`supabase gen types`). Never write them by hand.
- Business rules go in SQL functions or `src/lib`, which stays pure and testable. Components only render and handle events.
- Follow `docs/DESIGN.md`. Use the primitives in `src/components/ui` and the design tokens only, with no raw colors or font sizes. Geist Serif is for display text only (20 px and up). UI and body text use Geist Sans, and numbers and meta use Geist Mono.
- Every new screen works at 390 px and 1440 px. Put screenshots of both in the PR.
- Every async UI has a loading state (skeleton), an empty state and an error state with retry.
- Optimistic updates roll back on failure and tell the user what didn't save.
- Dates: store `timestamptz` in UTC, and show and bucket them in the user's `profiles.timezone`.

## Database
- Make every change with a new migration (`supabase migration new <name>`). Never edit a migration that has already merged.
- Every table gets RLS turned on, policies and explicit GRANTs, all in the same migration.
- Every policy that shares data uses `can_view()`. Write a pgTAP test for each new policy.
- Add an index for every query a screen runs. Check stats queries with `explain analyze` on seeded data at scale (see `supabase/seed/`).

## Release order
- **Schema changes ship as a migration-only PR** that stays compatible with the app that's currently deployed. Vishnu applies it to production by hand and verifies it there. Only then does the app PR that depends on it merge.
- **Breaking changes use expand → transition → remove**, each its own release: add the new shape alongside the old one, move the app over, and remove the old shape only once nothing uses it.
- **Optional features may fall back explicitly** (for example a kill switch reading its default). **Required reads and writes must fail visibly and safely** when the schema they need is missing. They never report success or silently drop data.
- The CI check **Release order** fails a PR that adds a migration together with anything outside its allowlist (`supabase/tests/`, `supabase/fixtures/`, `supabase/seed.sql`, the generated `src/data/database.types.ts`, `docs/`, `tests/`), and any PR that edits, renames or deletes a merged migration. It can't prove the production migration was applied. That's the manual checklist item below.

## Tests (required for every PR)
- **Unit (Vitest):** any logic in `src/lib` and `src/data`, plus import parsers and matching logic.
- **pgTAP:** RLS policies and SQL functions.
- **E2E (Playwright):** each flow the PR adds or changes, run against `/demo` and local Supabase.
- **Bug fixes:** write a test that fails before the fix and passes after.

## PR checklist
- [ ] `npm run check` passes (typecheck, lint, unit, db tests, build)
- [ ] `npm run test:e2e` passes
- [ ] Demo mode works and has seed data for the new feature
- [ ] The PR description lists: what changed, how it was tested, migrations to apply, env vars to add, and screenshots for UI changes
- [ ] `docs/` updated if any architecture or decision changed
- [ ] **Release order:** a migration PR is migration-only and compatible with the deployed app; an app PR that depends on a migration merges only after that migration was applied **and verified in production by hand** (say when and how)
- [ ] **Migration check:** migrations apply to an empty database *and* to the prototype-shaped fixture. The PR says how to roll back, or why it can't be rolled back
- [ ] **A user-visible acceptance test** (e2e) for the main behavior the PR adds
- [ ] **Recovery note:** what to do if this breaks in production (kill switch, revert, restore), proportionate to the risk
- [ ] Privacy: any new place that shows user content has a leak test (D19)
- [ ] **Cost note:** does this add a metered usage item, a new background job or an add-on? If so, give the expected monthly usage and how it's capped (COSTS.md). No `next/image` optimization of external covers
