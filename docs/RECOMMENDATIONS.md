# Recommendations

**Goal:** recommendations people trust, because they're accurate, varied and explained ("Because you gave *Blonde* 5★").

The strongest signal earwrm has is its **own** data: ratings, logs, lists and reviews that people chose to make. Outside sources help with cold start, but the main engine is collaborative filtering on earwrm's taste data, with content features layered in.

## 1. Where the data comes from, and whether we can use it

| Signal | Source | License / terms | Use |
|---|---|---|---|
| Ratings (half stars), current and per entry | earwrm | first-party (our ToS) | **core** |
| Logs, re-listens, likes, favorites, queue adds | earwrm | first-party | core implicit feedback |
| List co-occurrence (two albums in the same list) | earwrm | first-party | very strong item-to-item signal |
| Follows, and how much a person's taste overlaps with someone they follow | earwrm | first-party | social weighting |
| Review text | earwrm | first-party (the ToS must cover processing it) | text embeddings, "mood" or "vibe" similarity |
| Discover interactions: impressions, opens, queue adds, "not interested" | earwrm | first-party | training labels and evaluation |
| Confirmed imported entries, plus opt-in `import_listening_stats` (handoff 07) | the user's own export | user-provided | a taste profile at cold start. Raw rows are never kept |
| Artist relationships (members, collaborations), labels, release year and type | MusicBrainz core | **CC0** (verified) | content graph |
| Genre and tag associations on albums and artists | MusicBrainz | **CC BY-NC-SA, non-commercial** (verified: "tags (including genre associations)" are supplementary data). MetaBrainz offers a commercial license | genre features. **Needs a commercial license before monetization.** Ask MetaBrainz during handoff 01 |
| Genres (P136) | Wikidata | CC0 for structured data (verified). Coverage of albums isn't checked yet | a CC0 genre fallback. Measure coverage first |
| Similar artists / related recordings | ListenBrainz: `GET /1/lb-radio/artist/{mbid}` (similar artists, each with recordings) and `GET /1/explore/lb-radio` (prompt-based playlists). Both are documented (verified) | commercial reuse and retention terms aren't confirmed | parked. It's part of the MetaBrainz inquiry |
| Genres and styles | **Discogs monthly data dumps** | **CC0** (verified on data.discogs.com and the developers page). That genres and styles are actually in the dumps is unverified (the dumps "follow the API spec", which has those fields) | a candidate CC0 genre and style source. Test how well Discogs masters and releases match to MusicBrainz release groups before budgeting it |
| Audio features | Spotify Audio Features / Recommendations / Related Artists | **restricted for new apps since Nov 27, 2024** (verified) | ✗ can't be used |
| Audio features | AcousticBrainz | CC0, but data collection stopped in 2022. MetaBrainz said its own recommendation results with it were poor (verified) | ✗ low value. Maybe a minor feature on old releases |
| Audio embeddings computed from audio clips | Provider previews | each provider's terms. Most ban this kind of processing (unverified) | **Roadmap only, after legal review.** Don't build it |

**On "audio similarity":** right now there's no legitimate, free, current source of audio features at scale. So "sounds like" has to come from people's behavior on earwrm (people who love X also love Y), plus genre and artist relationships and review text. In practice this captures most of what audio similarity would give us. Real audio embeddings stay on the roadmap pending licensing.

## 2. Privacy rules for recommendations
- **There are no recommendation settings (D25).** Activity is used only to run earwrm and is never sold or used for ads. The privacy notice follows D27 §7.
- **Training data is set by DECISIONS D27.** Ratings, lists, likes, favorites, queue adds and events at **any** visibility can train shared models. **Review text at any visibility can be used**, only as album-level blends, with at least 5 distinct reviewers needed before non-public text is included, and nothing derived from it ever shown (D27 §12). Support is at least k = 5 distinct contributors to the actual statistic (per item, or per pair). Attribution is checked at read time. Public stats (averages, counts, histograms, popularity charts) stay public-only (D19).
- An internal, admin-only `exclude_from_shared` flag handles individual objection requests.
- User-user neighbors stay **internal** by default. Their identities are never shown.
- No recommendation or explanation may reveal a specific person's hidden activity. Explanations mention a person only after a fresh check, at render time, that the person and the rating are visible to the viewer and neither has blocked the other ("@ana rated this 4.5").
- **The privacy tests** (required in 11 and 12, following D27):
  - **No disclosure:** Alice adds a private 1★ rating, a private review with a unique phrase, and a private queue add. Bob's recommendations *may* change. But no public number changes, no explanation Bob sees names Alice or counts her, and the unique phrase (or any keyword or summary drawn from it) **never appears anywhere Bob can see**: search, vibe labels, explanations, caches, OG images or API responses. It may influence the album's internal blended vector.
  - **Minimum support (pair-level):** on a pair that only 4 distinct users co-rated, adding Alice's private rating leaves **that pair's inputs and score identical**. Five ratings from one user count as 1 contributor.
  - **Minimum support (list-level), in a controlled fixture:** with every other input held constant, the album's whole "Similar albums" list is identical. Don't assert list identity in a realistic fixture, because Alice's rating can legitimately change *other*, well-supported pairs.
  - **Exclusion:** after the admin flag is set, the next nightly build leaves Alice's inputs out, and caches from the previous version stop being served once it's replaced.
  - **Already-open pages:** after a block or a visibility change, a page that's already open fetches only permission-checked content on its next refresh signal (D24). Cached explanations are gone.
  - **Text minimum support:** on an album with only 4 distinct reviewers, Alice's private review leaves that album's text vector identical to the public-only build.
  - **No per-review vectors:** shared artifacts contain only album-level text vectors, and a schema test enforces it.
  - **Exclude:** with the admin flag set, the shared training artifacts are identical to a deterministic reference build without Alice's inputs. Her *public* rating still counts in D19 public averages.
  - **Block:** right after Bob blocks Alice, Bob sees none of her content, attribution or follower-based signals, and cached explanations mentioning her are gone. Her contribution to shared models is allowed to stay.
  - **Visibility change:** when Alice makes her only rating on an obscure album private, the album's public histogram updates or hides **immediately**, not at the nightly build.

## 3. Taste profile (computed per user, nightly and when activity changes)
- **Rating baseline:** the user's average rating and spread. Every rating is mean-centered first, because a harsh rater's 3.5★ can mean the same as a generous rater's 4.5★. This is the most important normalization in the whole system.
- **Genre vector:** genre weights from rated and logged albums, weighted by the centered rating and how recent it is.
- **Era and type preferences:** decades and release types (album, EP, mixtape).
- **Mainstream index:** how popular on earwrm the user's logged albums are on average.
- **Exploration rate:** how many new artists they log vs re-listens.
- **Embeddings:** a user vector from the collaborative model, plus a text vector made from their reviews.

## 4. The system: candidate generation → ranking → re-ranking

```
 candidates (≈500 per user)                    ranking                        re-ranking
 ├─ item-item CF (from your top-rated)    ┐
 ├─ user-user CF (people who rate like you)│  learning-to-rank model      ─►  diversity (MMR), novelty,
 ├─ matrix-factorization neighbors        ├─► features: CF scores, genre  ─►  freshness, remove logged/
 ├─ list co-occurrence                    │  match, artist-graph distance,    dismissed/queued, cap per
 ├─ artist graph (collabs, members, label)│  popularity, release year,        artist, attach explanation
 ├─ new releases from artists you rate    │  social signal, text similarity
 ├─ friends' high ratings                 │
 └─ popular in your genres (cold start)   ┘
```

### Phase 1 (handoff 11, Discover v1): SQL only, no ML infrastructure
- **Item-item similarity:** adjusted cosine on mean-centered ratings, with significance weighting (require at least N co-raters and shrink toward 0 when there are few). Plus list co-occurrence (lift, so very popular albums don't dominate everything). Store the top 50 neighbors per album in `item_neighbors`, refreshed nightly.
- **For you:** for each of your top-rated recent albums, pull its neighbors and score them by your centered rating × similarity. Remove anything you've already logged, queued or dismissed. Attach the explanation ("Because you rated X 5★").
- **People who rate like you:** taste similarity between users (Pearson on co-rated albums, at least 10 overlapping, with shrinkage). Show the top-rated albums of your nearest neighbors that you haven't logged. Only their public ratings count.
- **Cold start:** recommendations start working after **one or two** ratings and get better as you add more. Onboarding offers an optional "Rate albums you know" grid (skip anytime) plus genre picks, and the import (07) can seed the profile. Until there are enough neighbors, use popularity within your genres plus content similarity.
- **Before turning on collaborative filtering, measure:** the share of users with eligible neighbors, the share of albums with supported neighbors, and how CF compares with a popularity + content baseline. Only show collaborative rows where those numbers hold up.
- **Similar albums** on every album page: neighbors from `item_neighbors`, with an artist-graph and genre fallback.

### Phase 2 (handoff 12, a recommendation service): a hybrid model, **one learned component at a time**
Order: ALS/BPR vs the phase 1 baseline first. Add text embeddings only if they show a measured gain. Add LambdaMART only if it shows a measured gain on top. Each step needs its own offline result and its own A/B test.

- **A Python batch service** (outside Edge Functions, which run Deno and aren't meant for ML). Start with a scheduled job, a GitHub Actions cron or a small worker on Modal or Fly, that reads from a read-only Postgres replica or role and writes results back.
  - **Model:** implicit-feedback matrix factorization (ALS or BPR) on logs, likes and queue adds, plus explicit ratings. Or a hybrid model that also uses item features (genres, artist graph, year, type, text embeddings), which helps cold-start albums.
  - **Text embeddings:** a sentence-embedding model over review text, aggregated per album ("how people describe it"), stored in **pgvector** (supported on Supabase, verified). This powers "similar vibe" search and features.
  - **Ranking:** a gradient-boosted learning-to-rank model (for example LightGBM LambdaMART) over the candidates, trained on Discover interactions. Positive labels: queue add, log, rating ≥ the user's mean. Negative: "not interested", or ignored after several impressions.
  - **Re-ranking:** MMR diversity on embeddings, at most 2 per artist per page, a novelty boost tuned per user by their exploration rate, and a freshness boost for new releases.
- **Outputs:** `recommendations(user_id, target_type, target_mbid, score, reason jsonb, model_version, generated_at)` and `item_neighbors`. Discover and the album pages read these tables only.

### Phase 3 (roadmap)
Sequence-aware models (what you log next), two-tower retrieval in pgvector, real-time updates after each rating, and audio embeddings if licensing allows.

## 5. Feedback, evaluation and keeping it honest
- **Capture events from day one** (start in handoff 05): `interaction_events(user_id, kind open|queue_add|log|rate|like|dismiss|not_interested, target, surface, rec_id, model_version, eligibility, created_at)`. Follow the D27 rules. Keep events for 18 months, then aggregate.
- **Decision logging (from 11), separate from impressions:** when the system *chooses*, log the eligible candidates, the chosen item, its selection probability (and the conditional probabilities when a shelf is chosen and then an item within it), the policy version and the slot. Deterministic phase-1 slots log a probability of 1 and are **never** used for off-policy estimates.
- **Impressions (from 11):** log a recommendation card only when it's **actually seen** (at least 50% in the viewport for at least 500 ms), with item, position, surface, model version, time and a deduplicated impression ID. Candidates that were generated but never displayed get no impression. Without this, "ignored" labels and attribution aren't reliable.
- **Keep the outcomes separate:** queue add = *interest*, log = *listened*, rating = *how it landed*. A low rating means the recommendation got tried and wasn't liked. That's a different outcome from being ignored, and it's never treated as a positive.
- **Feedback strength:** an explicit "Not interested" counts for more than an ignored impression. Dismissals expire after a named period ("show again later"), unless the user chose "never".
- **Fallback for users whose ratings are all the same or who have only one rating:** "rated above their own average" can't trigger for them, so their success is measured by log-after-recommendation and queue-add instead.
- **Card actions:** "Not interested" (a strong negative), **"Already listened"** (not a negative: the album was a good fit but isn't a discovery, and it opens quick log), and "Hide this artist". Each is stored separately, never merged into one signal.
- **Sampled satisfaction:** besides Y10, occasionally ask about an exposed card the user *didn't* log, with options "Good pick", "Not for me" or "Haven't listened yet". This avoids only ever hearing from people who logged.
- **Offline evaluation** (in CI for the model service): Recall@20, NDCG@20, catalog coverage, novelty and intra-list diversity. A new model ships only if it beats the current one on NDCG without hurting coverage.
  - **Split by when earwrm *learned* something** (ingestion or confirmation time), not by `listened_on`. A 2021 listen imported today wasn't available to yesterday's model, and backdating is a core feature.
  - Popularity, neighbors and embeddings for each fold use only data available before its cutoff.
  - Report sparse-history users (≤5 ratings) separately, so gains for heavy raters can't hide a worse onboarding experience.
- **Online evaluation:** A/B buckets (stable per user) compare queue-add rate, log-within-30-days rate, the average centered rating of recommended albums that later get logged, and dismiss rate. **Main metric: qualified discoveries per 100 assigned eligible users over a fixed window**, compared between stable randomized groups.
  - A *qualified discovery* is a previously unlogged album that was **shown**, then **logged** within the window, and **positively rated**: at or above `max(3.5★, the user's smoothed mean)`. Users with fewer than 5 ratings use a fixed 3.5★ cutoff.
  - Bulk imports and backdated logs never count.
  - **Freeze each user's smoothed mean and their "fewer than 5 ratings" status when they're assigned** to an experiment, so recommendations can't move the bar their own success is measured against.
  - Each user–album pair counts **once**. The window for logging and rating is fixed (e.g. 30 days after first exposure), and the rating that counts is the **first** one given inside the window.
  - **The 3.5★ floor is an owner choice**, recorded as such. A secondary metric tracks positive discoveries for strict raters (users whose frozen mean is below 3.0).
  - Report the funnel with **queue as an optional branch**: shown → (queued) → logged → positively rated. Going straight from shown to logged counts.
- **Guardrails:** no albums from blocked users' activity, no private data leaking (pgTAP and integration tests), and popularity bias tracked through coverage.
- **Explanations everywhere.** Every recommendation stores its main reason. If it can't be explained, it doesn't get shown.

## 6. What the data model needs to capture now (so phase 2 isn't blocked later)
- Ratings and logs stored with timestamps. Never overwrite history (05 already does this).
- Lists with positions (08).
- Interaction events (from 05 onward).
- Follows (04 tables).
- Genre and artist-relationship enrichment cached during 06's enrichment, with the source and license stored per row.

## 7. Techniques borrowed from YouTube, TikTok and Spotify
Every technique below comes from the company's own paper or post, linked in the Sources section. "Adapted" explains how it changes for earwrm, which has explicit star ratings and logs rather than playback data.

### From YouTube
| # | Technique (source) | earwrm adaptation | Phase |
|---|---|---|---|
| Y1 | **Two stages: candidates, then ranking** ("classic two-stage information retrieval dichotomy") | Already in §4 | 1–2 |
| Y2 | **Predict the *next* action, not a random held-out one.** A random held-out watch "leaks future information" | Train and evaluate on "what does this user log next", with time-ordered splits by when earwrm learned it (§5) | 2 |
| Y3 | **The "example age" feature:** the training example's age goes in as a feature during training and is set to 0 at serving, which removes "an implicit bias towards the past" | Add example age to the ranker so new releases aren't held back just because they have less history | 2 |
| Y4 | **Optimize for quality, not clicks.** "Ranking by click-through rate often promotes deceptive videos". YouTube counts only "valued watchtime" (videos rated 4–5★ in surveys) | earwrm already has explicit ratings. The goal is a **valued listen**: a recommended album the user logs *and* rates at or above their own mean. Opens and clicks are weak signals only | 1–2 |
| Y5 | **Per-user signal weighting:** if you share everything, "our system will know not to heavily factor in your shares" | Normalize every signal per user: mean-centered ratings (§3), and likes, favorites and queue adds divided by that user's own rate of doing them | 1 |
| Y6 | **A fixed number of training examples per user,** "effectively weighting our users equally" | Cap training examples per user so heavy raters don't dominate the shared model | 2 |
| Y7 | **Multitask ranking:** predict engagement *and* satisfaction, combined with tuned weights. MMoE came later | The ranker predicts P(queue), P(log), P(rating ≥ mean), P(like) and P(review), then combines them with tuned weights. Start with a separate model for each; try MMoE only at scale | 2 |
| Y8 | **A shallow tower for position bias:** position goes in as a training feature, and "At serving time, position feature is treated as missing" | Log card position on every impression (§5). The ranker learns a position-bias term during training and drops it at serving, so top slots don't teach themselves | 2 |
| Y9 | **Demote what was shown and ignored:** a video recommended but not watched gets demoted "on the next page load" | Every impression without a click lowers that item's score for that user, decaying over about 2 weeks | 1 |
| Y10 | **Satisfaction surveys** feed a model that predicts satisfaction for everyone | An occasional one-tap prompt on a recommended album the user has logged: "Good recommendation? 👍 👎" (at most one a week). Used as a label and a metric | 2 |

### From TikTok
| # | Technique (source) | earwrm adaptation | Phase |
|---|---|---|---|
| T1 | **Strong signals count more than weak ones** (finishing a longer video > weak indicators) | Signal strength, strongest first: review with high rating > rating > log > favorite or like > list add > queue add > open > impression. Weights are named constants, then learned in phase 2 | 1 |
| T2 | **Break up repetition:** never "two videos in a row made with the same sound or by the same creator", and anything already seen is excluded | In any feed or shelf: no two adjacent items from the same artist, at most 2 per artist per shelf, never anything already logged or dismissed, and no label or genre streaks over 3 | 1 |
| T3 | **Diversity injection** to "stumble upon new content categories" | An **exploration slot**: about 1 in 8 recommendations comes from outside the user's usual genres and eras, drawn from well-rated albums. The share is tuned per user by their exploration rate (§3) | 1 |
| T4 | **Cold start:** pick interest categories, or else start with "a generalized feed of popular videos" | Genre picks plus an optional "rate albums you know" step, otherwise popular-on-earwrm (§4) | 1 |
| T5 | **Follower count isn't a direct factor** | Rank reviews and lists on Discover by their quality signals (likes from distinct users, compared with what's expected for their age), **not** by the author's follower count, so new reviewers can surface | 1 |
| T6 | **Eligibility gates:** new, under-review or spam content may be ineligible | Reviews and lists can only be recommended after basic moderation checks pass and once they're a few hours old. Anything reported and under review is excluded | 1 |
| T7 | **"Not interested" plus hiding a creator or sound** | "Not interested" plus **"Hide this artist"** on every card. Both are strong negatives, and hiding an artist is permanent until undone | 1 |
| T8 | **Fast feedback with online training** (Monolith: real-time training, sync every minute or so) | No real-time training at our scale. Instead, **in-session re-ranking**: right after a rating or dismissal, re-score that user's cached candidates cheaply (boost neighbors of what they just rated 5★, suppress neighbors of what they dismissed). There's no model retrain, but it feels responsive | 1 |
| T9 | **Frequency filtering and expiring embeddings** (Monolith: IDs need a minimum count before they're stored, and inactive IDs expire) | Only learn embeddings for items with at least N interactions (this sits alongside the D27 minimum support). Embeddings for items with no activity for 12 months are dropped and rebuilt on demand | 2 |

### From Spotify
| # | Technique (source) | earwrm adaptation | Phase |
|---|---|---|---|
| S1 | **Embeddings learned from playlist co-occurrence:** "word2vec ... on user-generated playlists" (850M+) | **item2vec** on earwrm **lists** and on each user's **log sequences**. It's cheap, works on small data, and gives strong "goes together" vectors. It's the first learned model to try in phase 2, before matrix factorization | 2 |
| S2 | **Explore, exploit and explain with bandits (Bart):** jointly choose the shelf title (the explanation) and its items, using epsilon-greedy exploration with logged propensities and counterfactual evaluation (normalized capped importance sampling) | Home becomes **titled shelves** ("Because you loved *Blonde*", "New from artists you rate", "Your circle is into", "Outside your usual"). Pick shelves and items with epsilon-greedy, and **log the propensity** on each impression. That allows **off-policy evaluation** of new policies from logged data, which matters a lot while the user base is too small for well-powered A/B tests | 2 (log propensities from 1) |
| S3 | **Calibration:** learn each user's best content mix by context instead of using historical averages (contextual bandits) | Calibrate each user's genre, era and content-type mix (albums vs songs vs lists vs reviews) to their history, so For You isn't 100% their top genre. Context-aware (time of day, weekday) only once there's data | 1 (static), 2 (contextual) |
| S4 | **A diversity guardrail:** algorithmic listening is "more clustered" than organic. "Generalist users are much more likely to remain on Spotify", and recommendations "can be effective in the short-term while potentially being partially counterproductive in the long-term" | Track each user's **taste spread** (average cosine distance between logged albums and the user's centroid) as a guardrail metric. A model that lifts short-term queue-adds but shrinks taste spread doesn't ship. Specialists get more relevance, generalists more breadth (T3's per-user tuning) | 2 |
| S5 | **LLM-generated shelf ideas:** natural-language "hypotheses" describing a personal shelf, filled from the catalogue (2026) | Roadmap: per-user themed shelves ("late-night jazz-rap you'd like") written by an LLM and filled with constrained retrieval over the catalogue. Only after S2 exists | 3 |

### Revisions after review (these override the tables above)
- **Phase 1 keeps:** candidates then ranking, optional cold start, titled shelves, hide and dismiss controls, T8 in-session re-ranking (it reacts differently to a 1★ log and a 5★ log, and is scoped to the acting user's cache only), and exposure plus decision logging.
- **Revised before implementing:**
  - Y2/Y4: exclude bulk imports and backdated edits from "next discovery" labels.
  - T1: use *signed* preference, so a 1★ rating or review is strong evidence of **dislike**, not of engagement.
  - Y9: an impression is exposure, and only repeated ignores count as weak negatives.
  - Y5: smooth per-user base rates with a prior, so one rare action doesn't dominate.
  - T2/T3: repetition caps and the exploration slot relax when metadata is missing or the eligible pool is small.
  - **T6:** no automatic age delay for content from people you follow. Moderation and access rules apply immediately, and a delay for broad algorithmic distribution is added only if abuse data calls for it.
- **Conditional experiments**, each with promotion criteria:
  - Y3 example age handles drift during the training window, not new-release fairness.
  - Y7/MMoE and the Y8 position tower only once there's reliable exposure variation.
  - S1 item2vec only once lists and log sequences have enough repeated co-occurrences. Use only **ranked** lists or actual log order for sequences, never unranked lists or import-generated sequences.
- **Monitor, don't veto:** S4 taste spread is a cohort metric, reviewed next to satisfaction. A specialist going deeper isn't a failure.
- **Deferred:** T9 embedding expiry (quiet catalog albums can stay great picks).
- **Constants are labeled experiments:** 2 weeks, streaks of 3, 1 in 8, and k = 5 are all named constants with a reason recorded, so they can be tuned.
- **S2 pilot first:** fix one shelf and one slot. On **5% of eligible requests**, pick uniformly from 5 safe, relevant candidates. **"Stable per user" means one draw per user per experiment window, saved and reused on refresh.** Log the selection probability for that one draw. Showing the saved pick again counts as another exposure, not a new randomized selection. Use NCIS only to *screen* a policy, and only when all of these hold:
  - the alternative policy has support in the logs
  - the effective sample size is adequate
  - results are stable across clipping thresholds
  - a user-clustered confidence interval can resolve a minimum lift chosen in advance
  - a rehearsal recovers a known randomized comparison from the logs

  Promotion always needs an online A/B test. As a rough guide, 10,000 eligible decisions give about 500 randomized ones, which isn't enough on its own.
- **Order of re-ranking (T3/S3/S4):**
  1. apply access, moderation, blocks, hidden artists and dismissals
  2. rank by relevance and apply artist limits
  3. calibrate the ordinary shelves toward the user's mix as a **soft target**, with missing genre treated as unknown
  4. fill the labeled exploration slot when there's a credible candidate (fewer if the user keeps dismissing it)
  5. monitor taste spread

### Not adopted (and why)
- **Watch or listen time as the objective.** earwrm has no playback. Explicit ratings are a better signal anyway (YouTube had to add surveys to get one).
- **Real-time model training at Monolith's scale.** It's unnecessary at our size, and T8 covers the user experience.
- **Device and account features as ranking signals.** TikTok gives them low weight, and they add privacy cost for little gain here.
- **Audio-based similarity.** No licensed source (§1).

### Sources for §7
- Covington et al., *Deep Neural Networks for YouTube Recommendations* (2016): https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/45530.pdf
- Zhao et al., *Recommending What Video to Watch Next: A Multitask Ranking System* (2019): https://research.google/pubs/recommending-what-video-to-watch-next-a-multitask-ranking-system/ (the full text came from a mirror, so check numbers against the official copy)
- YouTube, *On YouTube's recommendation system* (2021): https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/
- TikTok, *How TikTok recommends videos #ForYou* (2020): https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you
- ByteDance, *Monolith: Real Time Recommendation System With Collisionless Embedding Table* (2022): https://arxiv.org/abs/2209.07663
- Anderson et al., *Algorithmic Effects on the Diversity of Consumption on Spotify* (2020): https://research.atspotify.com/publications/algorithmic-effects-on-the-diversity-of-consumption-on-spotify/
- McInerney et al., *Explore, Exploit, and Explain* (2018), from the author's summary: http://jamesmc.com/blog/2018/10/1/explore-exploit-explain (the PDF couldn't be fetched, so read the paper before implementing S2)
- Feijer et al., *Calibrated Recommendations with Contextual Bandits* (2025): https://research.atspotify.com/publications/calibrated-recommendations-with-contextual-bandits
- Petrov et al., *Hypothesis-Driven Shelf Generation for Personalised Recommendation* (2026): https://research.atspotify.com/publications/hypothesis-driven-shelf-generation-for-personalised-recommendation
