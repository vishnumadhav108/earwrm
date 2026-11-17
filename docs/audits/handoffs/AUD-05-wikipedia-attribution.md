# AUD-05: Wikipedia attribution on the release blurb

**Branch:** `fix/aud-05-wikipedia-credit`, one PR.
**Goal:** whenever earwrm shows a sentence taken from Wikipedia, it says so and links to the article. Fixes finding **A-008** in `docs/audits/AUDIT_2026-11-16.md`.
**Depends on:** nothing.
**Read:** `CLAUDE.md` (Code, Tests), `docs/EXTERNAL-SOURCES.md` § Wikidata / Wikipedia, `docs/DESIGN.md` (type and colour tokens), audit finding A-008.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `src/lib/musicbrainz.ts` (`blurbFor`, `getRelease`), `src/lib/types.ts` (`ReleaseDetail`), `src/components/screens/ReleaseScreen.tsx` (the blurb block, about lines 97–110), `src/lib/demo.ts`, `tests/e2e/fixtures.ts`, `tests/unit/lib/musicbrainz.test.ts`.
- **Updates:** the first three files above, `tests/e2e/fixtures.ts`, `tests/e2e/demo.spec.ts` (one assertion or one new test), `tests/unit/lib/musicbrainz.test.ts`, `docs/EXTERNAL-SOURCES.md` (the licence line you verify).

## Starting-state checks
Stop and report if any is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; branch cut from current `main`.
3. `ReleaseDetail` still has `blurb: string | null` and no source field, and `ReleaseScreen.tsx` still renders `detail.blurb` with no credit. If handoff 06b has already added stored source and licence, this handoff is done.
4. `blurbFor()` still resolves an English Wikipedia article title and fetches `…/api/rest_v1/page/summary/<title>`.
5. `npm test` passes before any change.

## Scope
**In:** carrying the article title and URL alongside the blurb, and showing a credit link.
**Out (non-goals):** storing blurbs in the database (06a); MusicBrainz or Cover Art Archive credits; restyling the release screen; changing `firstSentence` (handoff 02 item 17).

## Tasks
1. **Check the licence wording against the live source** (a public page; record the date). Wikipedia's reuse terms name the licence for article text. Write the verified name and link into `docs/EXTERNAL-SOURCES.md` § Wikidata / Wikipedia. If the page can't be read, label it unverified there and show only "From Wikipedia" with the article link.
2. **Failing tests first.**
   - Unit: with `fetch` mocked, `getRelease()` for a release that has a Wikipedia summary returns the blurb **and** a source with the article title and an `https://en.wikipedia.org/wiki/…` URL; a release without a summary returns neither.
   - E2E: add a source to the mocked release detail in `tests/e2e/fixtures.ts`; on `/demo`, opening a release shows a link named "From Wikipedia" whose `href` is that URL.
   - **Verify (proposed, not run):** repo root, `npm test`. Expected on `main`: the new unit test fails because no source is returned.
3. **Implement.**
   - `blurbFor()` returns the text together with `{ title, url }` for the article it actually read; `ReleaseDetail` gains a nullable `blurbSource`. Build the URL from the title with proper encoding; never from unvalidated upstream text.
   - `ReleaseScreen.tsx`: directly under the blurb, a small link "From Wikipedia" that opens the article in a new tab with `rel="noopener noreferrer"`. Use the tokens and sizes already used for meta text on this screen. No raw colours or new font sizes.
   - **A blurb with no source is not rendered.** That is the rule that keeps the credit from being dropped later.
   - **Verify (proposed, not run):** `npm test` exits 0; `npm run typecheck` and `npm run lint` exit 0.
4. **Demo mode.** If `src/lib/demo.ts` seeds blurbs, give each a source or remove the blurb, so the demo follows the same rule.
5. **Full check.** `npm run check` then `npm run test:e2e` (local stack running, Chromium installed). Expected: exit 0. Attach screenshots of the release screen at 390 px and 1440 px to the PR.

## Tests
As in task 2. Selectors by role and name, never by style.

## Stop and ask
- The credit doesn't fit the screen without a layout change.
- You want to add the credit to other screens or other sources.
- The licence page says something that changes what must be shown (for example a required licence link).

## Rollback
Revert the PR. The blurb returns without its credit, which re-opens A-008.

## Acceptance criteria
- A release with a Wikipedia sentence shows "From Wikipedia" linking to that article, on `/demo` and when signed in.
- A release without one shows neither the sentence nor the link.
- Negative: there is no code path that renders `blurb` when `blurbSource` is null (unit test on the mapping, e2e on the screen).
- The unit test fails on `main` and passes on the branch.
