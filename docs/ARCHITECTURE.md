# earwrm architecture

This is the target architecture that handoffs 01–12 build toward. The reasons behind each choice are in DECISIONS.md.

## 1. System overview

```
 Browser / PWA (Next.js on Vercel)                  Future: iOS / Android app
        │  typed data layer (src/data)                       │
        ▼                                                    ▼
 Next.js route handlers (/api/*) ─────────────────►  Supabase
   - search, album/song detail (cached)                ├─ Postgres: RLS on everything, stats tables, SQL functions
   - account, auth callbacks                           ├─ Auth
   - link submission, history import upload            ├─ Storage: avatars, banners, list covers, recap images
                                                       ├─ Realtime: notifications, feed
                                                       └─ Edge Functions ◄── Cron + Queues
                                                            - enrich albums/songs (tracklist, blurb)
                                                            - critic scores (Wikidata P444)
                                                            - match imported history to albums
                                                            - recompute stats, build recaps
                                                            - recs phase 1 (SQL CF, nightly)
                                                     Python recs service (12) ──► reads replica, writes recommendations / item_neighbors / pgvector embeddings
                                                            │
                                 MusicBrainz · Cover Art Archive · Wikidata · Wikipedia
```

## 2. Environments
| Env | Web | Database |
|---|---|---|
| local | `npm run dev` | `supabase start` (Docker) |
| preview | Vercel preview for each PR | `earwrm-staging` Supabase project |
| production | earwrm-xi.vercel.app | `earwrm` Supabase project |

Migrations live in `supabase/migrations/`. Running `supabase db reset` locally applies them. When a PR merges, a GitHub Action applies them to staging automatically. Production is updated by hand with `supabase db push`.

## 3. Repo layout (after handoff 03)
```
src/
  app/
    (app)/                  signed-in shell: home/feed, diary, library, discover, settings/import
    album/[mbid]/  song/[mbid]/  artist/[mbid]/
    list/[id]/  u/[username]/  u/[username]/entry/[id]/  recap/[id]/
    api/
  features/<feature>/       diary, album, song, import, lists, social, library, recaps, discover, profile, search
  data/                     typed queries and mutations; the only code that talks to Supabase
  lib/                      pure utilities (musicbrainz, dates, gestures, theme, import parsers)
  components/ui/            shared primitives (+ charts/)
supabase/  migrations/  functions/  tests/  seed/
tests/     unit/  e2e/
docs/
```

## 4. Data model (target)

**4a. Identities** (full rules in `docs/IDENTITIES.md`, handoff 03)
- Album = release group. Edition = release. Song = recording MBID.
- Diary entries and reviews use stable UUIDs.
- Users are UUIDs. Usernames can change, and old ones redirect.
- `mbid_redirects` handles MusicBrainz merges.

**Catalog**
- `artists(mbid pk, name, sort_name, type, area, life_span, wikidata_qid, blurb, blurb_source, blurb_license, image_source cover_collage|apple_music|commons, image_url, image_license, enriched_at)`
- `release_groups(mbid pk, title, artist_credit, year, release_date date null, release_date_precision day|month|year, type, initials, c1, c2, canonical_release_mbid, label, blurb, enriched_at)`. This is today's `releases` table, renamed, with a compatibility view kept during the migration.
- `recordings(mbid pk, title, artist_credit, length_ms, isrcs text[], enriched_at)`
- `release_group_tracks(release_group_mbid, position, disc, recording_mbid, title)`, taken from the canonical release

**Diary and ratings (05)**
- `diary_entries(id, user_id, target_type album|song, target_mbid, release_mbid null, recording_mbid null, listened_on date, rating numeric(2,1) null, review text null, liked bool, is_relisten bool, contains_spoilers bool, tags text[], source text default 'manual', created_at, updated_at, deleted_at)`
- `ratings(user_id, target_type, target_mbid, rating, updated_at)`: your current rating, primary key on the first three columns. The rules for how it interacts with entries are in handoff 05. Public aggregates count only public current ratings (D19).
- `interaction_events(user_id, kind, target, surface, rec_id, model_version, visibility_at_write, created_at)`: from 05 onward. `rec_decisions(decision_id, user_id, slot, eligible_candidates, chosen, probability, conditional_probs, policy_version, decided_at)` and `rec_impressions(impression_id, decision_id, user_id, target, shelf, position, surface, model_version, policy, propensity, shown_at)`: from 11 onward
- `favorite_tracks(user_id, release_group_mbid, recording_mbid)`
- The existing `queue`, `likes` and `favorites` tables become target-typed, so they work for both albums and songs.

**History import (07)**
- `import_batches(id, user_id, service, row_count, status, created_at)`
- `import_staging(...)`: allowlisted fields only, owner-only, **temporary**. Deleted after confirmation, cancellation or 7 days.
- `import_proposals(batch_id, release_group_mbid, release_mbid, session_start, session_end, tracks_matched, tracks_total, confidence, status)`
- `album_name_matches(artist_norm, album_norm, release_group_mbid, confidence)`: **system-verified matches and negative results only**, shared. `user_match_overrides` holds each user's own manual picks.
- `import_listening_stats(user_id, batch_id, period, artist, release_group_mbid, plays, ms, first_played_on)`: aggregates only, owner-only, opt-in
- Diary entries created by an import have `source = 'import:<service>'`, a `batch_id` and minimal evidence. They're private by default.

**Badges (13)**
- `badges(id, user_id, kind, target_type, target_mbid, source log|import|lastfm|ios, evidence jsonb, awarded_at, hidden)`
- `profiles.main_service apple_music|spotify|other`, plus a Last.fm connection (session key in Vault) only if the user opts in

**Lists (08)**
- `lists(id, owner, title, description, ranked bool, visibility, cover_path, tags, created_at, updated_at, deleted_at)`
- `list_items(list_id, target_type, target_mbid, position, note)`
- `list_likes`, `list_follows` (get notified when a list you follow changes), `list_comments`, `list_clones(source_list_id, new_list_id)`

**Artist follows and alerts (09)**
- `artist_follows(user_id, artist_mbid, created_at)`
- `release_alerts(user_id, release_group_mbid, status pending|seen|listened|queued|dismissed, created_at)`

**Social (09)**
- `follows(follower, followee, status accepted|pending)` and `blocks(blocker, blocked)`: **created in 04** together with the access rules. `pending` is used only for private accounts, and it grants nothing.
- `likes_on(user_id, object_type review|list|comment, object_id)`
- `comments(id, user_id, object_type review|list, object_id, body, created_at, deleted_at)`
- `notifications(id, user_id, kind, actor, object_type, object_id, read_at)`
- `reports(id, reporter, object_type, object_id, reason, status)`
- `activity` view: follows' entries, reviews, list creations and updates, likes

**Album and song pages (06)**
- `target_stats(target_type, target_mbid, avg_rating, rating_count, histogram int[10], log_count, review_count, like_count, queue_count, updated_at)`
- `track_stats`: the same thing per recording, for the stars shown on tracklists. It can be the same table with `target_type = 'song'`.
- `critic_scores(release_group_mbid, publication, publication_qid, score_text, score_normalized numeric(4,1) null, review_url, source 'wikidata'|'musicbrainz'|'user', fetched_at)`

**Identity and privacy (04)**
- `profiles`: today's columns plus bio, avatar_path, banner_path, accent, links, showcase, timezone and private_account
- `privacy(user_id, profile, diary, lists_default, activity)`, each one a `visibility`

**Recaps (10)**
- `recaps(user_id, period, period_start, data jsonb, image_path, visibility)`

**Recommendations (11–12, see RECOMMENDATIONS.md)**
- `item_neighbors(target, neighbor, score, source)`
- `user_taste(user_id, centered_mean, genre_vector, ...)`
- `item_embeddings(target, embedding vector)` (pgvector)
- `recommendations(user_id, target, score, reason jsonb, model_version, generated_at)`
- `eval_runs`

**Platform (01)**
- `feature_flags(key, enabled, rollout)`: kill switches for imports, enrichment and recommendations

## 5. Album page (06): sections, in order
1. **Header:** a blurred cover backdrop (DESIGN.md), the cover, the title in Geist Serif, artist (links to the artist page), year, type, label, track count, blurb (credited to Wikipedia), and the action button (log, rate, like, queue, add to list, share).
2. **Ratings:** earwrm average, star histogram, and counts of logs, reviews and likes.
3. **Critic scores:** a row of chips like "Pitchfork 9.0". Each chip opens the review in a new tab. The section is hidden when there are none.
4. **Friends:** avatars of people you follow who logged it, with their ratings, plus "3 friends have it queued".
5. **Your history:** every time you've logged it (date, rating, review, re-listen marker) and how your rating changed. Hidden if you've never logged it.
6. **Tracklist:** each row shows track number, title, length, the earwrm average star rating, and your rating if you've rated it. Tapping a track opens the song page. Long-pressing gives a quick-rate option.
7. **Reviews:** popular, recent and from friends, with likes and comments.
8. **Lists:** popular lists that include this album.

(Videos are postponed. See ROADMAP.)

The **song page** has the same sections, scoped to the song. Its header shows which album it's from (with a link). Song pages have no tracklist section.

## 6. Enrichment pipeline (D7)
```
page view / log / search hit ──► enqueue(target)  ──► worker ──► MusicBrainz (low-priority lane)
import batch (distinct artist+album) ──┘                 ├─► Wikidata P444 → critic_scores
                                                         ├─► MusicBrainz url-rels → review links
                                                         ├─► name → release-group matching (imports)
                                                         └─► Wikipedia blurb
```
- Results are cached with `fetched_at`. Stale entries are refreshed in the background.
- **MusicBrainz queue policy (D9, D21):** interactive requests come first, but background work (enrichment, import matching) keeps a guaranteed minimum share so it always finishes. Cache negative results, collapse duplicate requests already in flight, and checkpoint imports so they can resume.
- **Metrics:** search p95 latency, oldest pending import, cache-hit rate, MusicBrainz requests per successful match. These decide when a local index or mirror is worth it.

## 7. Privacy model
| Item | Options | Default |
|---|---|---|
| Profile page | public / followers / private | public |
| Diary and reviews | public / followers / private | public |
| Each list | public / followers / private (set per list) | public |
| Activity in others' feeds | on / off | on |
| Private account (follows need approval) | on / off | off |
| Artists you follow | follow the profile visibility setting. Public follower counts on artist pages count only effectively public follows | follows profile |
| Imported staging rows (07) | always owner-only, temporary | owner-only |
| Diary entries created by an import | private, or following the diary setting | **private** |
| Recommendations | no user settings (D25). Activity and review text at any visibility train shared models. Private text is used only for recommendation scoring, as album-level blends, with no quotes, extracted descriptors, summaries or attribution displayed (D27 §12). Support is k = 5 distinct contributors per item and per pair. Attribution and blocks are checked at read time (D27). Public stats stay public-only (D19). An admin `exclude_from_shared` flag handles objections | – |

- Blocking removes all visibility in both directions.
- **Public aggregates** (averages, histograms, counts, Discover) count only *effectively public* current ratings, meaning a public rating on a non-private account (D19). What feeds shared recommendation models is set by D27.
- **Realtime** only sends generic refresh signals. Content is always fetched through RLS (D24).
- pgTAP tests cover every setting against every kind of viewer: owner, follower, pending follower, stranger, blocked user and anon.

## 8. Quality bar
- The visuals follow DESIGN.md. Components use only tokens and primitives.
- CI on every PR: typecheck, lint, unit tests, pgTAP, e2e (Playwright against `/demo` and local Supabase) and the build. Nothing merges while CI is red.
- An album page renders from cache in under 1 s on a mid-range phone. No page load waits on MusicBrainz or Wikidata.
- Every SQL function a screen depends on runs in under 150 ms on the scale seed (10k users, 1M diary entries).
- Errors go to Sentry. Only user ID, route, error type, stack trace and release are allowed, scrubbed in `beforeSend`, and a test enforces it.
- Every risky subsystem (imports, enrichment, recommendations) has a kill switch in `feature_flags`.
- `docs/RUNBOOK.md` covers database restore (drilled in 01), Storage recovery (04), and how to turn off each subsystem.
