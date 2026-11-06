# 06: Album and song pages

**Branch:** `feat/album-song-pages`. Use stacked PRs:
- 06a: stats and enrichment framework
- 06b: album page
- 06c: song page
- 06d: critic scores
- 06e: artist page

**Goal:** an album or song page has everything about that record in one place: earwrm ratings, friends, your own history, the tracklist with song ratings, reviews and critic scores. Videos are postponed (see ROADMAP).

**Read:** ARCHITECTURE §4–6, DECISIONS D4, D5, D7–D9, D19–D21 and D29, and EXTERNAL-SOURCES (MusicBrainz, Wikidata, CritiqueBrainz, critics, artist images).

## 06a: Stats and enrichment framework
- **What goes into public aggregates (D19):** only one **publicly visible current rating per user** (from `ratings`, not diary entries) counts toward the average, histogram and counts. Private and followers-only ratings are excluded, so nobody can work out a hidden rating by comparing the page before and after. The same rule applies to "hottest takes" (10) and Discover (11).
- **How averages are computed:** start with an indexed SQL query over `ratings`, filtered by visibility, and measure it on the scale seed. Only if that's too slow, add `target_stats` with integer star buckets, sum and count, updated in the same transaction as each rating change, plus a nightly reconciliation that flags any drift. Test changes to visibility, account deletion, rating edits and catalog merges.
- **Leak tests:** a private review or rating must be absent from the profile, album page, feed, search, recap image, OG preview and sitemap. Restricted pages use a generic OG preview. Share images that were already generated get revoked when visibility changes (delete the cached image and use new URLs).
- **Editions:** `/album/[mbid]` is a **release-group** route. Show a visible default edition (the earliest official release) with an edition switcher. The tracklist, track count and import completeness check (07) all use the selected or matched edition.
- **MBID merges:** MusicBrainz redirects merged MBIDs to the surviving entity (verified). Store an `mbid_redirects` table filled during enrichment. Routes and stored rows follow redirects, and a job re-keys rows that point at old IDs.
- Build an enrichment worker on Supabase Cron and Queues. Page views, logs and search hits enqueue the album or song, deduplicated so each one is only queued once. The worker fetches the tracklist, label, blurb and URL relations, using the **background lane** of the MusicBrainz limiter. Results go into the catalog tables with an `enriched_at` timestamp, and stale data gets refreshed. **Store the full `release_date` and its `release_date_precision` (day, month or year)** from the release group's first release date. Badges (13) need them.
- Pages only read from cache. If something hasn't been enriched yet, show a skeleton and fill it in when the data arrives.

## 06b: Album page `/album/[mbid]`
Build the sections in the order given in ARCHITECTURE §5.
- **Ratings:** the earwrm average to one decimal, a 10-bar half-star histogram, and the number of logs, reviews and likes. Hide the average until a release has at least 5 ratings and show "Not enough ratings yet" instead. The threshold is a named constant.
- **Friends:** up to 10 avatars of people you follow, each with their latest rating. Tapping one opens their review if they wrote one. Also show "N people you follow have it queued". Until handoff 09 adds follows, this section stays hidden.
- **Your history:** a timeline of your entries showing date, stars, review snippet and a re-listen marker, plus a small rating-over-time line when there are 2 or more rated entries. Below that, your first listen date and total times logged.
- **Tracklist:** number, title, length, an average-stars chip (from `target_stats` for that song) and your own stars. Tapping a row opens `/song/[mbid]`. Long-pressing quick-rates it.
- **Reviews:** tabs for Popular (by likes), Recent and Friends, each paginated. Reviews marked "contains spoilers" are blurred until tapped. Each review gets its own permalink at `/u/[username]/entry/[id]`.
- **Lists:** popular public lists that include this album, ranked by likes. This section turns on after handoff 08.
- **Layout:** follow DESIGN.md: the blurred backdrop header, the title in Geist Serif, numbers in Geist Mono, and two columns on desktop.
- **SEO:** server-rendered public data, plus an OG image showing the cover, title and earwrm average, in the same dark style with the title in Geist Serif.
- **Attribution and fallbacks:**
  - Store `source`, `license` and `modified` with each blurb, and show the Wikipedia credit and license link.
  - Covers always fall back to the striped monogram, and there's a removal path (a report option on the cover).
  - Reusing covers in exported share images (10) gets its own review: Cover Art Archive collects images for archival purposes.

## 06c: Song page `/song/[mbid]`
- Same layout as the album page, scoped to the song. The header shows "From *Album*" with a link, plus other releases the song appears on, if MusicBrainz has them. There's no tracklist section.

## 06d: Critic scores
1. **Review links come first, and they don't depend on scores.** MusicBrainz has a verified release-group → URL **Review** relationship, which covers text, audio and video reviews. Show these as attributed outbound links ("Review · Pitchfork ↗"). They ship even if scores never do.
   - **CritiqueBrainz** (MetaBrainz) exposes reviews for each release group, with a source URL and a **license per review**. CC BY-NC-SA appears in the docs. Use it only for extra *links*, label community reviews as community, and never republish the text unless that review's license allows it.
   **Then check Wikidata P444 coverage:** sample at least 100 albums people actually log on earwrm, including EPs, mixtapes, older albums and independent releases. Record how many have a named critic (P447), a readable scale and a traceable source. **Set the threshold before sampling** (proposed: at least 25% of sampled albums have a usable score). Report coverage separately for major-label and independent releases. Ship a permanent scores section only if it clears the threshold. Otherwise show scores only where they exist and keep the review-link chips.
2. A worker maps Wikidata items to release groups. Use the MusicBrainz release-group ID property on Wikidata, or the Wikidata URL relation on MusicBrainz. It then writes `critic_scores`. **Show the original score and scale exactly as published** ("4/5", "A-", "8.3"). Keep the normalized value internal only, for sorting.
3. **UI:** chips showing the publication and its score in the publication's own format, for example "Pitchfork 9.0". Each chip links to the review URL. Add the small credit "Scores via Wikidata".
4. **User-submitted review links:** "Add a critic review". The user pastes a URL, which must be on an allowlist of publication domains. The link goes into moderation (D14), stores the URL and publication only, and shows the score only if a moderator enters it.
5. **Never** scrape critic sites, show review text, or calculate a Metacritic-style aggregate.

## 06e: Artist page `/artist/[mbid]`
Clicking the artist name under any album or song title opens this page, and so does the artist in search results, lists or reviews.
- **Header:**
  - **banner and profile image** (see the image sources below)
  - the artist name in Geist Serif
  - a **Follow** button (handoff 09 wires up the follow table, alerts and follower counts)
  - **your stats** for them: releases logged, average rating, first logged
- **About:** a blurb from Wikipedia's lead paragraph (store source, license and modified flag, and show "From Wikipedia"), plus the type, area and active years from MusicBrainz.
- **Your badges for this artist** (handoff 13): OG, Early on earwrm, and Release Day, Release Weekend and Full Album Day One for their releases. They follow badge visibility and are hidden when you have none.
- **Discography:**
  - every release group, with tabs for **Albums, EPs, Singles, Mixtapes, Compilations**, newest first
  - each card shows the cover, year, earwrm average (public-only, D19), and your rating, logged or queued state
  - tapping a card opens the release page. **Long-pressing opens the same action sheet as a release page** (log, rate, listened, like, queue, add to list).
  - "Show appearances" (features and credits) is collapsed by default.
- **Popular on earwrm:** their most-logged and highest-rated releases and songs (public stats only).
- **From people you follow:** recent reviews of this artist's releases (handoff 09).
- **Related artists:** from the MusicBrainz artist graph (collaborations, members, label) now. Shared recommendation models take over in handoff 11.
- **Lists featuring them** (handoff 08).
- **Data:** an artist enrichment job (background MusicBrainz lane) fills `artists` with type, area, life-span, `wikidata_qid`, the blurb and the discography (release groups with their primary credit), and keeps it fresh.
- **Image sources, in order** (record what you verify in EXTERNAL-SOURCES before shipping each one):
  1. **The default, always legal:** the banner is a blurred, scrimmed collage of the artist's own **Cover Art Archive** release covers, the same source and style as the album backdrop. The profile image is their most popular release cover, or a monogram.
  2. **Apple Music artist artwork** (MusicKit/Apple Music API), only once 06e confirms that the Artist resource exposes artwork and what Apple's display terms require (attribution, linking to Apple Music). This fits the Apple-first plan. Until then it's **unverified**.
  3. **A Wikimedia Commons photo** through Wikidata P18, only with the per-image license and attribution shown. Unverified, so confirm the Commons reuse rules first.
  - **Spotify images aren't used.** Its design guidelines require the Spotify logo with any Spotify content, ban cropping, and require a link back (verified). Its API is also capped at 5 users and its policy restricts this kind of use.
- **SEO:** server-rendered public data and an OG image (artist name in Geist Serif over the cover collage).

## Demo mode
Seed several albums and songs with everything filled in: stats, fictional demo friends, history, reviews and critic chips.

## Tests
- **pgTAP:** stats triggers stay correct after insert, update and delete; the nightly recompute matches; RLS on reviews and comments.
- **Unit:** score parsing ("9.0", "4.5/5", "A-", "8/10"); a tracklist built from a release fixture.
- **Integration:** the enrichment worker with mocked MusicBrainz and Wikidata responses; recovering when a worker crashes partway through a batch.
- **E2E:** an album page with every section (in demo mode); tracklist → song page → back; blurred spoiler review.

## Acceptance criteria
- A cached album page loads under 1 s on a phone. A page that isn't cached yet shows its header right away, and the rest fills in once enrichment finishes.
- No review text from any critic site is stored anywhere.
