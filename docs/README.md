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

## Order

| # | Handoff | Depends on |
|---|---|---|
| 00 | Windows setup | – |
| 01 | Foundations: tests, CI, migrations, environments | 00 |
| 02 | Bug fixes from the review, each with a regression test | 01 |
| 03 | App architecture and design system: real URLs, data layer, MusicBrainz limiter, Geist fonts, tokens, desktop layout | 02 |
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

**Decision gates (stop and confirm with Vishnu):**
- Before 03: `docs/IDENTITIES.md` (catalog IDs and stable links).
- Before 04: effective visibility, revocation and aggregate rules (D19, D24), plus the age policy.
- Before 05: the recommendation data rules and the privacy notice (D27).
- Before 07: `docs/IMPORT-CONTRACT.md` built from real redacted fixtures.
- Before 12: the data-volume check.

Use one branch per handoff, but split it into several PRs wherever parts deserve separate review. Merge all of a handoff's PRs before starting the next one in a fresh session.

## Starting a session
> Read docs/handoffs/NN-<name>.md, docs/ARCHITECTURE.md and CLAUDE.md. Use plan mode and show me the plan before writing code. Don't change anything outside the handoff's scope without asking.
