# 02: Bug fixes from the review (index)

**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.

Split into four handoffs on 2026-11-16 (audit proposal P-2, `docs/audits/AUDIT_2026-11-16.md`), one session and one PR each. Run them in order: 02a, 02b, 02c, 02d. Item numbers 1–18 are unchanged; 19 and 20 were added on 2026-11-16.

| Item | Bug | File |
|---|---|---|
| 1 | Drag-to-reorder writes on every step. | `02b-store-correctness.md` |
| 2 | Reordering favorites also opens the release. | `02d-gestures-ui.md` |
| 3 | The splash can hang forever. | `02b-store-correctness.md` |
| 4 | Hydrate loads the whole shared `releases` table. | `02a-database-security.md` (database half), `02b-store-correctness.md` (app half) |
| 5 | A failed stage-2 search wipes the results. | `02b-store-correctness.md` |
| 6 | Long-press on a search result fires while scrolling on touch screens. | `02d-gestures-ui.md` |
| 7 | Evening logs get tomorrow's date. | `02b-store-correctness.md` |
| 8 | The Listened toggle deletes a rated or reviewed log without asking. | `02b-store-correctness.md` |
| 9 | List and favorite positions can collide. | `02a-database-security.md` (database half), `02b-store-correctness.md` (app half) |
| 10 | Anyone signed in can overwrite cached release metadata. | `02a-database-security.md` |
| 11 | `[mbid]` isn't validated. | `02b-store-correctness.md` |
| 12 | No email confirmation callback. | `02c-auth-flows.md` |
| 13 | No forgot-password flow. | `02c-auth-flows.md` |
| 14 | Settings account rows don't work. | `02c-auth-flows.md` |
| 15 | The Private diary and Weekly recap toggles do nothing. | `02d-gestures-ui.md` |
| 16 | The API roles have table privileges RLS can't control. | `02a-database-security.md` |
| 17 | The release blurb is cut off after an initial such as "J. Cole". | `02d-gestures-ui.md` |
| 18 | Swiping a list row with a mouse closes it straight away, so desktop users can't swipe-delete a list. | `02d-gestures-ui.md` |
| 19 | User text has no upper bound in the database. | `02a-database-security.md` |
| 20 | The password minimum is 6 in the app and 8 in production. | `02c-auth-flows.md` |

## After 02d merges
- Manual pass on a real phone (or Chrome device emulation): reorder, search while scrolling, log after 6pm, and the delete confirmation.
