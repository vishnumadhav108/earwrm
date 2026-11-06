# 10: Library stats and recaps

**Branch:** `feat/library-recaps`. Two PRs: 10a for Library, 10b for Recaps.
**Goal:** your diary turned into stats and recaps. Everything is based on what you've logged.
**Depends on:** 05. Uses 07 (imported history) when it's there. 09 is optional; it's only needed to share recaps to the feed.

## 10a: Library tab
Delete anything you don't want before running this.

**Overview**
- [ ] Range picker: this week, this month, this year, last year, all time, custom
- [ ] Albums and songs logged, re-listens, reviews written, average rating, and the change vs the previous period
- [ ] Logging streak (in weeks)

**Top lists**
- [ ] Most-logged artists, most re-listened albums, highest-rated albums and songs in the range

**Ratings**
- [ ] Your rating distribution (histogram)
- [ ] Average rating by release type, by decade released and by year logged
- [ ] "Your hottest takes": where your rating differs most from the **public** earwrm average (D19), in either direction

**Patterns**
- [ ] Logs per month (trend)
- [ ] Calendar heatmap
- [ ] Decades and release years you've logged
- [ ] Release types (album, EP, single, mixtape)

**Firsts and history**
- [ ] Year-by-year diary summaries
- [ ] Artists you discovered this year (first logged)
- [ ] Albums whose rating changed the most

**Imported listening history** (only for users who kept listening stats in handoff 07; hidden otherwise)
- [ ] "Listening history (imported)": most-played artists and albums, plays by year, and hours listened. It's labeled with the source and date range, and kept separate from diary stats.
- [ ] Firsts use the earliest play date from `import_listening_stats` (only if the user kept stats in 07) when it's earlier than the first diary entry.

**Profile widgets** (for the 04 showcase)
- [ ] Ratings spread, Top artists, This year in numbers

**Rules**
- All numbers come from SQL functions (security invoker, respecting `privacy.diary`). They take `(user_id, start, end, tz)`.
- Each one must run under 150 ms on the scale seed. Paste the `explain analyze` output in the PR.
- Charts are hand-built SVG in `src/components/ui/charts`, styled per DESIGN.md (hairlines, the `fill-strong` bars, `accent-lt` highlights, Geist Mono numbers), with tap to inspect, empty states, skeletons and reduced-motion support.
- You can open another user's Library (read-only) if their diary is visible to you.

## 10b: Recaps
1. **Generation:**
   - A scheduled Edge Function runs in each user's own timezone. Weekly runs on Monday for the previous Mon–Sun, monthly on the 1st, and yearly with a "so far" version from Dec 1 and a final one on Jan 1.
   - It only uses the 10a functions, so the numbers always match Library.
   - It's idempotent: running it twice for the same period does nothing.
   - Recaps are also generated on demand when a user opens a period that doesn't have one yet.
   - Skip weeks with no logs.
2. **What's in each:**
   - **Weekly:** what you logged (a cover grid), average rating, top-rated, reviews you wrote, and the review of yours that got the most likes.
   - **Monthly:** the weekly contents plus changes vs last month.
   - **Yearly** (a Wrapped-style tap-through story): total logged, top artist, highest-rated album and song, most re-listened, your hottest take, your rating spread, the decade you logged most, new artists, your most-liked review, and the lists you made.
3. **UI:**
   - A recap card at the top of the Diary until you dismiss it.
   - A Recaps section in Library.
   - The yearly story: full screen, tap or swipe through, progress bars, reduced-motion support. Headlines and big numbers use Geist Serif display-xl over large album art (DESIGN.md → Recap story cards).
   - The settings toggle hidden in 02 comes back as "Recap notifications".
4. **Share images:** 1080×1920 story images and 1200×630 OG images built with `next/og` (check the Next 16 docs) and cached in Storage. Share uses the Web Share API, falling back to a download. `/recap/[id]` follows the recap's visibility, which defaults to the user's `privacy.diary`.
5. **Feed:** "Share to feed" posts the recap to the 09 feed. Only show this when 09 is merged.
6. **Demo mode:** a ready-made weekly recap, monthly recap and yearly story.

## Tests
- **pgTAP:** every stats function, with expected numbers from fixed seed data; timezone edge cases (11pm Sunday in Chicago); recap generation is idempotent; recap numbers match Library.
- **Unit:** range math, DST, hottest-take ranking.
- **E2E:** each Library section in demo mode; click through the full yearly story; export the image; `/recap/<id>` signed out, with public and with private visibility.
