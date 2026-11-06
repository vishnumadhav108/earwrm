# Decisions

These are short decision records. To change one, add a new entry that supersedes it. Never edit the history.

**D1. earwrm is a music diary. Everything in it is logged by the user.**
No automatic listening tracking in this plan. Earlier research showed Spotify's policy against building stats from its data, its 5-user cap, Last.fm's non-commercial terms and Apple Music's missing live data. Together those made tracking a liability, not a feature. Tracking can come back later as an opt-in add-on (ROADMAP) without a rewrite (D6).

**D2. Stay on Next.js + Vercel + Supabase.**
Postgres with RLS, auth, storage, realtime, cron and queues all live with one vendor.

**D3. Diary entries and ratings are separate things (Letterboxd model).**
- A **diary entry** is one listen on one date. You can log the same album as many times as you like, and later logs are marked as re-listens. Each entry can carry a rating, a review, a like and tags.
- A **rating** is your *current* rating for an album or song. Each entry records the rating at that moment, so your rating history is the list of your entries.
- This replaces today's schema, which allows only one entry per user per album.

**D4. Albums and songs both get pages.**
- Songs are MusicBrainz **recordings**. A song page works like an album page, scoped to that song.
- The tracklist on an album page comes from one chosen release of that album (the earliest official release, which is today's logic). Its tracks link to recording pages.
- Song ratings are attached to recordings, so a song rated on the single and on the album is the same rating whenever MusicBrainz uses the same recording for both. Where it doesn't, they stay separate. That's accepted for now.

**D5. Album and song statistics are maintained in the database.**
Average rating, star histogram, number of logs, reviews and likes, and "N people have it queued" live in stats tables. Triggers or a queue keep them up to date, so pages never count rows when they load.

**D6. Leave room for optional tracking later.**
Diary entries have a `source` column (default `manual`). Nothing else gets built for tracking now.

**D7. Enrichment runs in the background, never while a page loads.**
Critic scores (Wikidata), review links (MusicBrainz), tracklists, blurbs and import matching are done by Supabase Edge Function jobs. Supabase Cron kicks them off and Supabase Queues feeds them work. Results are cached in tables with `fetched_at`, and a page shows whatever is cached at that moment.

**D8. Link out to critics, don't copy them.**
Show the score, publication name and a link to the review. Never show review text or Metacritic-style aggregates, and never scrape critic sites. Sources are in EXTERNAL-SOURCES.md.

**D9. One MusicBrainz limiter with priority lanes.**
It's shared across all serverless instances. Interactive requests (search, opening a page) always go ahead of background enrichment.
*Revised by D21:* background work gets a guaranteed minimum share so it can't starve.

**D10. Social follows the Letterboxd model: one-way follows.**
You follow people and see their activity. Nobody has to approve a follow request. A private account option (where follows need approval) and blocking cover privacy.

**D11. One visibility model, enforced in the database.**
- `can_view(owner, viewer, visibility)` with `public`, `followers` or `private`. Every sharing policy uses it.
- Anon users can only read rows that are public.
- Each list has its own visibility setting.

**D12. Real URLs for real things.**
`/album/[mbid]`, `/song/[mbid]`, `/artist/[mbid]`, `/list/[id]`, `/u/[username]`, `/u/[username]/entry/[id]`, `/recap/[id]`. Private content never shows up in page metadata or link previews.

**D13. One typed data layer that a mobile app can reuse.**
Components never call Supabase directly. Logic lives in SQL functions and route handlers.

**D14. User-generated content gets moderation from the start.**
Reviews, comments, list text and submitted links all need: reporting, blocking, rate limits, a basic profanity and spam filter on links, and an admin queue. Everything is soft-deleted so moderators can review it.

**D15. Keep the long-term foundations even though they're slower.**
The goal is a solid app over time, not a quick beta. Vishnu decided this explicitly.

**D16. History import is an optional, one-time upload, not tracking.**
Users can upload their own data export (Spotify Extended Streaming History, Apple's privacy export, or a generic CSV) to have past albums logged automatically. Rules:
- Parse it in the browser and upload only normalized play rows. Identifying fields stay on the user's device.
- Imported entries start unrated, are tagged by batch, and can be undone completely.
- Imports never flood followers' feeds.
- This is the user's own personal data, uploaded by them. It isn't Spotify API content, so Spotify's API developer policy doesn't apply directly as far as we can tell. That's our reading, not legal advice, so confirm it before monetizing.

**D17. Videos are postponed.**
YouTube's default quota (100 searches a day) and its storage rules make videos a lot of work for a section that isn't a priority now. The research is in ROADMAP.

**D18. Design system: clean and dark, Geist type.**
The rules live in DESIGN.md. Geist Serif is display-only: it ships in one weight, and Vercel describes it as a face for large sizes. Geist Sans handles UI and body text, and Geist Mono handles data. The look draws on the current app, Vercel and Letterboxd without copying either brand. Components use only design tokens.

**D19. Public aggregates count only *effectively public* current ratings.**
"Effectively public" means the rating is public **and** the account isn't private. Each user contributes one vote per album or song: their current rating, and only when it's effectively public. Sparse averages on small albums are accepted. Thresholds like "include private ratings once 10 exist" are rejected, because comparing a page before and after one person's change still reveals their rating. Private and followers-only ratings never affect averages, histograms, counts, "hottest takes" or popularity charts. (What can train recommendation models is set by D27.) Otherwise someone could work out a hidden rating by comparing a page before and after. Every page or image that can show a review or rating gets a leak test.

**D20. Entries vs current rating, plus stable identities.**
- The interaction rules are in handoff 05. In short: rating without logging creates no diary entry, a backdated log doesn't change your current rating unless you choose to, deleting an entry never silently changes your rating, and "rating history" means "Your past logs".
- Identities are defined in `docs/IDENTITIES.md` (handoff 03):
  - album = release group, edition = release, song = recording MBID
  - review permalinks use the entry UUID
  - old usernames and merged MBIDs redirect

**D21. The import suggests listens. It never decides them.**
- Imported data produces **proposals with evidence** that the user confirms.
- Sessions are grouped before dates are assigned, completeness is judged against the matched edition, and ambiguous matches stay unresolved.
- Only system-verified matches enter the shared cache.
- Raw rows are temporary, imports are private by default, and undo keeps entries the user has edited.
- The MusicBrainz queue gives background work (imports, enrichment) a guaranteed minimum share, with metrics: search p95, oldest import age, cache-hit rate.

**D22. Recommendations are built on first-party taste data, then made smarter.**
- The core signals are mean-centered ratings, logs, list co-occurrence and follows, plus CC0 catalog structure.
- MusicBrainz genre and tag associations are non-commercial (CC BY-NC-SA) until MetaBrainz grants a commercial license.
- Spotify's audio features and recommendations endpoints are off-limits for new apps.
- There's no legitimate audio-feature source at scale yet.
- Phase 1 is SQL-based collaborative filtering (handoff 11). Phase 2 is a Python hybrid model with learning-to-rank (handoff 12).
- Every recommendation is explained. *(This decision originally said private data only shapes its owner's own recommendations. D27 replaces that.)*

**D23. Signal eligibility contract.** *(Historical. The "Shared" row is superseded by D26 and then D27, and the user controls by D25. The explanation row still applies.)*
| Destination | Allowed inputs |
|---|---|
| Public averages, histograms, rating charts, "hottest takes" | One **effectively public** current rating per user |
| ~~**Shared** recommendation models~~ *(superseded by D26)* and artifacts (`item_neighbors`, embeddings, MF factors, popularity) | Effectively public current ratings, effectively public **lists**, and public **review text**. Each other signal (follows, favorites, likes, queue adds, events) is added only after its eligibility is written into RECOMMENDATIONS §2 and has a paired privacy test |
| **One user's own** ranking | Everything that user is allowed to see about themselves, including private ratings, private queue adds and their own events. These can only re-order *their* results |
| Explanations that name another person | Only after a fresh check, at render time, that the person and the rating are visible to the viewer and neither has blocked the other |

*(D25 drops the user-facing recommendation controls. The eligibility rules in this table still apply in full.)*

**D24. Realtime is a signal, never the content.**
For **private Broadcast and Presence channels**, Supabase caches authorization for the life of the connection, so revoked access only takes effect when the JWT is refreshed or expires (verified). Postgres Changes checks RLS on every event for each subscriber, except DELETE events (verified). So sensitive channels (notifications, feed) only broadcast a generic "refresh" signal, and the client fetches the actual content through a fresh RLS-checked read. JWT expiry is kept short.

**D25. No recommendation settings. The privacy rules stay.** *(Supersedes the three controls originally listed in D23.)*
earwrm only uses activity to run earwrm itself: personalization and shared recommendations. Nothing is sold or used for ads. Service providers that process data are named in the privacy notice (D27 §7). So there are no on/off switches, which is the same approach Letterboxd and Spotify take.
- Which data can train shared models is now set by **D27**. D19's display rule is unchanged.
- The privacy notice (handoff 04) says plainly that activity is used to personalize and improve recommendations, and that it's never sold.
- Account deletion removes all events, the taste profile and personal recommendations.
- If a user asks to be excluded (for example under GDPR's right to object), a support or admin action sets an internal `exclude_from_shared` flag that the build respects. There's no UI for it. The deadline and legal-review trigger are in D27 §7–8. This is not legal advice.

**D26. All ratings, lists and reviews can train shared models.** *(Historical. Mostly superseded by D27: review text, the support rule, blocks and the wording all changed. Read D27.)*
Visibility controls who can **see** something, not whether it can anonymously improve recommendations. Ratings, lists, reviews, likes, favorites, queue adds and events at any visibility (public, followers or only me) can train shared models, with these guardrails:
1. **Display stays public-only (D19 unchanged).** Averages, histograms, counts, "hottest takes", popular lists and anything else shown as a number or list come only from effectively public data.
2. **Minimum crowd:** an album, song or album pair uses non-public signals only once **k = 5** distinct users have contributed to it (`MIN_PRIVATE_CROWD`, a named constant). Below that, shared artifacts for it are built from public data only. Text embeddings use non-public review text only for albums with at least k reviews.
3. **No attribution:** explanations and "people who rate like you" never name anyone, or show counts, based on activity the viewer can't see. They say "Popular with people who share your taste" instead.
4. **Transparency:** the privacy control copy reads "Private hides it from people. It still anonymously helps improve recommendations." The privacy notice says the same. The admin `exclude_from_shared` flag (D25) removes someone from all shared training.
5. **Blocks:** a blocked user's activity never shapes recommendations shown to the user who blocked them (or the other way around), at any visibility.

**D27. Private numerical activity trains shared models. Promises match what the system can actually do.** *(Supersedes D26 items 2–5 and the D25 notice wording.)*
1. **Inputs to shared models:** ratings, lists, likes, favorites, queue adds and events at **any** visibility. **Review text at any visibility is included too** (the owner's call: a weak signal, but still useful), under the text rules in §12. Bulk imports and backdated edits count as taste signals but never as "next discovery" labels.
2. **Minimum support (k = 5, an experiment constant):** count **distinct contributors to the actual statistic**. That means distinct users per album for item statistics and distinct users who rated *both* albums for pair similarity, so 5 reviews by one person count as 1. **Centering means:** each user's centering mean uses **all** their ratings, public and private. Private ratings therefore influence shared centering and recommendations. **There is residual inference risk:** if enough of a user's other ratings are known, a changed mean can reveal an individual rating. The owner accepted that risk in exchange for simpler, more accurate centering. The support tests only claim protection for the item and pair statistics they actually test. The k = 5 support rule still applies to the actual item and pair statistics.
3. **What each surface may use (replaces D19's "any displayed list" wording):**
   | Surface | Inputs |
   |---|---|
   | Public averages, histograms, counts, popularity charts, "hottest takes" | effectively public only (D19) |
   | Personalized surfaces (For you, Home shelves) and the shared "Similar albums" | shared models trained under rules 1–2, plus the viewer's own data |
   | Explanations, "your circle", anything naming or counting people | only what the viewer can see right now, checked **at read time** |
4. **Blocking** removes, in both directions and **immediately**: visible content, attribution, follower-based signals ("your circle", friends' ratings shelves), and cached explanations. It doesn't remove either user's contribution to shared model training. Blocking controls interaction, not model quality.
5. **Visibility changes:** attribution and block checks happen at read time. Public aggregates for the affected item are invalidated and recomputed **on the privacy write**, or hidden while they're recomputed. Only rebuilding recommendation artifacts waits for the nightly build.
6. **Honest copy, with no "anonymous" or "never revealed" claims.** The visibility picker says: "Private hides it from people. It still helps improve recommendations across earwrm, and it's never shown or credited to you."
7. **Privacy notice (handoff 04), shown before the first event is recorded (05):**
   - what activity is collected, and what optional connected services (Last.fm for badges, iPhone Music-library access) read and keep: only badge results and minimal evidence. Also, confirmed imports keep per-track qualifying evidence (recording plus play-end time) permanently for badges
   - which visibility levels can influence other people's recommendations (all of them, including review text, which is only ever used as album-level blends)
   - the service providers that process data (hosting, database, error monitoring: Supabase, Vercel, Sentry, plus any others added later)
   - how long events and derived artifacts are kept (events for 18 months; artifacts are rebuilt nightly)
   - what happens on deletion
   - the objection route: a contact email, an owner, and a deadline (left out starting with the next nightly build, per §10)
   - Never say "nothing is shared with third parties".
8. **Legal review trigger:** GDPR applicability depends on what earwrm does, not on how many users it has. It applies when earwrm offers its service to people in the EU or monitors their behavior there (GDPR Art. 3(2), as commonly understood; confirm with counsel). So **assess the lawful basis and how objections will be handled before enabling recommendation processing for EU users**, for example by geo-gating EU signups until that's done. The notice and the admin objection route are pieces of the answer, not the whole answer. This is not legal advice.
9. No ad hoc noise or differential-privacy claims. The protections are narrowing the inputs and minimum support.
10. **Exclusion applies to future builds only.** After an exclusion request:
    - the user's inputs **stop being admitted right away**
    - the next nightly build rebuilds **every affected artifact** from eligible inputs, **from scratch rather than warm-started** from a model that contained the user
    - the served version switches, and caches keyed to the old `model_version` expire
    - **Maximum deadline: 72 h.** If a build fails, retry. If the deadline is missed, alert the owner, and as a fallback serve the previous public-only or phase-1 baseline for shared surfaces until a compliant build is live.
    - Whether this timetable satisfies any particular legal objection depends on the case (not legal advice).
11. **Visibility changes for text:** a review keeps training the model when it goes private. Only its *display* and attribution change, right away, under §5.
12. **Text rules** (private text is used **only for recommendation scoring**, with no quotes, extracted descriptors, summaries or attribution displayed. Recommendations are themselves derived outputs, so we don't claim more than that):
    - **Album-level blends only.** Review text is embedded and then averaged into one vector per album. Per-review vectors are never stored in shared artifacts.
    - **At least k = 5 distinct reviewers** before an album's vector includes any non-public text. Below that, it's built from public reviews only.
    - **No display of private text or anything extracted from it:** no quotes, keywords, summaries or "vibe" tags. Visible vibe labels and any generated text come from public reviews only.
    - **Embeddings stay internal.** No API, page, export or OG image exposes them. (Averaging isn't a formal guarantee. If a mean vector and four of its five components leaked, the fifth could be recovered, so keeping vectors inaccessible matters.)
    - **One contribution per reviewer per album** (their latest review), with text length capped before embedding.
    - **Test the 5 → 4 transition:** when a deletion or exclusion drops an album below 5 reviewers, its vector goes back to public-only at the next build.
    - **Private text never goes to debug logs, Sentry or an external embedding API** unless that processor and use are disclosed in the privacy notice. The default is a self-hosted embedding model in the batch job.

**D28. Listening badges are opt-in extras, Apple-first.**
- Badges recognize being early: Release Day (calendar date), Release Weekend (48 h grace), First Week, Full Album Day One, Early on earwrm (logs at any visibility count), OG (logged an artist's first release of any type within its first week; formerly "Day-one fan"), Called it (handoff 13). **Every other feature works without them.**
- **Where the evidence comes from, from strongest to weakest:**
  1. the log's server timestamp, which can't be edited
  2. on-device Apple Music data in the earwrm iPhone app (MediaPlayer `lastPlayedDate` / `playCount`)
  3. Last.fm scrobbles for Spotify users who choose to connect
  4. the user-supplied history import

  Labels are honest: "logged" for log-based badges, "played · source" for play-based ones, and never "verified" for imports.
- **The iPhone app is the main platform, and on-device Apple Music scanning is its headline feature.** Start with a 1–2 day spike on a real iPhone to confirm what `lastPlayedDate` and `playCount` cover (library songs vs streamed songs) before designing anything around it.
- **Spotify users get an optional Last.fm prompt during onboarding.** Last.fm only fetches release windows, raw scrobbles are thrown away, and it's flag-gated by Last.fm's non-commercial terms.
- **Data hooks needed now, because they can't be added later:**
  - full release dates with their precision (06)
  - a server-set `created_at` on diary entries that can never be edited (05)
  - import session windows kept as evidence (07, already planned)
- **Implementation rules (after round 6 review):**
  - `created_at` is protected on **INSERT as well as UPDATE**. The database sets it, and anything a client sends is ignored.
  - Badges use the **release group's original first release date**, never a reissue's, so logging a new reissue can't earn release-window or OG badges for an old album.
  - Each badge stores the date source, timezone, edition and `rule_version`. Recomputing after corrections never reorders anyone's historical "first N" position unexpectedly.
  - **The iPhone scan collects evidence conservatively:**
    - scan on app launch, manual refresh and opportunistic background refresh
    - keep an observation when a matched track's `lastPlayedDate` falls inside the window, and never let later plays overwrite it
    - award only when every required track has qualifying evidence, treating missing evidence as unknown
    - label the reported play time separately from earwrm's observation time
  - Background refresh can't guarantee a scan before timestamps get overwritten, because Apple decides when it runs. The spike finds the major limits, not long-term reliability, so **scanning is a headline feature only once the spike passes**.
  - **Last.fm meaning:** a scrobble means the track was "longer than 30 seconds" and played "for at least half its duration, or for 4 minutes" (verified). So the badge evidence is "each track scrobbled". Tracks of 30 seconds or less are exempt from the requirement.
  - Ownership of a Last.fm account is proven through Last.fm web auth before a badge is awarded. Public profiles alone don't count. Now-playing records are ignored, and window boundaries are tested exactly.
  - **The onboarding badge offer stays behind its feature flag** until at least one play-evidence source works. Before turning on 13c, ask Last.fm about this exact use and what happens to existing badges if earwrm becomes commercial.

**D29. Artist pages, artist follows and new-release alerts.**
- Every artist has a page (06e) with: header, About, your badges for them, a full discography with release-page actions, popular-on-earwrm, reviews from people you follow, related artists, and lists.
- **Images:** Cover Art Archive collages and covers by default. Apple Music artwork or Wikimedia Commons photos only after their terms are verified. Never Spotify images.
- Following an artist (09) creates **new-release alerts**: a popup on the next app open with Listened already, Add to queue or Not now, plus an inbox notification and opt-in push. Detection is one shared daily MusicBrainz job per followed artist, never one per user.

