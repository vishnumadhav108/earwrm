# AUD-07: Apply the approved handoff amendments (docs only)

**Branch:** `docs/aud-07-amendments`, one PR. Docs only.
**Goal:** the existing handoffs say what Vishnu approved on 2026-11-16, so the sessions that run them later build the right thing. Applies the answers to **Q-01, Q-02, Q-03, Q-04, Q-05, Q-06** in `docs/audits/AUDIT_2026-11-16.md` § 7. Closes the documentation side of findings A-004, A-005, A-006, A-007, A-009, A-010, A-016, A-017, A-020, A-022, A-025, A-026 and proposal P-2.
**Depends on:** AUD-06 merged (same files). Must merge before handoff 02 starts.
**Read:** the audit document § 4, § 6 and § 7 in full; `docs/DECISIONS.md` (how decisions are recorded); `CLAUDE.md`.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## The rule for this handoff
Handoff tasks and acceptance criteria are fixed unless Vishnu approves a change. **Every change below was approved; nothing else was.** Move existing text word for word. Add only what is written here. If an amendment doesn't fit the text you find, stop and ask instead of adapting it.

## Canonical files
- **Reads and updates:** `docs/handoffs/01-foundations.md`, `02-bug-fixes.md`, `03-architecture.md`, `04-profiles-privacy.md`, `11-discover.md`, `12-recommendations.md`; `docs/DESIGN.md`; `docs/DECISIONS.md`; `docs/README.md`.
- **Creates:** `docs/handoffs/02a-database-security.md`, `02b-store-correctness.md`, `02c-auth-flows.md`, `02d-gestures-ui.md`.

## Starting-state checks
Stop and report if any is not true.
1. `git status --short` prints nothing; branch cut from `main` with AUD-06 merged.
2. `docs/handoffs/02-bug-fixes.md` still has items 1–18 and has not been started (no `fix/review-pass` PR merged).
3. `docs/DECISIONS.md` ends at D29. If later entries exist, number the new ones after the last.
4. None of handoffs 03, 04, 11, 12 has been started. If one has, stop and ask how to amend work in progress.

## Tasks
1. **`docs/DECISIONS.md`: append three records** (never edit earlier ones), each dated 2026-11-16 and citing the audit question.
   - **D30. Only the server writes catalog rows.** Clients never insert or update `releases` (later `release_groups`). A route handler validates the MBID, takes the row's fields from MusicBrainz, and writes with the service role. (Q-02, audit A-002.)
   - **D31. Usernames aren't derived from email addresses.** New accounts get a neutral default. Before a profile can be public, its owner picks a username. (Q-01, audit A-007.)
   - **D32. The prototype's "Private diary" setting carries into the privacy model.** A profile with `settings.privateDiary = true` starts with `privacy.diary = 'private'`. (Q-05, audit A-006.)
2. **Split handoff 02 (P-2).** Create four files in the format of the other handoffs, each with its own branch name, the shared Rules section copied in full, and its own acceptance criteria and PR section adapted only by item numbers. **Item numbers stay 1–18** so earlier references still resolve. Move each item's text word for word:
   - `02a-database-security.md`: the database halves. Item 4's `my_releases()` function and its pgTAP test; item 9's pgTAP ordering check; item 16. Add the new item 19 below. Item 10 is replaced by a pointer (task 3). This is a migration-only PR.
   - `02b-store-correctness.md`: items 1, 3, 5, 7, 8, 9 (app half), and item 4's app half (using `my_releases()`, paging entries, the secondary sort). Depends on 02a applied in production.
   - `02c-auth-flows.md`: items 12, 13, 14. Add the note from task 9.
   - `02d-gestures-ui.md`: items 2, 6, 15, 17, 18.
   - `02-bug-fixes.md` becomes a short index: the goal, the table "item → file", and the manual-pass line from its acceptance criteria.
   - `docs/README.md` order table: the 02 row becomes 02a–02d in that order, depending on 01b and AUD-08.
3. **Item 10 (Q-02).** In `02a`, replace item 10's Fix with: "Superseded by `docs/audits/handoffs/AUD-08-server-only-catalog-writes.md` (D30). Keep this item's test: pgTAP shows UPDATE on `releases` is denied to `authenticated`."
4. **New item 19 in `02a` (A-022).** "User text has no upper bound in the database. Add CHECK constraints as abuse ceilings, not product limits: `entries.review` ≤ 20,000 characters, `lists.name` 1–200, `lists.description` ≤ 2,000, `profiles.username` ≤ 64, `profiles.display_name` ≤ 100. Vishnu first counts violating rows in production with a read-only `select`; stop if any exist. **Test:** pgTAP shows an over-long value is refused for each column."
5. **Item 1 in `02b` (A-005).** Append to its Fix: "The rating control commits once, when the pointer is released, not on every half-star step while dragging." Append to its Tests: "an e2e test that drags across the stars and checks exactly one entry write."
6. **`03-architecture.md`.**
   - Task 2, first bullet: replace "with the *current* optimistic and rollback behavior" with "with optimistic updates that (a) run one at a time per resource, in the order the user made them, (b) roll back by refetching that resource, never by restoring an older snapshot, and (c) do any write that touches two tables in one SQL function, so it can't half-succeed". Add to Acceptance criteria: "an e2e test delays the first of two rating writes so it arrives second; after reload the second rating is shown." (A-005)
   - Task 5: add "Every upstream fetch (MusicBrainz, Wikidata, Wikipedia) has a timeout, and the limiter's queue has a maximum length; a full queue answers 503 quickly." (A-009)
   - Task 5b: add "**Security headers:** a content security policy (covers from coverartarchive.org and the archive.org hosts it redirects to; the Supabase project URL for connections; no third-party scripts), `X-Content-Type-Options`, `Referrer-Policy` and frame-ancestors, set in `next.config.ts`, with an e2e test that an image from an unlisted host is blocked." (A-010)
   - Task 7, Primitives: add "Dialog and Sheet follow `docs/DESIGN.md` § Accessibility (dialog semantics, focus, Escape)." (A-020)
7. **`docs/DESIGN.md` § Accessibility: add four bullets** (A-020): every input has a programmatic label; dialogs and sheets have a dialog role and name, move focus in, keep it inside, close on Escape and return focus; errors and "didn't save" messages are announced through a live region; nothing removes the focus outline without a visible `:focus-visible` replacement.
8. **`04-profiles-privacy.md`.**
   - Task 1: add "**Scale seed:** create `supabase/seed/` with a script that loads 10k users and 1M diary entries into the local stack with one documented command, and use it for the benchmarks here and in 06a and 10a." (A-016)
   - Task 1: add "**Existing users:** every profile with `settings.privateDiary = true` gets `privacy.diary = 'private'` (D32). pgTAP: such a user's review is invisible to anon and to a stranger after the migration." (A-006)
   - Task 6: add "**Existing accounts** go through the username step on their next sign-in, and their profile stays non-public until they have picked one. New accounts get a neutral default username that isn't taken from their email (D31); change `handle_new_user()` accordingly, keeping AUD-01's collision handling." (A-007)
   - Task 9: add to the notice's contents "the other recipients of data: Internet Archive (cover images load straight from coverartarchive.org, so it sees the visitor's IP address), and MusicBrainz and Wikimedia (search terms and article titles, sent from earwrm's server)". (A-026)
9. **`02c-auth-flows.md` and `01-foundations.md` (Q-06, A-025).** In 02c add: "These flows are tested with local mail. They aren't live for real users until a custom SMTP provider is configured (handoff 01 task 15)." In handoff 01 task 15, add to the BILLING-SETUP checklist: "research $0 SMTP options and pick one; record limits and cost in COSTS.md. **Don't enable it in production until AUD-01, AUD-02 and AUD-08 are applied there**: the default SMTP is what currently keeps sign-up limited to organization members (audit § 8)".
10. **`01-foundations.md` task 13 (Q-03, A-004).** Add, before the drill: "**Backup routine, done first.** Dump roles, schema and data from production into a local folder outside the repo that isn't synced to any cloud drive (for example `C:\earwrm-backups`), and keep an encrypted copy Vishnu controls. Do it before every production migration and once a month. Never upload a dump as a GitHub artifact: the repository is public. Write the exact commands into `docs/RUNBOOK.md`, and use the newest dump for the drill."
11. **Handoffs 11 and 12 (A-017).**
    - `11-discover.md`, Rules: delete the sentence "Recommendation privacy follows RECOMMENDATIONS §2 exactly: private and followers-only data shapes only the owner's own recommendations." and put "Recommendation privacy follows RECOMMENDATIONS § 2 and D27." in its place.
    - `11-discover.md`, Tests, pgTAP: replace "a private rating never changes another user's For you results or `item_neighbors`" with "the RECOMMENDATIONS § 2 privacy tests: no disclosure, pair-level and list-level minimum support, exclusion, block".
    - `12-recommendations.md`, Tests: replace "a private rating never changes another user's recommendations or `item_neighbors`" with the same wording.

## Verify (proposed, not run)
From the repo root:
- `git diff --stat main` lists only the files named in "Canonical files". Anything else is out of scope.
- For the 02 split, every numbered item 1–18 appears in exactly one of 02a–02d (items 4 and 9 appear in two, as database half and app half). Check by searching each file for the item's bold title.
- `git grep -n "never changes another user" docs/handoffs` prints nothing.
- `git grep -n "current\* optimistic" docs/handoffs` prints nothing.
- `npm run format:check` exits 0.

## Stop and ask
- Any amendment doesn't match the text it is meant to change.
- Splitting an item's text between 02a and 02b would need rewording beyond adding "database half" or "app half".
- You think another change is needed. Propose it; don't make it.

## Rollback
Revert the PR. No code or data is involved.

## Acceptance criteria
- A session given only `02a-database-security.md` can run it without opening `02-bug-fixes.md`.
- Each amendment above is present with the wording given, and each cites its audit finding or decision.
- Negative: no task, test or criterion outside this list changed. A reviewer can confirm it by reading the diff against this file.
