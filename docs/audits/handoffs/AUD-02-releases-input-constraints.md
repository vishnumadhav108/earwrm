# AUD-02: Input constraints on `releases`

**Branch:** `fix/aud-02-releases-constraints`, one migration-only PR.
**Goal:** the shared `releases` table accepts only well-formed catalog rows, whoever writes them. First half of finding **A-002** (`AUD-SEC-1`) in `docs/audits/AUDIT_2026-11-16.md`. AUD-08 is the second half.
**Depends on:** AUD-01 merged (migration order). F-2 (production data dump) before the production step.
**Read:** `CLAUDE.md` (Database, Release order), `src/lib/cover.ts` (`sleeveColors`, `initialsOf`), `src/lib/musicbrainz.ts` (`toRelease`), audit finding A-002.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `supabase/migrations/20260831000000_baseline.sql` (table `public.releases`, lines 64–76), `supabase/fixtures/prototype_data.sql`, `supabase/seed.sql`, `tests/e2e/fixtures.ts`.
- **Updates:** one new migration, one new file under `supabase/tests/`.

## Starting-state checks
Stop and report if any is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; the branch was cut from `main` with AUD-01 merged.
3. `public.releases` still has the columns `id, title, artist, year, type, initials, c1, c2, updated_at` and only the `releases_type_check` constraint. If handoff 05a has renamed it to `release_groups`, stop and ask.
4. The app still derives `c1`/`c2` in `sleeveColors()` as `#` plus six lowercase hex digits, and `initials` in `initialsOf()` as at most two characters or `??`. If either changed, the patterns below must change with it.
5. `npm run test:db` passes before any change.

## Scope
**In:** CHECK constraints on `public.releases`, a pgTAP test.
**Out (non-goals):** policies and grants on `releases` (AUD-08 and handoff 02a); cleaning or re-fetching existing rows; any other table (text ceilings on user tables are handoff 02a); app code.

## Tasks
1. **Ask Vishnu to count violating rows in production first.** He runs this in the Supabase SQL editor (a read-only `select`; the repo has no tool that queries production data) and pastes the six numbers:
   ```sql
   select
     count(*) filter (where id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') as bad_id,
     count(*) filter (where c1 !~ '^#[0-9a-f]{6}$' or c2 !~ '^#[0-9a-f]{6}$')                       as bad_colour,
     count(*) filter (where char_length(title) not between 1 and 2000)                              as bad_title,
     count(*) filter (where char_length(artist) not between 1 and 2000)                             as bad_artist,
     count(*) filter (where char_length(initials) not between 1 and 4)                              as bad_initials,
     count(*) filter (where year is not null and year not between 1000 and 2200)                    as bad_year
   from public.releases;
   ```
   **Stop and ask if any number is above zero.** Those rows need a decision (fix or delete) before a constraint can be validated.
   - **Known at audit time:** `supabase/fixtures/prototype_data.sql` lines 17–18 hold two rows with made-up ids (`fixture-single-0001`, `fixture-ep-00000001`) that the id rule rejects, so `verify:migrations` will fail until they change. If production's `bad_id` is zero, replace those two ids with valid lowercase UUIDs everywhere the fixture uses them, in this PR (`supabase/fixtures/` is on the release-order allowlist). If production does hold non-UUID ids, the fixture is right and the rule is wrong: stop and ask.
2. **Failing test first.** New file `supabase/tests/releases_constraints_test.sql`, `begin … rollback`. As the role that can currently insert, assert that each of these is refused: an `id` that isn't a lowercase UUID; a `c1` or `c2` that isn't `#` plus six lowercase hex digits; an empty or 2,001-character `title`; the same for `artist`; a five-character `initials`; `year` 999. Assert that one fully valid row is accepted.
   - **Verify (proposed, not run):** repo root, local stack running, `npm run test:db`. Expected on `main`: the new file fails, because every bad row is accepted.
3. **Migration.** `npx supabase migration new releases_input_constraints`. Add one named CHECK constraint per rule in task 1 (`releases_id_format`, `releases_colour_format`, `releases_title_length`, `releases_artist_length`, `releases_initials_length`, `releases_year_range`).
   - **Verify (proposed, not run):** `npm run db:reset` (local only), `npm run test:db`. Expected: all pass. Then `npm run verify:migrations`. Expected: exit 0. A failure there means a fixture row violates a rule: stop and ask, because the fixture stands in for production's shape.
4. **Compatibility check with the deployed app.** `npm run check` and `npm run test:e2e` on the branch. Expected: exit 0, with the local-Supabase e2e test still able to log an entry (its fixture ids are valid UUIDs). The limits are abuse ceilings, far above any MusicBrainz title; a row that breaks one makes the log fail with the existing "release details never reached the server" dialog, which is a visible failure, not a silent one.
5. **PR description.** Migration-only; the production counts from task 1; rollback; note that AUD-08 will later change which role the pgTAP test inserts as.

## Production step (Vishnu, by hand)
Dump first. `migration list` (as in AUD-01) must show only this migration pending. Apply by hand. Verify: the six constraints are listed on `public.releases` in the dashboard, and logging a new album in the deployed app still works.

## Stop and ask
- Any count in task 1 is above zero.
- A real MusicBrainz value is found that a rule would reject (for example an uppercase id).
- The fix seems to need a policy, grant or app change.

## Rollback
A new migration dropping the six constraints by name. No data changes to undo.

## Acceptance criteria
- Through the Data API, a signed-in user's insert or update of a `releases` row with a malformed id, colour, title, artist, initials or year is refused with a constraint error.
- A valid row is accepted, and logging an album in the app works as before.
- Negative: the constraints don't block any row that `toRelease()` can produce; the e2e suite proves it.
- The pgTAP file fails on `main` and passes on the branch.
