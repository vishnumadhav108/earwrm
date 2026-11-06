# 07: Listening history import (optional): suggested past listens for you to confirm

**Branch:** `feat/history-import`. Use 3 PRs:
- 07a: parsers, the browser-side allowlist, upload
- 07b: sessions, matching, proposals
- 07c: review screen, confirmation, undo, the post-import rating flow

**Goal:** someone with years of listening history uploads their own export once. earwrm **suggests** past album listens, shows the evidence behind each one, and the user confirms them, in bulk if they want. Nothing goes into the diary until the user confirms it. It's optional and never required at signup (DECISIONS D1, D16).

**Depends on:** 05 (diary entries with `source`, editions on entries) and 06a (the enrichment worker, the background MusicBrainz lane, editions).

**Read:** DECISIONS D3, D9, D16 and D21, and EXTERNAL-SOURCES → "Listening history exports".

## Before writing code: the import contract
Write `docs/IMPORT-CONTRACT.md` using **real, redacted fixture files**, one per supported format, committed under `tests/fixtures/import/` with personal fields replaced. It covers:
- **Fields:** the exact fields per format, and which ones are allowlisted for upload.
- **Timestamps:** what each one means. Spotify documents the time a stream **ended** (UTC), not when it started. Estimate the start as end minus ms played, and label it as an estimate.
- **Apple:** whether the export has event-level play activity, daily per-track summaries, or both. If both, use the events and never add the summaries on top as extra plays.
- **Precision:** a date-only source, such as a CSV without times, stays at date precision.
- **Edge cases the contract must define, each with expected behavior and a fixture:**
  | Case | Expected |
  |---|---|
  | The same 10-track album played twice back to back, with no gap | In "every session" mode, propose **two** listens when the play order shows a restart (track 1 again after the last track). If it's ambiguous, propose one editable candidate |
  | Six tracks from an album mixed in with unrelated playlist tracks | A session's tolerance for unrelated plays in between is a named constant. Above it, there's no album suggestion. Interleaved plays must not look like a deliberate album listen |
  | A date-only CSV with 6 matching tracks | A **day-level** suggestion. Timing and session count stay unknown. Show minutes only when the file supports them, and label them as summed playback, not elapsed time |
  | A 4-track release; a 1-track single | Required tracks = `ceil(0.60 × eligible tracks)`. Releases with 3 or fewer tracks need all of them. A bulk-confirm filter **excludes singles by default** |
  | Overlapping exports; retrying with a different timezone or threshold; a retry after a partial failure | Confirmed sessions get a user-scoped identity (album + edition + session window). It's unique when confirmed, so retries never create duplicate entries or double-count aggregates. Identical date-only rows stay ambiguous rather than being guessed |
  | Undo after "keep listening stats" was on | Undo removes that batch's contributions to plays, minutes and earliest dates. Per-batch accounting makes this exact. Test it with two overlapping batches, deleting the one that holds the earliest play |
- A **service track ID** identifies the source's track, not a MusicBrainz edition. Only use an edition-specific total ("of 10 tracks") when there's real edition evidence, such as a matching track list. Otherwise use the default edition and mark the match lower-confidence.
- If a format can't support a reliable suggestion, leave it out of v1 and explain why in the PR.

## How it works for the user
1. **Where it lives:** Settings → Import listening history, plus an optional, skippable last step of onboarding. A short guide explains how to request each export. Show the delivery time the provider states, checked during the contract step. You can set an in-app reminder.
2. **Privacy before upload:** before anything is uploaded, show one screen: "Your original file stays on your device. We send only artist, album, track, time and duration for each play, and keep them on our servers for up to 7 days to find matches. After that, only the diary entries you confirm are kept, plus optional summary stats if you turn them on. Your import is **private** by default." Link to the privacy notice, which has to be published before this feature ships (handoff 04).
3. **Parsing on the device:** a Web Worker unzips and parses the file with an **allowlist** of fields. Every other field, including IP address, user agent, username, country and device, is dropped in the browser. These fields never reach the server or error reporting.
   - **Hard limits:** maximum archive size, maximum expanded size, maximum row count and maximum processing time. Each limit is a named constant with a friendly error message.
   - Show progress, with pause and resume.
4. **Review screen:** "We found 1,240 possible album listens".
   - Each suggestion shows the cover, the matched **edition**, the date, and the evidence, for example "**7 of 10 tracks** · Mar 3, 2021 · 41 min".
   - Sort and filter by confidence, date and most played. Select or deselect in bulk.
   - **Mode:** "Earliest qualifying session in this file" (the default) or "Every qualifying session". The copy never claims it's your first-ever listen.
   - **Threshold controls:** a minimum share of the edition's tracks (default 60%), with a short-release rule. A release with 3 or fewer tracks qualifies when every track was played.
   - **Unresolved:** matches the system isn't sure about are listed separately. The user picks the right album or edition, or skips it.
   - **Overlap preview:** "38 of these overlap with your existing logs or a previous import". Those are skipped by default.
   - The "Keep imported entries private" toggle is **on** by default.
   - **"Keep listening stats from this file"** is **off** by default. When it's on, earwrm stores only aggregated counts (plays and minutes per album, artist and month, plus the earliest play date per album and artist) in `import_listening_stats`, which only the owner can read, with a per-batch breakdown so undo is exact. Play-level rows are never kept past the staging window.
5. **Confirm:** a "Log N albums" button. The entries are created unrated, with `source = 'import:<service>'`, a `batch_id` and minimal evidence (track count, matched edition, session window). That evidence is kept **permanently** with the entry, along with **minimal per-track qualifying evidence** (recording MBID plus the play-end time for each qualifying track in the session). Full Album Day One badges (13b) need it to prove coverage and to recompute eligibility. Disclose this retention on the import privacy screen and in the privacy notice. They're never posted to followers' feeds one by one (09).
6. **Rate your imports:** an optional flow showing one cover at a time, most played first. Tap stars or skip. It saves as you go.
7. **Undo:** Settings → Imports lists each batch with "Undo import".
   - The confirmation says exactly what will be removed.
   - Entries the user has since **edited** (added a rating or review, changed the date) are kept by default, and the user can include them in the undo if they want.
   - Current ratings the user set themselves are never removed.

## 07a: Parsers, allowlist, upload
- Pure TypeScript parsers in `src/lib/import/`:
  - Spotify Extended Streaming History, plus the plain past-year Streaming History file
  - Apple Music play activity, if the contract confirms it's usable
  - a generic CSV with column mapping, at date or time precision
- Skip podcasts and episodes. Skip plays shorter than a minimum (a named constant), using `ms_played` when it's there.
- Upload goes through a route handler in chunks, validated against a zod schema that contains **only** the allowlisted fields. The server rejects any other field. Rate-limit per user.
- **Temporary storage:** `import_staging(batch_id, user_id, row_hash, played_end_at, ms_played, track, artist, album, service_track_id)`. Only the owner can read it. Each row expires (default 7 days) and is **deleted** after confirmation, cancellation or expiry. A cleanup job handles expiry.
- **Idempotency:** `row_hash` is unique per user, so re-uploading the same or overlapping files adds no new rows.

## 07b: Sessions, matching, proposals
1. **Sessions first:** group consecutive or nearby plays (gap ≤ a named constant) into sessions **before** assigning a local date. The user chooses the timezone, which defaults to their profile timezone. A session that crosses midnight takes the date it started.
2. **Matching:**
   - Use an exact service ID or MBID when one is present.
   - Otherwise combine artist, album and track names with edition evidence. A track list that matches the standard edition picks the standard edition.
   - Ambiguous matches stay unresolved. The system never guesses.
   - Matching runs on distinct (artist, album) pairs, not on each play.
   - A shared cache, `album_name_matches`, stores **only system-verified** exact matches, plus negative results (no match). A user's manual pick goes into a **per-user** override table, never into the shared cache.
   - Collapse duplicate in-flight lookups. Batches have resumable checkpoints.
3. **Budget and progress:** at about 1 request per second, 3,000 uncached lookups take at least about 50 minutes. Show the estimated time and let the user leave the page and get notified when it's done.
   - The MusicBrainz queue policy (D9, revised) gives imports a guaranteed minimum share, so they always finish, while interactive search stays fast.
   - Track oldest-import age, cache-hit rate and requests per successful match.
4. **Qualifying listens:** count the **distinct tracks of the matched edition** played in a session, ignoring obvious skips when there's duration data. Apply the threshold and the short-release rule. Proposals are computed in SQL and written as `import_proposals`. **Nothing is written to `diary_entries` until confirmation.**
5. **Kill switch:** an `imports_enabled` flag turns off upload and matching without affecting manual logging.

## 07c: UI and confirmation
- The screens described above. Confirming runs in one transaction and creates the entries, plus one optional feed summary that's off by default.
- **Library (handoff 10)** reads confirmed entries, plus `import_listening_stats` only if the user turned on "keep listening stats". Raw staging rows are always gone after confirmation.

## Tests
- **Unit:** each parser against the redacted fixtures; the allowlist (a test asserts that the upload payload has no forbidden keys); session grouping across midnight and timezones; the edition threshold, the short-release rule and skip filtering; the two modes; date-only precision.
- **pgTAP:** staging is only readable by the owner and expires; re-uploading creates zero duplicates; the overlap rules against manual entries; undo removes exactly the unedited entries from the batch, and edited entries survive unless the user includes them; user overrides never touch the shared cache.
- **E2E:** upload the sample → review evidence → resolve an ambiguous match → confirm → rate 3 → undo → the diary goes back to how it was, except the edited entries.
- **Error-reporting test:** a forced parser error sent to Sentry contains no row data, file names or field values.

## Acceptance criteria
- A 100k-row Spotify history parses on a mid-range phone without freezing the UI. Report the time in the PR.
- No identifying fields leave the device.
- Staging rows are gone after confirmation, cancellation or expiry.
- Undo behaves exactly as described above.
