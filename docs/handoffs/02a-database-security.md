# 02a: Bug fixes from the review (database and security)

**Branch:** `fix/02a-database-security`, one migration-only PR.
**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.
**Depends on:** 01b (harness) and AUD-08 (`docs/audits/handoffs/AUD-08-server-only-catalog-writes.md`).

Part 1 of 4 of handoff 02, split on 2026-11-16 (audit proposal P-2, `docs/audits/AUDIT_2026-11-16.md`). The index is `docs/handoffs/02-bug-fixes.md`. Item numbers are the original ones, so earlier references still resolve.

## Rules
- Make database changes in a new migration (`supabase migration new review_fixes`).
- Don't refactor beyond what a fix needs. Handoff 03 does the restructuring.
- For each item: write the failing test, fix it, then confirm the test passes.

## Bugs
4. **Hydrate loads the whole shared `releases` table.** PostgREST caps responses at 1,000 rows, so past that, diary rows show "Unknown release".
   - **Fix:** add a SQL function `my_releases()` (security invoker) that returns only the releases this user references: entries, queue, likes, favorites and their list items.
   - Page `entries` past 1,000 rows, and add a secondary sort on `created_at desc`.
   - **Tests:** a pgTAP test for `my_releases()`, and a unit test for paging.
   - **This handoff (database half):** the `my_releases()` function and its pgTAP test. The app half is in `02b-store-correctness.md`.
9. **List and favorite positions can collide.** `addToList` and `toggleFav` compute positions from the array length, and removing an item never renumbers the rest. **Fix:** renumber with ordinals on every add and remove. **Test:** unit + pgTAP ordering check.
   - **This handoff (database half):** the pgTAP ordering check. The app half is in `02b-store-correctness.md`.
10. **Anyone signed in can overwrite cached release metadata.** Superseded by `docs/audits/handoffs/AUD-08-server-only-catalog-writes.md` (D30). Keep this item's test: pgTAP shows UPDATE on `releases` is denied to `authenticated`. (Changed 2026-11-16, audit Q-02.)
16. **The API roles have table privileges RLS can't control.** Found in the handoff 01 baseline (a read-only production dump, 2026-11-06), and copied into `20260831000000_baseline.sql` unchanged.
    - **What production grants:**
      - `anon` has `REFERENCES, TRIGGER, TRUNCATE, MAINTAIN` on every `public` table.
      - `authenticated` has `ALL` on entries, queue, likes, favorites, lists and list_items. That's the intended `SELECT, INSERT, UPDATE, DELETE` plus the same four.
      - On profiles and releases, `authenticated` has `SELECT, INSERT, UPDATE` plus the same four.
      - The default privileges for `postgres` in `public` hand those four to anon, authenticated and service_role on every new table.
    - **Why it matters:** RLS doesn't govern `TRUNCATE`, so these grants are the only thing between an API role and emptying a table. PostgREST doesn't expose `TRUNCATE` today, so nothing in the app can do it yet. The grants are still wider than intended (`002_grants.sql` meant anon to have nothing).
    - **Fix:** a new migration that does three things:
      - revokes `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` on all `public` tables from `anon` and `authenticated`;
      - leaves `anon` with no table privileges;
      - removes those four from the `postgres` default privileges in `public` for anon and authenticated.
      - `service_role` keeps `ALL`, and the intended DML grants for `authenticated` stay.
    - **Test:** pgTAP checks `has_table_privilege` for each API role, table and privilege. It also creates a scratch table to check that new tables get no default grants for anon or authenticated.
19. **User text has no upper bound in the database.** Add CHECK constraints as abuse ceilings, not product limits: `entries.review` ≤ 20,000 characters, `lists.name` 1–200, `lists.description` ≤ 2,000, `profiles.username` ≤ 64, `profiles.display_name` ≤ 100. Vishnu first counts violating rows in production with a read-only `select`; stop if any exist. **Test:** pgTAP shows an over-long value is refused for each column. (Added 2026-11-16, audit A-022.)

## Acceptance criteria
- Every item except 10 (4, 9, 16, 19) has a test that fails on `main` and passes on this branch. The PR description lists the test file for each item.
- CI is green. Demo mode works.

## PR
A table of item # → fix → test. Include the migration to apply to production once staging looks right.
