# 05: Diary upgrade (re-listens, rating history, song ratings, fast logging)

**Branch:** `feat/diary-v2`. Two PRs: 05a covers the schema and migration, 05b covers the UI.
**Goal:** make the diary work the way Letterboxd does, and make logging fast.
**Read:** DECISIONS D3, D4, D6 and D20, and ARCHITECTURE §4 (Catalog, Diary and ratings) and §4a (Identities).

## Why
Today the `entries` table has a primary key of `(user_id, release_id)`, so each person can log an album only once. That rules out re-listens, rating history and first-listen dates, which were all in the original notes. Albums are also the only thing you can rate.

## 05a: Schema and data migration
1. Rename `releases` to `release_groups` and add the new columns, keeping a compatibility view during the migration. Add `recordings`, `release_group_tracks`, `artists`, `diary_entries`, `ratings` and `favorite_tracks` as described in ARCHITECTURE §4.
2. Migrate every existing `entries` row to one `diary_entries` row plus one `ratings` row, keeping `logged_on` as `listened_on`. Make `queue`, `likes` and `favorites` target-typed so they cover albums and songs. Write the migration so it can safely be run twice.
   - **Rehearse it:** run the migration against a fixture shaped like the prototype's data. Include reviews, unrated listens, favorites, queue items, list items, and dates near midnight.
   - **Verify** by comparing each fixture user's *visible* history before and after (the diary rendered as JSON), not just the row counts.
3. **How entries and the current rating interact.** These are product rules. Enforce them in SQL and test each one.

   | Action | Result |
   |---|---|
   | Log today with 4★ | Save 4★ on the entry. "Also set as my rating" is **checked by default** for a present-day log, and sets the current rating to 4★. |
   | Backdate a 2★ log from 2021 | Keep 2★ on that entry. The current rating is **unchanged** unless the user checks "Also set as my rating" (unchecked by default for backdated logs). |
   | Rate without logging (album page, tracklist stars, quick-rate) | Update the current rating only. **No diary entry is created.** |
   | Delete an entry | The current rating is never changed. Matching star values alone don't prove the entry set the rating, so clearing your current rating is a separate action on the album page. |
   | Edit an old log's stars | Only that entry changes, unless the user checks "Also set as my rating". |
   | Quick log, then Undo | Logging and the rating update happen in **one transaction** that records the previous current rating. Undo deletes the entry and restores the previous rating, **but only if the current rating hasn't been changed since**. If it has, Undo removes just the entry. |
   | Undo an import (07) | Ratings and reviews the user wrote themselves are kept. The confirmation lists what will be removed. |
   | Log the same album 5 times | 5 diary entries. Only the **current** rating counts toward the album average (06), as one vote. |

   - "Rating history" in the UI means **"Your past logs"**: the ratings stored on your past diary entries. We don't keep a separate log of every edit to your current rating.
   - `is_relisten` defaults to true when you already have an entry for the same target.
   - Store the edition context on an entry when it's known (`release_mbid` nullable, plus `recording_mbid` for song logs that come from a tracklist).
4. **`created_at` is set by the server and can never be edited.** A BEFORE INSERT trigger always sets it to `now()` and ignores any client value. UPDATE is revoked on that column. Both are tested. Backdating only changes `listened_on`. Badges (13) depend on this.
5. Tracklists: the enrichment job, or the existing release-detail fetch for now, writes `recordings` and `release_group_tracks` from the canonical release.
6. RLS: diary entries follow `privacy.diary` through `can_view`. The owner always has full access.

## 05b: UI
1. **Logging sheet** (it replaces the current rate screen and also opens from the action sheet):
   - date (defaults to today in your local timezone, and you can backdate it)
   - star rating (half stars, using the existing setting)
   - review (no fixed limit, but warn at 2,000 characters), plus a "contains spoilers" toggle
   - like, a re-listen toggle (pre-set automatically), and tags
   - "Save" keeps you where you are. Logging from search returns you to search.
2. **Quick log:** long-press any album or song anywhere, then tap 1–5 stars. That logs it today **and** sets your current rating, and the toast says both ("Logged today · rating set to 4★ · Undo"). Hold to set half stars. Undo follows the guarded rule in the table above.
3. **Diary tab:** entries grouped by month, newest first, with a re-listen icon, a review indicator, and filters for year, rating, albums/songs and tags. Edit or delete with swipe, using the existing gesture code.
4. **Song ratings:** each tracklist row has inline stars that set that song's **current rating** (keyed by recording MBID, no diary entry). Logging a song is a separate action. Add a "favorite track" heart. You can log a song without logging its album.
   - **Keyboard and screen-reader access:** quick-log, inline stars and drag-to-reorder all need a visible, keyboard-reachable alternative (a menu or arrow keys).
5. **Search:** results include songs (recordings) as well as albums, with type tabs All / Albums / Songs / Artists. Album results keep using the existing two-branch search, and songs get their own MusicBrainz recording search through the same limiter.
6. **Interaction events under D27, done before any collection:**
   - Record `interaction_events` for open, log, rate, like and queue add. Each row records `visibility_at_write`. Shared builds use these events under D27 (any visibility, distinct-contributor support of k = 5, review text only as album-level blends), and they re-check the admin exclude flag at build time.
   - **Before the first event is recorded**, the user sees the collection notice (D27 §7), at signup or as a one-time sheet for existing users.
   - **No user settings for this (D25).** Add an internal `profiles.exclude_from_shared` flag that only an admin can set and that every shared build respects.
   - Account deletion removes all of these too.
   - This handoff only records events. Impressions are added in 11.
7. **Demo mode:** seed data with re-listens, a rating that changed over time, song ratings and favorite tracks.

## Tests
- **pgTAP:** the migration keeps every row, the rating-history rules all hold, and RLS matches the privacy settings.
- **Unit:** the re-listen default, local-date handling, and the quick-log undo.
- **E2E:**
  - log an album twice and confirm the second entry is marked as a re-listen
  - backdate a 2★ log while the current rating is 4★, and confirm the current rating stays 4★ and "Your past logs" shows both
  - rate without logging, and confirm no diary entry is created
  - rate a song from the tracklist
  - **Going private:** Alice makes a public rating, list and review private. Right away, her attribution is gone everywhere, and the public histogram for that album updates or hides. Her rating, list and review text may still train shared models under D27, and nothing from them is shown or attributed. With the admin flag set, all of her shared training inputs are excluded.
- **Privacy copy:** the visibility picker shows the line "Private hides it from people. It still helps improve recommendations across earwrm, and it's never shown or credited to you."
  - **Exclusion (D27 §10):** set the admin flag on Alice. The next nightly build leaves her inputs out, and the check confirms it.
  - quick log, then undo, with three cases: rating restored; rating kept because it was edited after the log; entry-only undo
  - backdate an entry and confirm it sorts into the right month

## Acceptance criteria
- Existing users lose no data. Production row counts match before and after the migration, and the PR includes the query that proves it.
- Logging an album with a rating takes 3 taps or fewer from its page.
