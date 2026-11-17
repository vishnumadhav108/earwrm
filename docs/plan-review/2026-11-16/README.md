# Plan review, 2026-11-16

> **Non-authoritative.** This folder is a review packet. It changes nothing. The plan is still `docs/README.md` ("Run order from here"), `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` and the handoffs. Where this packet and those files differ, those files win.

| | |
|---|---|
| **Reviewed commit** | `main` @ `5ce209c`, clean tree |
| **Document approval** | Approved by Vishnu in chat, 2026-11-16, with answers to Q1–Q31 and § 5 (recorded in `DECISION-REGISTER.md`) |
| **Execution approval** | **None.** Approving this packet adopted nothing and approved no handoff. `handoffs/PR-01-adopt-amendments.md` and `handoffs/S-1-iphone-scan-spike.md` each need their own go-ahead before a session runs them |
| **Open questions** | None. Q30 and Q31 (found while writing the packet) and the § 5 confirmation of nine unasked proposals were answered on 2026-11-16. Later decisions, by gate, are in the register's § 4 |
| **After adoption** | When PR-01 has merged, add one line at the top of this file: "Superseded by the canonical docs on <date> (PR #<n>)." Keep the folder as a record, like `docs/audits/`. Never edit it again after that |

## What this is

The 2026-11-16 audit looked at current state and risk. This review looks forward. For each remaining piece of work it asks whether there is a better way to reach the founder's goal (quoted in full in the register): a long-term, high-quality "Letterboxd for music" with two first-class clients on one backend, phone apps and a website, that works equally for Apple Music, Spotify and other listeners, at $0 until the founder chooses to upgrade.

| File | What it holds |
|---|---|
| `DECISION-REGISTER.md` | The goal, the interview answers, and every decision with its options, recommendation and answer |
| `AMENDMENTS.md` | The exact proposed text, grouped by the canonical file it would change. None is applied |
| `TABLES.md` | Capability traceability, the evidence plan, risks, and the execution map with its two gates |
| `handoffs/PR-01-adopt-amendments.md` | Draft handoff, docs only: applies the approved amendments |
| `handoffs/S-1-iphone-scan-spike.md` | Draft handoff: the iPhone scan spike that D28 and ROADMAP already call for |

## What the review found

**The core product is already service-neutral.** The catalog is MusicBrainz, so logging, rating, reviewing, lists, follows and discovery work the same for everyone. The Apple-first parts are confined to play-evidence badges (D28) and a few sentences elsewhere. `AMENDMENTS.md` lists each place.

**The backend is not yet ready for a second client.** D13 promises a data layer a phone app can reuse. Today every route handler authenticates by cookie only, the proxy redirects unauthenticated API calls to the login page, and handoff 03 would build the data layer as React hooks inside the web app. A short client contract in handoff 03 fixes this before it costs anything.

**The plan's order delays evidence.** Follows and the feed sat after import and lists, and the phone app sat after everything. The approved changes put a slim follow-and-feed slice before the first friend invite, and start the phone app after handoff 06, in parallel with the remaining web work.

**Safety work moves earlier.** The first public user content appears in handoff 04, but reporting and removal arrived in 08. They now arrive with 04.

**Some planned work cannot pay off yet.** Bandit and propensity logging, play-evidence badges, per-timezone recap scheduling and uploading every play row for the import are deferred, made conditional or simplified.

**Six things are faster or more reliable without cutting architecture, privacy or safety:** run 01b now; start long-lead founder actions now (data exports, the scan spike, a tester list); a slim social slice before the first invite; the phone app after 06; defer instrumentation that needs data that does not exist; simplify the import and recaps.

**$0 holds until the first invite.** The first cost is a domain, needed for auth email. Distributing the phone apps is not free. `AMENDMENTS.md` § COSTS has the trigger for every dependency.

**Monetization is undecided, so no margin model is included.** The commercial blockers are listed in the COSTS amendment.

## What happens next

Nothing, until the founder says so. The proposed order is in `TABLES.md` § 4. In short:

1. AUD-03, AUD-04, AUD-05, AUD-06 (existing, unchanged), 01b, and the founder actions F-5, F-6, F-7 and S-1 can run now, in parallel. PR-01 runs after AUD-06 and 01b have merged, because it edits some of the same files.
2. Then handoff 01 PR D2, staging, AUD-01, AUD-02, AUD-08, 02a–02d, as in the current run order.
3. Then 03, 04a–c, 05, 06, 09a-1, and the **First invite** gate.

## Research and its limits

External facts were read on 2026-11-16. Each one in `AMENDMENTS.md` § EXTERNAL-SOURCES carries its source, or the word "unverified". The founder approved public, read-only web research on 2026-11-16. No query or request contained the project's name, the founder's details or any repository content.

**Could not be confirmed in a primary source, and so marked unverified:**
- The EDPB's own guidance on territorial scope and on legitimate interests (the PDFs could not be read).
- Whether the UK representative duty changed under the Data (Use and Access) Act 2025.
- Ofcom's statement of what the UK Online Safety Act requires of a small service (Ofcom's pages refused the reader; law-firm summaries were used).
- Apple's capability matrix for free accounts, the Apple Developer Program's price on Apple's own page, and the exact text of App Review guidelines 4.2, 4.8 and 5.1.1(v).
- What Apple's play-history interfaces return (developer-forum reports only).
- ListenBrainz's data licence and service connections (its own pages did not render).
- Whether mail providers require a sending domain you own.
- Everything about comparable apps (two vendor blogs; opinion).

Nothing here is legal advice.

## Care taken because this repository is public

- No detail of any unresolved security issue. Finding A-002 is referred to only by the audit's own safe summary and its tracking ID, `AUD-SEC-1`.
- No email address. The founder's country is recorded; the state is left out.
- No secret, key or environment value was read. No `.env*` file was opened.
