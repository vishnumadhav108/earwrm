# earwrm specs

**earwrm is Letterboxd for music.** You log albums and songs, rate them, write reviews, build lists, and follow people with good taste. Everything in it is something a user chose to log, so there's no automatic listening tracking. People who want to can upload their listening history once to fill their diary right away (handoff 07).

Copy this folder into the repo as `docs/`. Claude Code works from these files.

| File | What it's for |
|---|---|
| `ARCHITECTURE.md` | How the system fits together: data model, pages, enrichment jobs, privacy |
| `DECISIONS.md` | Why it's built this way. Read this before changing anything big |
| `EXTERNAL-SOURCES.md` | What MusicBrainz, Cover Art Archive, Wikidata and Wikipedia allow, plus what's inside the listening-history exports, with sources |
| `DESIGN.md` | The visual system: clean and dark, Geist Serif display with Geist Sans and Mono, tokens, layout, components. Inspired by the current app, Vercel and Letterboxd |
| `RECOMMENDATIONS.md` | The recommendation engine: data sources and licenses, privacy rules, the taste profile, candidates → ranking → re-ranking, evaluation |
| `COSTS.md` | Billing safety: free-plan rules, spend caps, which add-ons bill even with the cap on, design choices that keep usage low, staying portable |
| `CONVENTIONS.md` | Coding, testing and PR rules. Handoff 01 copies it into `CLAUDE.md` |
| `ROADMAP.md` | What comes after these handoffs |
| `handoffs/` | One file per Claude Code session, in order |
| `audits/` | The 2026-11-16 audit and its handoffs, AUD-01 to AUD-08 |

## Order

| # | Handoff | Depends on |
|---|---|---|
| 00 | Windows setup | – |
| 01 | Foundations: tests, CI, migrations, environments | 00 |
| 02a | Bug fixes from the review: database and security (migration-only) | 01b, AUD-08 |
| 02b | Bug fixes from the review: store correctness | 02a applied in production |
| 02c | Bug fixes from the review: auth flows | 02b |
| 02d | Bug fixes from the review: gestures and UI | 02c |
| 03 | App architecture and design system: real URLs, data layer, MusicBrainz limiter, Geist fonts, tokens, desktop layout | 02a–02d |
| 04 | Profiles and privacy | 03 |
| 05 | Diary upgrade: re-listens, rating history, song ratings, fast logging | 04 |
| 06 | Album, song and artist pages: community ratings, friends, your history, tracklist with song ratings, critic scores, discography | 05 |
| 07 | Listening history import (optional upload, auto-logs past albums) | 05, 06 |
| 08 | Lists, Letterboxd-style | 05 |
| 09 | Social: follows (people and artists), new-release alerts, feed, likes, comments, notifications, moderation | 06, 08 |
| 10 | Library stats and recaps | 05 (uses 07 if present) |
| 11 | Discover + recommendations phase 1 (SQL collaborative filtering) | 06, 08, 09 |
| 12 | Recommendation service phase 2 (Python hybrid model + learning-to-rank) | 11 + enough data |
| 13 | Listening badges (Release Day, Release Weekend, First Week, Full Album Day One, Early on earwrm, OG, Called it) and an optional Last.fm bridge for Spotify users | 05, 06, 07, 09 |

Handoff 02 was split into 02a–02d on 2026-11-16; `handoffs/02-bug-fixes.md` is now the index of its items.

## Run order from here

Updated 2026-11-16, after the audit (`audits/AUDIT_2026-11-16.md`). Where this table and the audit's § 1 differ, this table wins. Update the Status column in the PR that completes a step.

- **F-n** are founder actions: Vishnu does them by hand.
- **AUD-nn** are audit handoffs in `audits/handoffs/`.

| # | Step | Status |
|---|---|---|
| 1 | 00 Windows setup; 01 Foundations PRs A–D1 | Done |
| 2 | Audit of 2026-11-16 (#25) | Done |
| 3 | F-1: `main` ruleset | Done. Active, with 5 required checks |
| 4 | F-2: production backup | Done 2026-11-16; encrypted copy stored. Repeat before every production migration and once a month |
| 5 | F-3: Dependabot triage | Done. Merged: #24, #21, #14, #13. Held: #20, #23, and #26 (Dependabot closed #22 and opened #26 for the same dev-tooling group) |
| 6 | F-4: Preview environment variables and deployments | Done 2026-11-16. Supabase variables are Production-only; all Preview deployments were deleted |
| 7 | F-5: rotate the Supabase service-role key | Open, to plan. The key was available to preview builds until 2026-11-16 |
| 8 | AUD-07: approved handoff amendments and the split of 02 | Done (the PR that added this table) |
| 9 | AUD-03 CI and tooling guardrails · AUD-04 preview guard target check · AUD-05 Wikipedia attribution · AUD-06 docs drift | Next. Independent of each other, so they can run in parallel |
| 10 | 01 PR D2: backup routine, restore drill, Sentry, billing docs, SMTP choice | Waiting. Choose the SMTP provider here, but don't enable it in production until AUD-01, AUD-02 and AUD-08 are applied there |
| 11 | Staging setup checklist (`STAGING.md`, Vishnu) | Waiting on AUD-03, AUD-04 and D2 |
| 12 | 01b Harness | Waiting on D2 |
| 13 | AUD-01 sign-up username collision → AUD-02 `releases` input constraints → AUD-08 server-only catalog writes | Waiting. Each production step needs a fresh backup first. AUD-01 may be pulled forward if sign-ups matter sooner |
| 14 | 02a → 02b → 02c → 02d | Waiting on 01b and AUD-08 |
| 15 | 03 → … → 13 | Waiting. Order as in the table above, decision gates as below |

**Decision gates (stop and confirm with Vishnu):**
- Before 03: `docs/IDENTITIES.md` (catalog IDs and stable links).
- Before 04: effective visibility, revocation and aggregate rules (D19, D24), plus the age policy.
- Before 05: the recommendation data rules and the privacy notice (D27).
- Before 07: `docs/IMPORT-CONTRACT.md` built from real redacted fixtures.
- Before 12: the data-volume check.

Use one branch per handoff, but split it into several PRs wherever parts deserve separate review. Merge all of a handoff's PRs before starting the next one in a fresh session.

## Starting a session
> Read docs/handoffs/NN-<name>.md, docs/ARCHITECTURE.md and CLAUDE.md. Use plan mode and show me the plan before writing code. Don't change anything outside the handoff's scope without asking.
