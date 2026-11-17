# PR-01: Apply the plan-review amendments (docs only)

> **Draft.** Lives in the plan-review packet until Vishnu authorizes it. It isn't in `docs/handoffs/` and isn't part of the run order yet.

**Branch:** `docs/pr-01-plan-review`, one PR. Docs only.
**Goal:** the canonical docs and handoffs say what Vishnu decided on 2026-11-16, so later sessions build the right thing: two first-class clients on one backend, service-neutral, in the new order. Applies the answers to **Q1–Q31 and § 5** in `docs/plan-review/2026-11-16/DECISION-REGISTER.md`.
**Depends on:** AUD-06 merged and 01b merged (PR-01 edits some of the same files). It should merge before handoff 01 PR D2 starts, because it amends handoff 01.
**Read:** `CLAUDE.md`; `docs/plan-review/2026-11-16/README.md`, `DECISION-REGISTER.md` and `AMENDMENTS.md` in full; `docs/DECISIONS.md` (how decisions are recorded); `docs/audits/handoffs/AUD-07-approved-amendments.md` (the same kind of handoff, already run).

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## The rule for this handoff
Handoff tasks and acceptance criteria are fixed unless Vishnu approves a change. **Every change in `AMENDMENTS.md` rests on an answer in the register; nothing else was approved.** Move existing text word for word. Add only the wording given there. If an amendment doesn't fit the text you find, stop and ask. Don't adapt it.

## Canonical files
- **Reads:** the three packet files above.
- **Updates:** `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/COSTS.md`, `docs/EXTERNAL-SOURCES.md`, `docs/RECOMMENDATIONS.md`, `docs/README.md`, `docs/CONVENTIONS.md`, `CLAUDE.md`, root `README.md`; `docs/handoffs/01-foundations.md`, `03-architecture.md`, `04-profiles-privacy.md`, `05-diary-upgrade.md`, `06-album-song-pages.md`, `07-history-import.md`, `08-lists.md`, `09-social.md`, `10-library-recaps.md`, `11-discover.md`, `12-recommendations.md`, `13-badges.md`; `docs/plan-review/2026-11-16/README.md` (the one "superseded" line, last).
- **Creates:** `docs/handoffs/04a-privacy-schema.md`, `04b-profiles.md`, `04c-your-data-legal-safety.md`, `09a1-follow-home.md`, `09a2-interactions-notifications.md`, `09b-moderation.md`.
- **Never touches:** code, migrations, tests, `.github/`, `.claude/`, `AGENTS.md`, `docs/audits/`, `docs/handoffs/01b-harness.md`, `02*.md`, and the AUD handoffs.

## Starting-state checks
Stop and report if any of these is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; the branch was cut from `main` with AUD-06 and 01b merged.
3. `docs/DECISIONS.md` ends at D32. If later entries exist, number the new ones after the last and update every reference in the new text.
4. None of handoffs 03 to 13 has been started. If one has, stop and ask how to amend work in progress.
5. `docs/handoffs/04-profiles-privacy.md` still has tasks 1–12, and `09-social.md` still has 09a tasks 1–7 and 09b items 1–7.
6. In the register, every question from Q1 to Q31, and § 5, has an answer. If any "Answer:" line there is blank, stop and ask.
7. `CLAUDE.md` contains the rules 01b added. Count its lines, so AM-45 can keep it within 01b's target.

## Scope
**In:** amendments AM-01 to AM-95 in `AMENDMENTS.md`, each exactly as written. All of them are approved. None is skipped.
**Out (non-goals):** anything not in `AMENDMENTS.md`; `docs/CLIENT-CONTRACT.md`, `docs/IDENTITIES.md` and `docs/IMPORT-CONTRACT.md` (their own handoffs write them); phone-app rules for CLAUDE.md (register L10); any M1, M2 or direct-message handoff; code.

## Tasks
1. **`docs/DECISIONS.md`.** Add the status index (AM-01) after the opening paragraph. Append D33 to D41 (AM-02 to AM-09, then AM-95) after D32. Edit no earlier entry.
   - **Verify (proposed, not run):** `git diff main -- docs/DECISIONS.md` shows only added lines.
2. **`docs/ROADMAP.md`** (AM-10 to AM-15). Item 1's measurement list for the spike stays word for word.
   - **Verify (proposed, not run):** `git grep -n "DMs" docs/ROADMAP.md` prints nothing in item 6; item 9 exists.
3. **`docs/ARCHITECTURE.md`** (AM-16 to AM-22), **`docs/DESIGN.md`** (AM-23 to AM-25), **`docs/COSTS.md`** (AM-26 to AM-29), **`docs/RECOMMENDATIONS.md`** (AM-46 to AM-48).
4. **`docs/EXTERNAL-SOURCES.md`** (AM-30 to AM-38). Before writing each fact, re-open its source (public, read-only; ask before fetching). If a page has changed, write what it says now, with today's date, and note the difference in the PR. Keep every "unverified" label unless you verified the claim yourself in a primary source.
5. **Split handoff 04** (AM-61): create the three files, move each task's text word for word, give each its own branch name, "Depends on", tests and acceptance criteria as the table in AM-61 says, and turn `04-profiles-privacy.md` into an index. Then apply AM-62 to AM-66.
   - **Verify (proposed, not run):** every numbered task 1–12 of the old file appears in exactly one new file. Search each new file for the task's bold title.
6. **Split handoff 09** (AM-81): create the three files the same way, and turn `09-social.md` into an index. Then apply AM-82 to AM-85.
   - **Verify (proposed, not run):** 09a tasks 1–7 and 09b items 1–7 each appear in exactly one new file.
7. **The other handoffs:** 01 (AM-49 to AM-51), 03 (AM-53 to AM-60), 05 (AM-67 to AM-69), 06 (AM-70 to AM-72), 07 (AM-73 to AM-79), 08 (AM-80), 10 (AM-86, AM-87), 11 (AM-88 to AM-90), 12 (AM-91), 13 (AM-92 to AM-94). Mark each added sentence "(Added <today>, plan review Q…)", the way AUD-07 marked its additions.
8. **`docs/README.md`** (AM-39 to AM-43). In the run-order table, set this PR's own row to "Done (the PR that changed this table)". Replace `<date PR-01 merges>` with today's date.
9. **Root `README.md`** (AM-44) and **`docs/CONVENTIONS.md` + `CLAUDE.md`** (AM-45). The sentence is identical in both rule files.
10. **Mark the packet superseded.** Add at the top of `docs/plan-review/2026-11-16/README.md`: "Superseded by the canonical docs on <today> (this PR)." Change nothing else in the packet.

## Verify (proposed, not run)
From the repo root:
- `git diff --stat main` lists only the files named under "Canonical files". Anything else is out of scope.
- `git grep -n "Apple-first" docs/handoffs docs/ROADMAP.md docs/ARCHITECTURE.md docs/DESIGN.md` prints nothing. (`docs/DECISIONS.md` still contains it in D28 and D34, on purpose.)
- `git grep -n "for Spotify users" docs/handoffs docs/README.md` prints nothing.
- `git grep -n "personal-use\|personal project" -- README.md docs/COSTS.md docs/EXTERNAL-SOURCES.md` prints nothing.
- `git grep -n "lastfm|ios" docs/ARCHITECTURE.md docs/handoffs` prints nothing.
- `git grep -n "Friends" docs/handoffs/06-album-song-pages.md docs/ARCHITECTURE.md` prints nothing.
- Every decision from D33 to D41 that a handoff mentions exists in `docs/DECISIONS.md`.
- `git grep -n "\*\*For you\*\*" docs/handoffs/11-discover.md` prints nothing.
- `npm run format:check` exits 0.

## Tests
None. Docs only.

## Stop and ask
- An amendment doesn't match the text it's meant to change.
- Moving a task between files would need rewording beyond what `AMENDMENTS.md` gives.
- A source page now contradicts an amendment.
- You think another change is needed. Propose it. Don't make it.
- Applying an amendment would take `CLAUDE.md` over the length 01b set.

## Rollback
Revert the PR. No code or data is involved.

## Acceptance criteria
- A session given only `04a-privacy-schema.md`, or only `09a1-follow-home.md`, can run it without opening the old combined file.
- Each applied amendment is present with the wording given, and cites its decision.
- `docs/DECISIONS.md` gained an index and nine entries, and no earlier entry changed.
- Negative: no task, test or criterion outside `AMENDMENTS.md` changed. A reviewer can confirm it by reading the diff against that file.
