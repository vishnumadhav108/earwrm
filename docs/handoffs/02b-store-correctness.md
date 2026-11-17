# 02b: Bug fixes from the review (store correctness)

**Branch:** `fix/02b-store-correctness`, one PR.
**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.
**Depends on:** 02a merged and its migration applied in production (release order).

Part 2 of 4 of handoff 02, split on 2026-11-16 (audit proposal P-2, `docs/audits/AUDIT_2026-11-16.md`). The index is `docs/handoffs/02-bug-fixes.md`. Item numbers are the original ones, so earlier references still resolve.

## Rules
- Make database changes in a new migration (`supabase migration new review_fixes`).
- Don't refactor beyond what a fix needs. Handoff 03 does the restructuring.
- For each item: write the failing test, fix it, then confirm the test passes.

## Bugs
1. **Drag-to-reorder writes on every step.** `useDragReorder` (`src/lib/gestures.ts`) calls `onPreview` on every swap. The callers (LogScreen queue, ListScreen, ProfileScreen favorites) pass persisting store actions, so each step sends an upsert, and requests arriving out of order can save an order from partway through the drag. The rollback is wrong too, because it takes `prev` from `dRef.current`, which is already the previewed order at commit time.
   - **Fix:** preview only changes local state, commit persists once, and rollback restores the order from before the drag. The rating control commits once, when the pointer is released, not on every half-star step while dragging. (Added 2026-11-16, audit A-005.)
   - **Tests:** a unit test of the reorder logic, plus an e2e test that drags and checks exactly one write. An e2e test that drags across the stars and checks exactly one entry write. (Added 2026-11-16, audit A-005.)
3. **The splash can hang forever.** In the hydrate effect (`src/lib/store.tsx`), no session means an early return, and query errors are ignored, so `ready` never becomes true.
   - **Fix:** no session sends the user to `/login`. A failed query shows an error screen with Retry, in the app's style.
   - **Test:** e2e with a mocked failed request.
4. **Hydrate loads the whole shared `releases` table.** PostgREST caps responses at 1,000 rows, so past that, diary rows show "Unknown release".
   - **Fix:** add a SQL function `my_releases()` (security invoker) that returns only the releases this user references: entries, queue, likes, favorites and their list items.
   - Page `entries` past 1,000 rows, and add a secondary sort on `created_at desc`.
   - **Tests:** a pgTAP test for `my_releases()`, and a unit test for paging.
   - **This handoff (app half):** use `my_releases()` in hydrate, page `entries`, add the secondary sort, and the unit test for paging. The database half is in `02a-database-security.md` and must be applied in production first.
5. **A failed stage-2 search wipes the results.** In `SearchScreen`, keep the stage-1 results when stage 2 fails, and only show the error when nothing loaded. **Test:** a unit/component test with mocked fetch.
7. **Evening logs get tomorrow's date.** `TODAY()` uses UTC, and so does the database default for `logged_on`.
   - **Fix:** use the local date, and send `logged_on` explicitly when the entry is first created. Edits keep the original date.
   - **Test:** a unit test with a mocked clock at 11pm America/Chicago.
8. **The Listened toggle deletes a rated or reviewed log without asking.** In `ActionSheet`, send that tap through the existing "Delete this entry?" dialog. An entry with no rating and no review still toggles instantly. **Test:** e2e.
9. **List and favorite positions can collide.** `addToList` and `toggleFav` compute positions from the array length, and removing an item never renumbers the rest. **Fix:** renumber with ordinals on every add and remove. **Test:** unit + pgTAP ordering check.
   - **This handoff (app half):** the fix and the unit test. The database half is in `02a-database-security.md`.
11. **`[mbid]` isn't validated.** `src/app/api/mb/release-group/[mbid]/route.ts` passes it to MusicBrainz as is. Reject anything that isn't a UUID with a 400. **Test:** a unit test on the route handler.
    - **Confirmed in the fix/next-security smoke test (2026-11-05):** `GET /api/mb/release-group/not-a-uuid` spends a throttled MusicBrainz request and comes back **502** ("Lookup failed.") instead of being rejected locally. The test should assert that no MusicBrainz request is made for a non-UUID id.

## Acceptance criteria
- Every item (1, 3, 4, 5, 7, 8, 9, 11) has a test that fails on `main` and passes on this branch. The PR description lists the test file for each item.
- CI is green. Demo mode works.

## PR
A table of item # → fix → test. Include the migration to apply to production once staging looks right.
