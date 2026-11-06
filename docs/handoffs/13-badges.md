# 13: Listening badges

**Branch:** `feat/badges`. 3 PRs:
- 13a: badge engine plus badges from log timing
- 13b: badges from the history import
- 13c: the optional Last.fm bridge for Spotify users

**Goal:** small badges next to reviews and on profiles that recognize being early: logging or playing an album on release day, or being among the first on earwrm to log an artist. Everything else in earwrm works without them.

**Depends on:** 05 (diary entries), 06 (full release dates), 07 (import evidence) and 09 (reviews shown to others).

**Read:** DECISIONS D28, and EXTERNAL-SOURCES → "Last.fm" and "Apple MediaPlayer".

## Rules that apply to every badge (round 6)
- **First Week** is a half-open interval: from release-day midnight to midnight 7 calendar days later, in the timezone stored on the badge. `created_at` must be at or after the release.
- **Full Album, Day One** uses the Release Day window. It needs qualifying evidence for every **eligible** track of the standard edition of the release group:
  - Bonus tracks from deluxe editions aren't required.
  - Tracks of 30 seconds or less are exempt (they can't be scrobbled).
  - The same recording appearing twice counts once.
  - It never claims every track was played to completion.
- **Early on earwrm:** uses each user's first qualifying log, breaks ties by `created_at` then entry ID, and the position is **permanent** once awarded.
- **Debut releases:** the artist's earliest release group of any type (single, EP, mixtape or album) with a day-precise date where they're the primary artist credit. If MusicBrainz data leaves it unclear (ties, no precise date), the badge isn't offered.
- **Called it:** store when the ≥ 4.5★ rating was first submitted and the baseline count of distinct logging users at that moment.
  - The baseline must be at least `CALLED_IT_MIN_BASELINE` (default 5).
  - Growth is counted in distinct eligible users, over an observation period of `CALLED_IT_WINDOW` (default 12 months).
- Bulk-logging Friday releases earns log-based badges. That's accepted, and the "logged" wording stays prominent.
- The onboarding badge card stays behind a feature flag until a play-evidence source works.

## Badges (v1)
| Badge | Rule | Source | Label wording |
|---|---|---|---|
| **Release Day** | the entry was *created* on the release **calendar date** in the user's stored timezone (midnight to midnight, half-open) | the log's server timestamp | "Logged on release day" |
| **Release Weekend** | entry created between release-day midnight and **48 h after the end of release day**, which covers Friday drops rolling out by time zone. A user with Release Day also gets this | log timestamp | "Logged release weekend" |
| **First Week** | entry created within 7 days of release | log timestamp | "Logged in week one" |
| **Full Album, Day One** | every track of the matched edition played inside the release-day window | import evidence (13b), Last.fm (13c) or the iPhone scan (iOS app) | "Played in full on release day", with a source icon |
| **Early on earwrm** | among the first `EARLY_N` (default 50) distinct users on earwrm to log the album or artist. **Logs at every visibility count** (owner decision). The badge only shows where that entry is visible to the viewer | earwrm's own data | "Early on earwrm" |
| **OG** | logged the artist's **first release of any type** (single, EP, mixtape or album) within its first week | log timestamp | "OG" |
| **Called it** | rated 4.5★ or higher before the album's earwrm log count grew 10× (named constants) | earwrm data, computed later | "Called it" |

- **Never call a badge "verified" or say "listened" unless it's backed by play data.** Badges from logs say "logged". Badges from plays say "played" and show where the data came from.
- Time-window badges only apply when the release date is known to the **day** (`release_date_precision = day`).
- Badges follow the visibility of the entry or review they're attached to. Users can hide badges, per badge or all of them, in Settings → Profile.

## 13a: Engine and log-timing badges
- Tables: `badges(id, user_id, kind, target_type, target_mbid, source log|import|lastfm|ios, evidence jsonb, awarded_at, hidden)`, unique per (user, kind, target).
- Badges are awarded by a SQL function triggered on entry insert. Batch jobs handle "Early on earwrm" and "Called it".
- Badges are computed again if a release date gets corrected. If a corrected date means someone no longer qualifies, the badge is removed quietly.
- UI: a small badge chip next to the review, and a "Badges" row on profiles, in DESIGN.md style. Mono for dates, with a tooltip saying exactly what it means.

## 13b: Badges from the history import
- In 07's matching step, check each confirmed session against the album's release window, using the session window and matched edition that 07 already keeps as evidence.
- Award "Full Album, Day One" with `source = import` and the session window as evidence.
- The label shows "from listening history" (the file is user-supplied, so it's never called verified).

## 13c: The optional Last.fm bridge (for Spotify users)
- **When it shows up:** during onboarding (handoff 04) users pick their main service: Apple Music, Spotify or Other, stored as `profiles.main_service`.
  - **Spotify** users see an optional card: *"Want listening badges? Link Spotify to Last.fm, then connect Last.fm here. Takes about 2 minutes."* It has a short guide and a Skip button. Skipping changes nothing else.
  - **Apple Music** users on the web see: *"Listening badges for Apple Music come with the earwrm iPhone app."*
  - Users can change all of this later in Settings → Connected services.
- **Flow:** Last.fm web auth (one click, session key kept in Vault).
  - When a user logs an album that's eligible for a badge, fetch their scrobbles **for that album's release window only**, using `user.getRecentTracks` with `from` and `to` (UTC Unix seconds, verified), paging up to 200 per page. Ignore now-playing records and test the exact boundary behavior. Prove the user owns the account through web auth before awarding anything.
  - Award the badge, then **throw away the raw scrobbles**. Store only the badge plus minimal evidence (the play window and track count).
  - Never store anyone's general scrobble history. This keeps earwrm far below Last.fm's 100 MB usage cap.
- **Terms gate:** Last.fm's API is non-commercial only. This PR ships behind the `lastfm_badges` feature flag. It can only be on while earwrm is non-commercial, or once Last.fm has given written permission. Add the "powered by AudioScrobbler" attribution the terms require.

## Tests
- **Unit:** release-window math (time zones, the Release Day calendar date vs the Release Weekend 48 h window, partial dates excluded), each badge rule, the label wording.
- **pgTAP:** badge visibility follows the entry; recompute after a date correction; the unique constraint; hidden badges stay hidden everywhere.
- **Integration (13c):** mocked Last.fm responses. Only windowed requests are made, and no raw scrobbles are left afterward.
- **E2E:** log on release day → badge appears on the review; import with a release-day session → "played" badge; Spotify onboarding card → skip → everything still works.
