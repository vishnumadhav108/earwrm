# 02d: Bug fixes from the review (gestures and UI)

**Branch:** `fix/02d-gestures-ui`, one PR.
**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.
**Depends on:** 02c merged.

Part 4 of 4 of handoff 02, split on 2026-11-16 (audit proposal P-2, `docs/audits/AUDIT_2026-11-16.md`). The index is `docs/handoffs/02-bug-fixes.md`. Item numbers are the original ones, so earlier references still resolve.

## Rules
- Make database changes in a new migration (`supabase migration new review_fixes`).
- Don't refactor beyond what a fix needs. Handoff 03 does the restructuring.
- For each item: write the failing test, fix it, then confirm the test passes.

## Bugs
2. **Reordering favorites also opens the release.** Swallow the click after a drag. **Test:** e2e.
6. **Long-press on a search result fires while scrolling on touch screens.** Cancel the hold on `pointercancel` and when the pointer moves more than 8 px, in both `SearchScreen` and `useRowGestures.tapProps`. **Test:** unit test the hold logic.
15. **The Private diary and Weekly recap toggles do nothing.** Hide both until handoffs 04 and 10 make them real. **Test:** none needed.
17. **The release blurb is cut off after an initial such as "J. Cole".** Found while writing the handoff 01 unit tests (PR C).
    - **What happens:** `firstSentence` (`src/lib/musicbrainz.ts`) splits on any `. ` followed by a capital, so "A record by J. Cole and friends." becomes "A record by J.". Its own comment says "J. Cole" shouldn't cut the sentence short.
    - **Fix:** don't treat a period as a sentence end when the word before it is a single capital letter (an initial). Keep today's handling of "Vol. 2" and of real sentence ends ("…album. It was…").
    - **Test:** `tests/unit/lib/musicbrainz.test.ts` already pins the bug as "KNOWN BUG: splits after a capitalised initial". Flip it to expect "A record by J. Cole and friends.", and add cases for a run of initials ("A. R. Rahman") and a real sentence end right after an initial-free word. The existing firstSentence tests must keep passing.
18. **Swiping a list row with a mouse closes it straight away, so desktop users can't swipe-delete a list.** Found while writing the handoff 01 e2e tests (PR C).
    - **What happens:**
      - On the Lists tab (`src/components/screens/LogScreen.tsx`, the list row's `onClick`), the handler runs `if (g.swipeKey) return g.closeSwipe();`.
      - With a mouse, releasing the button after a drag fires a click. That click closes the row the drag just opened, so the EDIT and DELETE actions are never reachable.
      - Phones are unaffected, because browsers send no click after a touch swipe.
      - Diary, queue and list-item rows don't have the bug: they use `useRowGestures().tapProps`, which ignores the click that follows a swipe (`suppressTap`).
    - **Fix:** make the list row ignore the follow-up click the same way. Either route it through `tapProps`, or expose the suppression check from `useRowGestures` and use it. Don't change the touch behaviour.
    - **Test:** an e2e test in `tests/e2e/` that opens the Lists tab on `/demo`, swipes a list row with the **mouse** (`page.mouse` down → move left more than 48 px → up), and asserts the row's DELETE action is clickable and opens "Delete this list?". It fails on `main` today. The existing touch-based e2e tests must keep passing.

## Acceptance criteria
- Every item (2, 6, 15, 17, 18) has a test that fails on `main` and passes on this branch. The PR description lists the test file for each item.
- CI is green. Demo mode works.

## PR
A table of item # → fix → test. Include the migration to apply to production once staging looks right.
