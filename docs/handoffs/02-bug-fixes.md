# 02: Bug fixes from the review

**Branch:** `fix/review-pass`
**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.
**Depends on:** 01 (test setup and migrations).

## Rules
- Make database changes in a new migration (`supabase migration new review_fixes`).
- Don't refactor beyond what a fix needs. Handoff 03 does the restructuring.
- For each item: write the failing test, fix it, then confirm the test passes.

## Bugs
1. **Drag-to-reorder writes on every step.** `useDragReorder` (`src/lib/gestures.ts`) calls `onPreview` on every swap. The callers (LogScreen queue, ListScreen, ProfileScreen favorites) pass persisting store actions, so each step sends an upsert, and requests arriving out of order can save an order from partway through the drag. The rollback is wrong too, because it takes `prev` from `dRef.current`, which is already the previewed order at commit time.
   - **Fix:** preview only changes local state, commit persists once, and rollback restores the order from before the drag.
   - **Tests:** a unit test of the reorder logic, plus an e2e test that drags and checks exactly one write.
2. **Reordering favorites also opens the release.** Swallow the click after a drag. **Test:** e2e.
3. **The splash can hang forever.** In the hydrate effect (`src/lib/store.tsx`), no session means an early return, and query errors are ignored, so `ready` never becomes true.
   - **Fix:** no session sends the user to `/login`. A failed query shows an error screen with Retry, in the app's style.
   - **Test:** e2e with a mocked failed request.
4. **Hydrate loads the whole shared `releases` table.** PostgREST caps responses at 1,000 rows, so past that, diary rows show "Unknown release".
   - **Fix:** add a SQL function `my_releases()` (security invoker) that returns only the releases this user references: entries, queue, likes, favorites and their list items.
   - Page `entries` past 1,000 rows, and add a secondary sort on `created_at desc`.
   - **Tests:** a pgTAP test for `my_releases()`, and a unit test for paging.
5. **A failed stage-2 search wipes the results.** In `SearchScreen`, keep the stage-1 results when stage 2 fails, and only show the error when nothing loaded. **Test:** a unit/component test with mocked fetch.
6. **Long-press on a search result fires while scrolling on touch screens.** Cancel the hold on `pointercancel` and when the pointer moves more than 8 px, in both `SearchScreen` and `useRowGestures.tapProps`. **Test:** unit test the hold logic.
7. **Evening logs get tomorrow's date.** `TODAY()` uses UTC, and so does the database default for `logged_on`.
   - **Fix:** use the local date, and send `logged_on` explicitly when the entry is first created. Edits keep the original date.
   - **Test:** a unit test with a mocked clock at 11pm America/Chicago.
8. **The Listened toggle deletes a rated or reviewed log without asking.** In `ActionSheet`, send that tap through the existing "Delete this entry?" dialog. An entry with no rating and no review still toggles instantly. **Test:** e2e.
9. **List and favorite positions can collide.** `addToList` and `toggleFav` compute positions from the array length, and removing an item never renumbers the rest. **Fix:** renumber with ordinals on every add and remove. **Test:** unit + pgTAP ordering check.
10. **Anyone signed in can overwrite cached release metadata.** Change `remember()` to `upsert(..., { onConflict: "id", ignoreDuplicates: true })`. Drop the `"refresh releases"` UPDATE policy and revoke UPDATE on releases from authenticated. **Test:** pgTAP shows UPDATE is denied.
11. **`[mbid]` isn't validated.** `src/app/api/mb/release-group/[mbid]/route.ts` passes it to MusicBrainz as is. Reject anything that isn't a UUID with a 400. **Test:** a unit test on the route handler.
12. **No email confirmation callback.** Add `/auth/callback` (PKCE code exchange with `@supabase/ssr`), set `emailRedirectTo` on signUp, and check `src/proxy.ts`. **Test:** e2e with local Supabase (Inbucket/Mailpit catches the email).
13. **No forgot-password flow.** Add a reset email plus a page for setting a new password. **Test:** e2e with local mail.
14. **Settings account rows don't work.**
    - Display name becomes editable.
    - Username becomes editable, with a uniqueness check and a friendly error.
    - Password opens the change-password flow.
    - Email stays read-only, with no chevron.
    - **Test:** e2e.
15. **The Private diary and Weekly recap toggles do nothing.** Hide both until handoffs 04 and 10 make them real. **Test:** none needed.

## Acceptance criteria
- Every item has a test that fails on `main` and passes on this branch. The PR description lists the test file for each item.
- CI is green. Demo mode works.
- Manual pass on a real phone (or Chrome device emulation): reorder, search while scrolling, log after 6pm, and the delete confirmation.

## PR
A table of item # → fix → test. Include the migration to apply to production once staging looks right.
