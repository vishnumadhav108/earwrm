# 11: Discover

**Branch:** `feat/discover`
**Goal:** a Discover tab for finding music and people, plus **recommendations phase 1** (RECOMMENDATIONS §4): SQL-only item-item and user-user collaborative filtering with explanations. The ML model comes in 12.
**Depends on:** 06, 08, 09.

## Sections (each one paginated)
1. **Popular this week:** the most-logged albums on earwrm in the last 7 days. Show a "new" badge on anything released in the last 30 days.
2. **From people you follow:** the albums they've rated highest recently.
3. **New releases from artists you follow (09) or have logged:**
   - Get these from MusicBrainz release groups for artists in your diary, through the background limiter lane.
   - A daily job does the fetching. Cache the results per artist and share them across users.
4. **Highest rated on earwrm:**
   - Albums with at least N ratings (N is a named constant), ranked by a Bayesian average so a handful of 5-star ratings can't top the chart.
   - Filters: decade, type, genre. **Genres:** MusicBrainz genre associations are CC BY-NC-SA, non-commercial (EXTERNAL-SOURCES). Use them only while earwrm is non-commercial or once a MetaBrainz commercial license is in place. Also measure Wikidata P136 coverage as a CC0 fallback.
5. **Popular lists:** trending this week and new, plus browse by tag.
6. **Popular reviews:** most-liked reviews this week.
7. **People to follow:** active reviewers, plus "people who rate like you" (public ratings only, at least 10 co-rated albums).
8. **For you** (phase 1): candidates from `item_neighbors` (adjusted cosine on mean-centered ratings with significance weighting, plus list co-occurrence lift), user-user neighbors, the artist graph and new releases.
   - Remove anything logged, queued or dismissed. Cap 2 per artist.
   - Every card shows its reason, plus "Not interested" and "Already listened" buttons.
   - **Cold start:** works after 1–2 ratings. The "Rate albums you know" onboarding grid is optional, plus genre picks. Popularity-in-genre plus content similarity cover sparse profiles.
   - **Before showing collaborative rows:** measure the share of users with eligible neighbors, the share of albums with neighbors, and CF vs a popularity + content baseline. Report the numbers in the PR.
9. **Similar albums** on every album page: from `item_neighbors`, falling back to the artist graph and genre.

10. **Borrowed techniques, phase 1** (RECOMMENDATIONS §7): Y4 (valued listens as the goal), Y5 (per-user signal normalization), Y9 (demote shown-and-ignored), T1 (signal strength order), T2 (break up repetition), T3 (exploration slot), T5 (don't rank by follower count), T6 (eligibility gates), T7 ("Hide this artist"), T8 (in-session re-ranking), S3 (static calibration of genre, era and type mix).
    - **Home becomes titled shelves** (S2 layout), filled by rules in this phase.
    - **Decision logging** (separate from impressions): eligible candidates, the chosen item, the probability (and the conditional probabilities across shelf and item), policy version and slot. Deterministic slots log 1 and are excluded from off-policy estimates.
    - **S2 pilot:** one fixed shelf slot, 5% of eligible requests, uniform over 5 safe candidates, stable per user.
    - Apply the "Revisions after review" in RECOMMENDATIONS §7, which override the original technique tables.

## Rules
- Rankings come from SQL functions over `target_stats` and the activity data. Refresh them on a schedule (materialized views or tables updated every 15–60 min), never on each request.
- Only public content shows up. Private accounts and blocked users are excluded.
- Recommendation privacy follows RECOMMENDATIONS §2 exactly: private and followers-only data shapes only the owner's own recommendations.
- `item_neighbors` and user-similarity tables refresh nightly, built under D27: signals at any visibility (review text only as album-level blends, D27 §12), distinct-contributor support of k = 5 per item and per pair, attribution checked at read time, and blocks removing follower-based signals right away. Public **stats and popularity charts** (popular this week, highest rated, counts) stay public-only (D19). Personalized shelves and "Similar albums" may use shared models (D27 §3).
- **Impressions:** a viewport-based impression logger (at least 50% visible for at least 500 ms, deduplicated impression ID, position, model version), plus click, queue and dismiss events tied to the impression. Dismissals expire unless the user chose "never".
- **The privacy tests** from RECOMMENDATIONS §2 run in CI: no disclosure, pair-level and list-level minimum support, exclusion at the next build, block with pages already open, and text going private at the next build.
- Shared caches are keyed by `model_version` and refresh with each nightly build (D27 §10).
- Each section has an empty state for a new install with little data. Demo mode seeds enough to fill every section.

## Tests
- **pgTAP:** Bayesian ranking with fixed data; nothing private or from blocked users appears; a private rating never changes another user's For you results or `item_neighbors`.
- **Unit:** mean-centering, significance weighting, list lift, the explanation builder.
- **Unit:** the new-release diff for each artist.
- **E2E:** every section renders in demo mode; tapping through goes to album, list, review and profile pages.
