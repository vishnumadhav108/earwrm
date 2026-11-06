# 12: Recommendation service (phase 2)

**Branch:** `feat/recs-v2`. Use 3 PRs:
- 12a: service scaffold and the offline evaluation harness
- 12b: models and candidates
- 12c: ranking, re-ranking and the online A/B

**Goal:** move Discover's "For you" and "Similar albums" from SQL heuristics (handoff 11) to a hybrid model that's measurably better.

**Depends on:** 11. About 500 active raters and 20k ratings is a **checkpoint for starting experiments**, not a launch rule. Also report co-rating overlap, meaning the share of users with neighbors and the share of albums with supported neighbors, plus enough logged impressions from 11 to train on.

**Read:** `docs/RECOMMENDATIONS.md` (all of it), DECISIONS D19, D22, D25 and D27.

## 12a: Service and evaluation harness
- `services/recs/`: a Python 3.12 project (uv or poetry) with typed config, a read-only DB role, and Docker.
  - It runs as a scheduled batch: nightly, plus an hourly incremental pass for users whose activity changed. Start on GitHub Actions cron or Modal. Explain the choice in the PR.
  - It writes to `recommendations`, `item_neighbors`, `user_taste` and `item_embeddings` (pgvector).
- The data export follows the privacy rules in RECOMMENDATIONS §2:
  - Shared training follows D27: signals at any visibility (review text only as album-level blends with at least 5 reviewers for non-public text, D27 §12), distinct-contributor support per item and per pair, and imports and backdated edits excluded from discovery labels.
  - Users with the admin `exclude_from_shared` flag are left out of every shared artifact, and the privacy tests (RECOMMENDATIONS §2) run in CI.
  - **Permissions:** a role with read access to approved training **views** only (built from D27, with distinct-contributor support and the review-text exclusion applied inside the view), and a separate role allowed to write only to versioned output tables.
  - **Atomic publish:** a model version is written in full, then switched live in one step, so a failed job can never mix new neighbors with old explanations.
  - Add a test with fixture users for each case.
- The offline evaluation harness: a time-based split, Recall@20, NDCG@20, coverage, novelty and diversity. Results go to `eval_runs` and print as a table. The handoff 11 SQL recommender is the baseline every new model has to beat.
- Run the eval in CI on a synthetic dataset, so the pipeline stays tested even without real data.

## 12b: Models and candidates
- **Order of learned components** (RECOMMENDATIONS §7):
  1. **S1 item2vec** on lists and log sequences
  2. ALS/BPR
  3. a ranker with equal user weighting (Y6). Multitask (Y7), the position tower (Y8) and example age (Y3) come only as conditional experiments
  4. text embeddings
  - Each component ships only if it beats the previous best offline.
- **S2 bandit shelves:** epsilon-greedy over shelves and items, using the propensities logged since 11, and **off-policy evaluation with normalized capped importance sampling** used as a screen only, under the conditions in RECOMMENDATIONS §7 ("Revisions after review"). Promotion always needs an online A/B test.
- **S4 taste spread:** a cohort monitoring metric, reviewed next to satisfaction. It's **not** an automatic veto.
- **Y10:** a weekly one-tap "Good recommendation?" prompt adds satisfaction labels.
- **T9:** frequency-filter embeddings and expire inactive ones.
- An implicit-feedback matrix factorization (ALS or BPR), plus a hybrid variant that uses item features (genres, artist graph, year, type). Keep whichever wins on NDCG.
- Review-text embeddings (D27 §12): a small open sentence-embedding model run in batch, never storing per-review vectors in shared tables, and visible vibe labels drawn only from public reviews. Aggregate them per album and store them in pgvector with an HNSW index (check the current pgvector syntax). Add a "Similar vibe" row on album pages.
- Candidate sources, as listed in RECOMMENDATIONS §4. Each tags its source for explanations.

## 12c: Ranking, re-ranking, online test
- A LightGBM LambdaMART ranker trained on `interaction_events` labels, with the features listed in RECOMMENDATIONS §4. It falls back to the MF score when there isn't enough labeled data.
- Re-ranking: MMR diversity, at most 2 per artist, a novelty boost tuned by each user's exploration rate, a freshness boost, and removal of anything logged, queued or dismissed.
- Every row stores `reason` (source, anchor album, or the similar-user group as a count, never a hidden person) and `model_version`.
- A/B: stable per-user buckets, behind a kill switch. Build a dashboard query for the online metrics in RECOMMENDATIONS §5.

## Tests
- **Unit:** feature building, mean-centering, significance weighting, MMR, the explanation builder.
- **Privacy tests:** a private rating never changes another user's recommendations or `item_neighbors`. A blocked user's activity never shows up.
- **Integration:** a full batch run against seeded local Supabase gives deterministic output.

## Acceptance criteria
- The new model beats the handoff 11 baseline offline on NDCG@20, with coverage at or above the baseline. Paste the numbers in the PR.
- The kill switch puts Discover back on the 11 baseline in under a minute.
- No recommendation ships without an explanation.
