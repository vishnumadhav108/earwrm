# Proposed amendments, plan review 2026-11-16

**None of this is applied.** Each amendment names its target file, the decision it rests on (`DECISION-REGISTER.md`), and the exact text. `handoffs/PR-01-adopt-amendments.md` is the handoff that would apply them.

How to read an entry:
- **Add** means new text. **Replace** quotes the text that exists today, then gives the new text. **Delete** quotes what goes.
- Every amendment here rests on an answer. Nothing waits: Q30, Q31 and the register's § 5 were answered on 2026-11-16.
- Nine amendments come from proposals in the approved plan that had no question of their own: AM-13, AM-22, AM-24, AM-43 (the two gate checklists), AM-51, AM-57, AM-58, AM-84 (the cohort queries) and AM-85 (the push table). Vishnu approved all nine in the register's § 5.
- External facts carry a source and "read 2026-11-16", or the word **unverified**.

Contents: 1 DECISIONS · 2 ROADMAP · 3 ARCHITECTURE · 4 DESIGN · 5 COSTS · 6 EXTERNAL-SOURCES · 7 docs/README · 8 root README · 9 CONVENTIONS and CLAUDE.md · 10 RECOMMENDATIONS · 11 handoffs

---

## 1. `docs/DECISIONS.md`

### AM-01. Status index (Q21). Add after the opening paragraph.

```markdown
## Status index

Added 2026-11-16 (plan review, Q21). This index is the only part of this file that gets edited. Update it in the PR that adds an entry.

| Entry | Status |
|---|---|
| D1–D8 | Accepted |
| D9 | Accepted, as revised by D21 |
| D10–D12 | Accepted |
| D13 | Accepted, clarified by D35 |
| D14, D15 | Accepted |
| D16 | Accepted. Its first rule is revised by D37 |
| D17–D20 | Accepted |
| D21 | Accepted. Its session and raw-row bullets are revised by D37 |
| D22 | Accepted. One sentence replaced by D27 |
| D23 | Historical. Superseded by D25, D26 and D27, except its explanation row |
| D24 | Accepted |
| D25 | Accepted. Its notice wording is replaced by D27 |
| D26 | Superseded by D27 |
| D27 | Accepted |
| D28 | Accepted. Its platform ranking is superseded by D34. Its badge list, labels, data hooks and implementation rules stand |
| D29, D30 | Accepted |
| D31 | Accepted, refined by D41 |
| D32 | Accepted |
| D33–D41 | Accepted 2026-11-16 (plan review) |

**Implementation notes that sit inside decisions:** D20's pointers to handoff 05 and `IDENTITIES.md`; D21's queue metrics; D27 § 10–12; D28 "Implementation rules"; D29's detection job.

**Owner choices recorded outside this file:** the 3.5★ floor (RECOMMENDATIONS § 5); "Early on earwrm" counts logs at any visibility (handoff 13).
```

### AM-02 to AM-09. Append after D32. Never edit earlier entries.

```markdown
**D33. Two first-class clients, one backend.** *(2026-11-16. Vishnu's goal; plan review Q1.)*
earwrm is built to last, to the highest quality Vishnu can reach, for people who want to use it and keep coming back. It has two first-class clients on one backend:
- phone apps for iPhone and Android. They are the main experience, and iPhone comes first.
- a website designed for desktop and mobile browsers as its own product, not the phone app in web form.

It works equally well for Apple Music users, Spotify users and anyone who listens elsewhere, and depends on no single streaming service. It costs $0 until Vishnu chooses to upgrade, and going commercial later stays possible. Where an older entry or doc says "personal project", "personal-use" or "Apple-first", this entry wins.

**D34. Badges are service-neutral.** *(2026-11-16. Supersedes D28's platform ranking. Plan review Q8, Q9.)*
- These parts of D28 no longer apply: the words "Apple-first" in its title; "The iPhone app is the main platform, and on-device Apple Music scanning is its headline feature"; and "Spotify users get an optional Last.fm prompt during onboarding".
- Evidence sources are ranked by strength, not by service:
  1. the log's server timestamp
  2. on-device play data in a phone app, where the platform offers it and a spike has shown it works
  3. scrobbles from a scrobble service the user connects
  4. the user-supplied history import
- The scrobble bridge supports two providers, Last.fm and ListenBrainz. It is offered to every user, whatever they listen on. Each provider sits behind its own feature flag and is on only while its terms allow earwrm's use.
- Badges from log timing (13a) ship regardless. Badges from the import (13b), the scrobble bridge (13c) and any on-device scan are built only when two things are known: the people using 13a care about badges, and, for the scan, the spike passed. Vishnu decides then.
- The phone apps' headline is fast logging and the people you follow, not scanning.
- Everything else in D28 stands: the badge list, the honest labels, the data hooks (they are still built in 05, 06 and 07, because they can't be added later) and the implementation rules.

**D35. The client contract.** *(2026-11-16. Clarifies D13. Plan review Q4.)*
iPhone, Android and the website use the backend the same way. The rules live in `docs/CLIENT-CONTRACT.md`, written in handoff 03 before any route. In short:
1. Route handlers accept a cookie session or an `Authorization: Bearer` access token. API paths answer 401 as JSON. They never redirect.
2. Every business rule lives in a SQL function. Each screen's read is one SQL function that any client can call, and the website's server components call the same one.
3. The data core (typed queries and mutations, schemas, `src/lib`) imports nothing from Next.js, the DOM or cookies, so it can become a shared package when the apps start.
4. Writes are idempotent. The client supplies the row's UUID, and a repeated write changes nothing.
5. Once an app is in a store, backend changes only add. Removing something waits until a minimum-version flag has moved old app versions on.
6. A safe subset of the feature flags is readable by every client, so kill switches reach the apps.
7. Push subscriptions for every channel (web push, iPhone, Android) live in one table.
8. Realtime is an enhancement. Every screen works by fetching alone.
9. Account deletion, data export, reporting and blocking are plain API calls every client can make.
10. Design tokens come from one typed, platform-neutral file.

**D36. Sign-ups are limited by region and age at first.** *(2026-11-16. Applies D27 § 8. Plan review Q11, Q12.)*
- Until the public-launch gate, sign-up is refused for people connecting from the EEA, the UK and Switzerland. The Terms say earwrm isn't offered there yet. Public pages stay readable.
- The minimum age is 13, asked with a neutral age screen: one that doesn't hint at the answer that passes.
- Both rules are reviewed together before those regions open. Opening needs representatives where the law requires them, a written assessment of the legal basis for D27's use of private activity, and Vishnu's decision on whether those users get a self-serve objection control (which would change D25). This is not legal advice.

**D37. The import uploads candidate sessions, not play rows.** *(2026-11-16. Revises the first rule of D16 and the session and raw-row bullets of D21. Plan review Q10. To be confirmed at the import-contract gate.)*
- Parsing **and session grouping** run on the user's device. Only candidate album sessions are uploaded: for each one, the artist and album names, the session window, and for each distinct track its name, service track ID and play-end time. Plays that belong to no candidate session never leave the device.
- The server matches names to MusicBrainz, applies the edition and threshold rules, and writes proposals. The rest of D21 stands: proposals carry evidence and the user confirms them; ambiguous matches stay unresolved; only system-verified matches enter the shared cache; undo keeps entries the user has edited.
- Uploaded candidates are temporary, as staging rows were: deleted after confirmation, cancellation or 7 days.
- Before 07 is built, a demand test runs with the first cohort: an "Import your listening history" entry with a "Tell me when it's ready" button. 07 is scheduled from the result.
- A separate, small ratings import (a CSV of album, rating and date) lets people bring ratings from other diary apps. It follows the same private-by-default and undo rules.
- If the contract gate finds that grouping on the device can't support D21's rules, this entry is revisited before 07 starts.

**D38. Phone apps: one codebase, in this repository.** *(2026-11-16. Plan review Q2, Q3, Q23.)*
- Expo / React Native, in this repository, sharing the data core with the website (D35).
- iPhone and Android are built from the same codebase from the start. Only Android's store release follows iPhone's.
- App work (M1) starts after handoffs 06 and 09a-1 and runs in parallel with the remaining web handoffs.
- Sign-in in the apps: email, Sign in with Apple and Google, from M1.
- The on-device scan spike (S-1) is separate, needs no backend, and can run at any time.

**D39. Navigation, friends and the Home feeds.** *(2026-11-16. Plan review Q7, Q26–Q29.)*
- **Phone tab bar, left to right:**
  1. **Home**, with two segments. "Following" is the default until there's enough activity. "For You" is the other.
  2. **Discover:** shelves, charts, popular lists, recommendations, search entry points.
  3. **+**: opens the action sheet.
  4. **Social:** find and add people, follow requests (for private accounts), followers and following, notifications, and an activity feed of likes, queue adds, list adds and follows. Direct messages will live here later.
  5. **Library**, with segments Diary, Lists, Queue and Stats/Recaps.

  Profile and settings open from the avatar in the top corner.
- **Website top nav:** Home, Discover, Social, Library, a Log button, search, and the avatar menu. It uses wider layouts and is designed as its own product.
- **Friends.** Follows stay one-way (D10). When two people follow each other, they are friends. Only friends can message each other. Sections that show people you follow are named "Following", never "Friends".
- **Home › Following** shows only content from accounts the viewer follows (public accounts, and private accounts that approved the viewer), whatever `can_view` allows.
- **Home › For You** may show anything the viewer is allowed to see, ranked by relevance: public content from anyone, when both the account and the item are public, plus content from followed accounts that's visible to the viewer, including followers-only items. It never shows anything `can_view` would hide from that viewer, and never anything from a user blocked in either direction. Before handoff 11, "relevance" means popular and recent reviews of albums the viewer has logged or by artists they follow.
- D19's "effectively public only" rule still governs public aggregates (averages, counts, charts, Discover). It doesn't govern these two personal feeds.
- Both feeds are built per viewer and checked at read time (D24, D27 § 3 and § 5). They are never served from a shared cache. A leak test proves that a private account's items appear in For You only for its approved followers.
- **Social activity feed:** an item appears only if the actor's "Activity in others' feeds" setting is on and the viewer may see the underlying object. Queue adds follow the diary setting. A block removes items at once. The details are settled at the privacy gate before handoff 04.
- **Until 09a-1 ships,** the app opens on Library › Diary, and Home, Discover and Social show "Coming soon".
- **Direct messages** aren't built now and aren't part of handoff 09. They are a planned handoff after 09 (ROADMAP), with their own privacy, blocking, reporting and moderation rules.

**D40. Paid steps happen at named gates.** *(2026-11-16. Plan review Q13, Q14, Q22.)*
- **Domain:** bought before the first invite. The name is chosen before handoff 04b, so public URLs, share images and email links are built against it.
- **Backups:** from the first invite, a weekly scheduled local dump. The database credential is kept in a secure store (for example Windows Credential Manager), never in a script. Supabase Pro is taken at public launch.
- **Vercel:** ask Vercel during handoff 01 PR D2 whether a free public app fits the Hobby plan. Decide the plan at public launch.
- **App stores:** the Apple Developer Program and Google Play registration are joined when the app handoffs need them (M1 and M2). Vishnu confirms each at that point.
- COSTS rule 4 still applies to every add-on.
```

### AM-95. Append D41 after D40 (Q30).

```markdown
**D41. A placeholder username is never public.** *(2026-11-16. Refines D31. Plan review Q30.)*
- Every username chosen from handoff 04b on is 3–20 characters from `[a-z0-9_.]`.
- Usernames that exist before then (derived from an email address, or AUD-01's fallback) and the neutral default a new account gets (D31) are temporary placeholders. They stay valid only until the owner picks a username.
- The owner must pick one before the profile can be public, and the pick must satisfy the rule.
- A placeholder is never shown publicly: not on a profile, a review, a feed, a list, a URL or a share image.
```

---

## 2. `docs/ROADMAP.md`

### AM-10. Title (D33).
Replace `# Roadmap after handoff 12` with `# Roadmap after handoff 13`.

### AM-11. Item 1 (D33, D34, D38). Replace the whole item, keeping the spike's measurement list word for word.

```markdown
1. **Phone apps: iPhone first, then Android** (D33, D38). Expo / React Native in this repository, with native modules where needed, on the same backend under the client contract (D35). The website stays a first-class client throughout.
   - **S-1, the scan spike.** It needs no backend and can run at any time. **A 1–2 day spike** on a real iPhone (a free Personal Team is enough). Measure library vs non-library streams, downloaded vs streamed tracks, skips, repeat plays, offline playback and later sync, plays on another device, how fast timestamps and counts update, and behavior with background refresh unavailable. Also: what do `MPMediaItem.lastPlayedDate` and `playCount` cover (library vs streamed songs), how often does background refresh run, and how should a scan before a replay be handled? Record the findings in EXTERNAL-SOURCES. The result decides whether an on-device scan is ever built (D34).
   - **M1, phone app v1.** Starts after handoffs 06 and 09a-1, in parallel with the remaining web handoffs. Sign-in (email, Apple, Google), onboarding, Home, Discover and search, album, song and artist pages, the logging sheet and quick log, Library (diary, lists, queue), the Social people tools, profile, settings, account deletion, report and block. iPhone and Android build from day one. iPhone goes to TestFlight first.
   - **M2, Android store release.** A closed test on Google Play, then production.
   - **After that:** push notifications on both platforms (the table comes from 09a-2), home-screen widgets ("friend just reviewed…"), and, only if D34's conditions hold, on-device scanning for "Log this?" suggestions and Full Album Day One badges (evidence source `device`).
```

### AM-12. Item 4 (D37). Add at the end of the item.
`A ratings CSV import (album, rating, date) ships with handoff 07 (D37).`

### AM-13. Item 5. Add at the end of the item.
`On Android, opt-in tracking from any player may be possible through the notification listener. This is unverified. Research the platform and store rules before any plan.`

### AM-14. Item 6 (D39). Delete the line `   - DMs`.

### AM-15. New item 9 (D39). Add at the end of the file.

```markdown
9. **Direct messages: a planned handoff after 09** (D39). Only friends (two people who follow each other) can message each other. Messages live in the Social tab. Not built now, and not part of handoff 09.
   - **Fixed rules:** message content never trains recommendation models (D27 covers activity, not messages). Realtime carries a refresh signal only (D24). Blocking ends the conversation in both directions.
   - **Decisions it needs from Vishnu before a plan:**
     - the minimum age for messaging
     - text only, or links and images too
     - whether albums, reviews and lists can be shared into a message
     - how long messages are kept, and the unsend and delete rules
     - server-readable or end-to-end encrypted (reporting needs a moderator to see reported messages)
     - what a report shows a moderator
     - what blocking or unfollowing does to an existing thread
     - what a push notification may show
     - read receipts and typing signals
     - rate limits
     - what data export and account deletion do with messages
     - one-to-one only, or groups
     - a legal check before the EEA and UK open (D36)
```

---

## 3. `docs/ARCHITECTURE.md`

### AM-16. § 1 diagram (D33, D35). Replace the code block.

```
 Website (Next.js on Vercel, PWA)            Phone apps (Expo / React Native: iPhone, Android)
        │                                              │
        │   both use the same typed data core and the client contract (D35)
        │                                              │
        ├── reads and writes: SQL functions under RLS ─┼──────────────►  Supabase
        │                                              │                   ├─ Postgres: RLS on everything, stats tables, SQL functions
        ▼                                              ▼                   ├─ Auth
 Next.js route handlers (/api/*)  ◄── cookie session or bearer token      ├─ Storage: avatars, banners, list covers, recap images
   - search, album/song detail (cached)                                    ├─ Realtime: refresh signals only (D24)
   - catalog writes (D30), account, auth callbacks                         └─ Edge Functions ◄── Cron + Queues
   - link submission, history import upload, share images                       - enrich albums/songs (tracklist, blurb)
                                                                                - critic scores (Wikidata P444)
                                                                                - match imported sessions to albums
                                                                                - recompute stats
                                                                                - recs phase 1 (SQL CF, nightly)
                                                     Python recs service (12) ──► reads replica, writes recommendations / item_neighbors / pgvector embeddings
                                                            │
                                 MusicBrainz · Cover Art Archive · Wikidata · Wikipedia
```

### AM-17. § 2 (D38). Add after the table.

```markdown
Phone apps (from M1): development builds talk to the local stack or to `earwrm-staging`. TestFlight, Play test tracks and store builds talk to production. A store build can't be recalled, so once one is out, backend changes only add (D35).
```

### AM-18. § 3 (D38, D39).
Replace `    (app)/                  signed-in shell: home/feed, diary, library, discover, settings/import` with:
`    (app)/                  signed-in shell: home, discover, social, library (diary, lists, queue, stats), settings/import`

Add after the code block:
`From M1 the repository also holds the phone app (`apps/mobile/`) and the data core as a shared package. Until then, a lint rule keeps the data core free of Next.js and DOM imports (D35).`

### AM-19. § 4 data model (D34, D35, D39).
- Replace `- `badges(id, user_id, kind, target_type, target_mbid, source log|import|lastfm|ios, evidence jsonb, awarded_at, hidden)`` with:
  `- `badges(id, user_id, kind, target_type, target_mbid, source log|import|scrobble|device, evidence jsonb, awarded_at, hidden)`. For `scrobble`, the provider (Last.fm or ListenBrainz) is recorded in `evidence``
- Replace `- `profiles.main_service apple_music|spotify|other`, plus a Last.fm connection (session key in Vault) only if the user opts in` with:
  `- `profiles.main_service apple_music|spotify|youtube_music|tidal|other`, plus a scrobble-service connection (credential in Vault) only if the user opts in`
- In "Diary and ratings (05)", add: `- A diary entry's `id` may be supplied by the client, so a retried write creates one entry (D35).`
- In "Social (09)", add: `- `push_subscriptions(id, user_id, channel web|apns|fcm, token, created_at, last_seen_at)`: one table for every client`
- In "History import (07)", replace the `import_staging(...)` line with: `- `import_candidates(...)`: candidate album sessions built on the device (D37), allowlisted fields only, owner-only, **temporary**. Deleted after confirmation, cancellation or 7 days.`

### AM-20. § 5 album page (D39, Q20, Q27).
- In section 1, replace `and the action button (log, rate, like, queue, add to list, share).` with `the action button (log, rate, like, queue, add to list, share), and an "Open in…" row for the user's music service.`
- Replace `4. **Friends:** avatars of people you follow who logged it, with their ratings, plus "3 friends have it queued".` with `4. **Following:** avatars of people you follow who logged it, with their ratings, plus "3 people you follow have it queued".`
- Replace `7. **Reviews:** popular, recent and from friends, with likes and comments.` with `7. **Reviews:** popular, recent and from people you follow, with likes and comments.`

### AM-21. § 7 privacy model (D36, D39). Add rows to the table.

```markdown
| Home › Following | content from accounts the viewer follows, whatever `can_view` allows (D39) | – |
| Home › For You | anything the viewer may see: public content from anyone, plus followed accounts' content visible to the viewer. Never anything `can_view` hides, or anything from a blocked user in either direction (D39) | – |
| Social activity feed (likes, queue adds, list adds, follows) | shown only if the actor's activity setting is on and the viewer may see the underlying object. Queue adds follow the diary setting (D39) | follows the activity setting |
| Sign-up | refused from the EEA, the UK and Switzerland until the public-launch gate; minimum age 13 (D36) | – |
```

Add after the bullet list: `- Home feeds are built per viewer and checked at read time. They are never served from a shared cache.`

### AM-22. § 8 quality bar (D33). Add.

```markdown
- **Three clients, one rule set.** A business rule never lives only in one client's code (D35).
- **Website:** every action that a phone reaches by long-press or swipe also has a pointer and keyboard path.
- **Phone apps (from M1; targets to confirm when M1 is planned):** usable within 2 s of a cold start on a four-year-old phone; logging takes 3 taps or fewer; a write made on a bad network is queued and lands once; VoiceOver and TalkBack labels; Dynamic Type; crash-free sessions at or above 99.5%.
```

---

## 4. `docs/DESIGN.md`

### AM-23. § Layout, navigation (D39). Replace the first bullet.

Replace: `- **Mobile first**, matching the current app. The bottom tab bar is Home, Diary, center +, Library, Discover.`

With:

```markdown
- **Navigation (D39).**
  - **Phone tab bar, left to right:** Home (segments Following and For You), Discover, center +, Social, Library (segments Diary, Lists, Queue, Stats/Recaps). Profile and settings open from the avatar in the top corner.
  - **Website top nav:** Home, Discover, Social, Library, a Log button, search and the avatar menu.
  - Until handoff 09a-1 ships, the app opens on Library › Diary, and Home, Discover and Social show the "Coming soon" state.
  - Direct messages have a reserved place in Social. They aren't designed yet (ROADMAP).
```

### AM-24. § Layout, two clients (D33). Add after the "Desktop gets a real layout" bullet group.

```markdown
- **The website is its own product**, not the phone app stretched wide.
  - Hover reveals row actions. Right-click, or a "more" button, opens the menu that long-press opens on a phone.
  - Keyboard shortcuts for search, log and rate, shown in a help sheet.
  - Home, profile, diary and list pages use the width: more columns, side panels, denser tables.
  - On a phone browser the website uses the phone tab bar and stays installable as a PWA.
- **The phone apps** share the tokens, the type roles and the component names with the website. Geist ships inside the app (it's under the SIL OFL). Navigation follows each platform's conventions: back gestures, sheets, system share.
```

### AM-25. § Color, token source (D35).
Replace `- Dark only for now. Tokens live in CSS variables, so a light theme can be added later without touching components.` with:
`- Dark only for now. Tokens are defined once, in a typed, platform-neutral file. The CSS variables are generated from it, and the phone apps read the same file. A light theme can be added later without touching components.`

---

## 5. `docs/COSTS.md`

### AM-26. Bottom line, third bullet (D33, D40). Replace.

Replace the bullet that begins `> - Optional extras that could cost money later, each your own choice:` with:

```markdown
> - **Things that cost money, each your own choice at a named gate (D40):**
>   - a domain, needed before the first invite (auth email needs a sending domain; price unverified, roughly $10–15 a year)
>   - an **Apple Developer Program membership**, $99 a year (secondary sources; confirm on Apple's page), needed for TestFlight, the App Store, push and Sign in with Apple. The scan spike and solo development don't need it: a free Xcode Personal Team installs on your own phone, with a rebuild every 7 days (verified)
>   - **Google Play registration**, US$25 once (verified), needed for the Android store release
>   - **Supabase Pro**, planned for public launch, mainly for daily backups
>   - representatives and legal advice, if and when sign-ups open in the EEA and UK (D36)
> - The website can be built and run for friends at $0 apart from the domain. Distributing the phone apps is not free.
```

### AM-27. § 2 rule 1 (D33).
Replace `1. **Stay on free plans while earwrm is a personal project.**` with `1. **Stay on free plans while earwrm is non-commercial and the limits in § 6 hold.**`

### AM-28. § 3, auth email (D40). Add to the "Auth email" bullet.
`Mail providers appear to require a sending domain you own, and a `vercel.app` address can't be one (unverified; confirm in handoff 01 PR D2). So choosing a provider also means buying a domain (D40).`

### AM-29. New § 6 (D40). Add at the end of the file.

```markdown
## 6. When free stops fitting

Facts were read on 2026-11-16 (sources in EXTERNAL-SOURCES). Estimates are marked.

| Dependency | Free terms that matter | Trigger | $0 alternative | Decision |
|---|---|---|---|---|
| Vercel Hobby | Non-commercial personal use only. Per month: 1M requests, 1M function invocations, 4 CPU-hours, 100 GB transfer. A feature that hits its limit is unavailable for up to 30 days. Cron once a day | Any commercial activity. Or 50% of a limit two months running (a few hundred daily web users, an estimate). Or Vercel says a free public app isn't "personal" | Another host through an open-source Next.js adapter (migration work, unproven; not recommended now). Phone apps that read straight from Supabase use no Vercel quota | Ask Vercel in 01 PR D2. Decide at public launch (D40) |
| Supabase Free, production | 500 MB database, 5 GB egress, 50,000 monthly users, 1 GB files, 200 concurrent Realtime connections, 500,000 Edge Function calls, 1-day logs, **no backups**, pauses after a week idle. Edge Functions: 150 s wall clock, 2 s CPU, 256 MB | Real users whose data you can't afford to lose for a week. Or 250 MB used. Or about 200 people online at once | None that keeps Auth, RLS and Storage together | Pro ($25 a month) at public launch (D40). Weekly local dumps until then |
| Supabase Free, staging | Same. Pauses when idle | None for synthetic data | – | – |
| MusicBrainz API | Free for non-commercial use, about 1 request a second, User-Agent required | Commercial use. Or search p95 and the upstream 503 rate show the shared budget is spent | The Postgres search cache (03b) first. A mirror needs a paid server. A full local index doesn't fit in 500 MB (estimate) | Decide from the 03b numbers |
| Cover Art Archive | No licence granted; "use at your own risk" | Covers inside generated images (share cards, recaps) or store screenshots. Any commercial use | The monogram fallback in generated images | Review before 06b share cards and 10b |
| Auth email | Supabase's built-in mail reaches only organization members | The first invite | A provider's free tier, on a domain you own | Domain before the first invite (D40) |
| Apple Developer Program | $99 a year (secondary). Free Personal Team: your own devices only, 3 devices, 10 app IDs, 7-day expiry | The first tester other than you needs the iPhone app, or push work starts | The PWA, for the friend cohort | At M1 |
| Google Play | US$25 once. A new personal account must run a closed test with at least 12 testers opted in for 14 days in a row before production, and must verify a real Android device | The Android store release | Direct install of a build, for testers | At M2. Recruit the 12 testers from the cohort. An Android phone is needed by then |
| Expo build service | Free: up to 15 Android and 15 iPhone builds, low priority; 1,000 monthly users for over-the-air updates | More than 1,000 monthly app users on over-the-air updates ($19 a month), or slow builds | Build on your Mac. Ship store builds only | At M1 |
| Last.fm API | Non-commercial only, 100 MB data cap, attribution | Any commercial use | The ListenBrainz provider (terms unverified) | D34's feature flags |
| Representatives and counsel | Not free. EU and UK representatives list at about €770–840 a year together, plus counsel's time | Opening sign-ups in the EEA and UK | Keep the region gate (D36) | Public-launch gate |
| Your time as the only moderator | Apple requires timely responses to reports. EU and UK rules add notice handling | The first public content (04c) | Report thresholds that hide content pending review (09b) | Set a response target at the First-invite gate |

**If earwrm ever charges money,** these must change first: Vercel Pro; a MetaBrainz commercial tier or a mirror; a licence for MusicBrainz tags and genres; Last.fm's permission, or ListenBrainz only; a licensed artwork source; a legal check of the D16 import reading. Spotify's API stays unavailable either way.

**Suggested order of upgrades, when you choose to spend:** domain → Apple Developer Program → Supabase Pro → representatives and counsel → Google Play → Vercel Pro.
```

---

## 6. `docs/EXTERNAL-SOURCES.md`

### AM-30. MusicBrainz, "What this means" (D33).
Replace `while earwrm is a free personal project,` with `while earwrm is free and non-commercial,`.

### AM-31. Apple MediaPlayer section (D34). Replace the heading and add a bullet.
Replace `## Apple MediaPlayer (iPhone app, D28)` with `## Apple play history on iPhone (the optional scan, D34)`. Add:

```markdown
- **Unverified (developer-forum reports, read 2026-11-16):** MusicKit's `Song.lastPlayedDate` is reported as "always nil" by several developers, the library "does not maintain tracks not in the library", and the Apple Music API's recently-played list has no play timestamps and returns about 30 to 50 items. [thread 1](https://developer.apple.com/forums/thread/751255), [thread 2](https://developer.apple.com/forums/thread/696318). Apple's own pages for these interfaces couldn't be read. The spike (ROADMAP item 1, S-1) settles it.
- **Verified:** a free account can register "up to 10 App IDs, which expire after 7 days" and "up to 3 devices, which expire after 7 days". Distribution needs the paid program. [account overview](https://developer.apple.com/support/compare-memberships/)
- **Unverified:** which capabilities a free account gets (the matrix didn't render). Secondary sources say push notifications, Sign in with Apple and TestFlight need the paid program, at $99 a year. [Expo's summary](https://expo.dev/blog/apple-developer-program-explained-free-vs-paid)
```

### AM-32. Last.fm section (D34). Replace the heading and add.
Replace `## Last.fm (the optional badge bridge, handoff 13c)` with `## Scrobble services (the optional badge bridge, handoff 13c)`. Add:

```markdown
- **Verified (Last.fm, re-read 2026-11-16):** "You are permitted to use the Last.fm Data solely for non-commercial purposes"; the "Reasonable Usage Cap" is 100 MB; Last.fm must be credited and linked; all Last.fm data is deleted on termination. [ToS](https://www.last.fm/api/tos)
- **Verified (ListenBrainz):** `GET /1/user/{user_name}/listens` takes `min_ts` or `max_ts` (not both) and `count` (default 25, maximum 1000). The docs say "Do not scrape or paginate through the user's entire history using the listens endpoint." `GET /1/validate-token` returns the user name for a valid user token, which can prove an account's owner. [core API](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html)
- **Unverified (ListenBrainz):** that listens are published under CC0, that a user can connect Spotify so listens arrive automatically, that Last.fm history can be imported, and whether Apple Music is supported. Secondary sources say yes to the first three. ListenBrainz's own pages didn't render. Ask MetaBrainz in the handoff 01 email, and confirm before 13c.
```

### AM-33. Recommendation data section (D34). Add under the Spotify bullet.

```markdown
- **Verified (Spotify developer access, read 2026-11-16):**
  - "Up to 5 authenticated Spotify users can use an app that is in development mode", and "The app owner must have a Spotify Premium account". [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
  - Extended quota: "as of May 15th 2025, Spotify only accepts applications from organizations (not individuals)", with at least 250k monthly active users among the requirements. [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
  - The Developer Policy (effective 15 May 2025) says "Do not analyze the Spotify Content or the Spotify Service for any purpose", which covers usage statistics and user profiles, and "Do not use the Spotify Platform or any Spotify Content to train a machine learning or AI model". [policy](https://developer.spotify.com/policy)
  - New development-mode limits applied from 11 February 2026, and existing apps were migrated on 9 March 2026. [migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- **What this means:** Spotify's API can't serve a public earwrm, for import, badges or recommendations. Spotify users are served by the user's own data export (D16, D37), the scrobble bridge (D34) and link-outs.
```

### AM-34. Listening history exports section. Add.

```markdown
- **Verified (2026-11-16):** Spotify's account-data package covers streaming "in the past year"; Extended Streaming History covers "the lifetime of your account". Neither page states how long preparation takes. [understanding my data](https://support.spotify.com/us/article/understanding-my-data/)
- **Verified (2026-11-16):** Apple posts the export to the Data & Privacy page "When the data is ready", gives 14 days to download it, and lists "App usage information, as it relates to use of iCloud, Apple Music, Game Center, and other services". Play history isn't named as its own item. [Apple support](https://support.apple.com/en-us/102208)
- Founder action F-6 (requesting both exports) answers the unverified items above with real files.
```

### AM-35. Supabase section (D40). Add a subsection.

```markdown
### Supabase Free plan and job limits (read 2026-11-16)
- **Verified:** 500 MB database, 5 GB egress, 5 GB cached egress, 50,000 monthly active users, 1 GB file storage (50 MB per upload), 500,000 Edge Function invocations, 200 concurrent Realtime connections, 2 million Realtime messages a month, 2 active projects, 1-day log retention, automatic backups "Not included", and "Free projects are paused after 1 week of inactivity." [pricing](https://supabase.com/pricing)
- **Verified:** Edge Functions on Free run for at most 150 s of wall-clock time, with 2 s of CPU per request and 256 MB of memory, and a project may have 100 functions. [limits](https://supabase.com/docs/guides/functions/limits)
- **Verified:** for Cron, "we recommend no more than 8 Jobs run concurrently. Each Job should run no more than 10 minutes." [cron](https://supabase.com/docs/guides/cron)
- **Unverified:** that Cron and Queues are available on the Free plan. Neither page mentions plans. Confirm before 06a (this is the audit's P-3 check).
- **Verified:** native Sign in with Apple is supported from an Expo app, by passing Apple's ID token to `signInWithIdToken`. "Sign in with Apple is not natively available on Android devices"; the OAuth flow is used there. [auth-apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- **What this means:** image generation and other CPU-heavy work doesn't belong in an Edge Function. Recaps are computed in SQL when opened (handoff 10).
```

### AM-36. Vercel section (D40). Add.

```markdown
- **Verified (Hobby, read 2026-11-16):** per month, the first 100 GB of fast data transfer, 1,000,000 CDN requests, 1,000,000 function invocations, 4 CPU-hours of active CPU and 360 GB-hours of provisioned memory. At a limit, "you will have to wait until 30 days have passed before you can use the feature again." [Hobby plan](https://vercel.com/docs/plans/hobby)
- **Verified:** Hobby cron jobs run at most "Once per day", with per-hour precision, 100 per project. [cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing)
```

### AM-37. New section: phone app distribution (D38). Add.

```markdown
## Phone app distribution (M1, M2)
- **Verified (Google Play, read 2026-11-16):** "There is a US$25 one-time registration fee." Personal accounts "created after November 13, 2023" must run a closed test with "a minimum of 12 testers who have been opted in continuously for at least 14 days" before production, and must verify an Android device. [testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465), [getting started](https://support.google.com/googleplay/android-developer/answer/6112435)
- **Verified (Expo, read 2026-11-16):** the Free plan includes "Up to 15 Android and 15 iOS builds" in a low-priority queue and 1,000 monthly active users for over-the-air updates. The first paid plan is $19 a month. [pricing](https://expo.dev/pricing)
- **Verified (Expo):** `npx expo run:ios --device` builds and installs on a connected iPhone from a Mac, without the cloud build service. Local builds aren't supported on Windows. [local development](https://docs.expo.dev/guides/local-app-development/)
- **Verified (Apple, App Review guideline 1.2, verbatim):** apps with user-generated content must include "A method for filtering objectionable material", "A mechanism to report offensive content and timely responses to concerns", "The ability to block abusive users from the service" and "Published contact information". [guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Unverified (from a summary of the same page, not verbatim):** 4.2 (an app must be more than "a repackaged website"); 4.8 (an app that uses a third-party login must also offer an equivalent privacy-preserving option); 5.1.1(v) (an app that supports account creation must offer account deletion in the app). Read the live text when M1 is planned.
```

### AM-38. New section: region and age rules (D36). Add.

```markdown
## Region and age rules (D36). Not legal advice.
- **Verified (GDPR, unofficial consolidated text, read 2026-11-16):** Art. 3(2) covers a controller outside the EU whose processing relates to "the offering of goods or services, irrespective of whether a payment of the data subject is required" to people in the EU, or to "the monitoring of their behaviour". Art. 27(1) then requires a representative "in writing". The exemption in Art. 27(2) needs processing that is occasional, involves no large-scale special-category data and is unlikely to result in a risk; all three must hold. [Art. 3](https://gdpr-info.eu/art-3-gdpr/), [Art. 27](https://gdpr-info.eu/art-27-gdpr/)
- **Verified:** Art. 6(1)(f) allows processing "necessary for the purposes of the legitimate interests pursued by the controller", unless overridden by the person's interests or rights. Art. 21(1) gives a right to object "at any time" to processing based on it. [Art. 6](https://gdpr-info.eu/art-6-gdpr/), [Art. 21](https://gdpr-info.eu/art-21-gdpr/)
- **Verified (EU Digital Services Act):** Art. 13 says providers without an EU establishment "which offer services in the Union shall designate, in writing," a legal representative. "Offering services" needs a "substantial connection", such as "a significant number of recipients" or "the targeting of activities"; Recital 8 says "mere technical accessibility of a website" isn't enough. Micro and small enterprises are exempt from the online-platform section (Art. 19), but Arts. 11–18 (contact points, terms, notice and action, statements of reasons) still apply. [regulation](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)
- **Verified (US, FTC COPPA FAQ):** "The Rule does not require operators to ask the age of visitors", and an operator that screens "in a neutral fashion may rely on the age information its users enter". The FAQ notes the Rule was amended on 22 April 2025; the amended Rule wasn't read. [FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- **Verified (listed prices, no date shown):** an EU representative from €348 a year (EU only), and EU and UK representatives from €420 a year each. [rep4.eu](https://rep4.eu/), [Prighter](https://prighter.com/pricing)
- **Unverified:** the EDPB's own guidance on what counts as targeting the EU and on legitimate interests (the PDFs couldn't be read). Whether the UK representative duty changed under the Data (Use and Access) Act 2025 (the ICO page was gone).
- **Unverified (law-firm summaries, not Ofcom's own text):** the UK Online Safety Act covers a user-to-user service with "links with the UK" (a significant number of UK users, the UK as a target market, or material risk to UK users), and small services must still carry out an illegal-content risk assessment. [Osborne Clarke](https://www.osborneclarke.com/insights/ofcom-publishes-final-illegal-content-risk-assessment-guidance-and-codes-practice-under-uk), [Taylor Wessing](https://www.taylorwessing.com/en/interface/2025/online-safety-update/ofcoms-osa-illegal-harms-statement)
- **What this means:** serving EU or UK users on an ongoing basis probably needs representatives, and brings notice-handling and risk-assessment duties. Until Vishnu chooses to take those on, sign-ups from the EEA, the UK and Switzerland are gated (D36).
```

---

## 7. `docs/README.md`

### AM-39. Opening (D33). Replace the sentence `Copy this folder into the repo as `docs/`. Claude Code works from these files.` with:

```markdown
**The target (D33):** two first-class clients on one backend. Phone apps for iPhone and Android are the main experience, iPhone first. The website is its own product for desktop and mobile browsers. It works the same for Apple Music, Spotify and other listeners. **Three clients share this backend, so never put a business rule only in web code.**

Claude Code works from these files.
```

### AM-40. File table. Add rows.

```markdown
| `CLIENT-CONTRACT.md` | How every client talks to the backend (D35). Written in handoff 03 |
| `plan-review/` | The 2026-11-16 plan review. A record; not authoritative |
```

### AM-41. Order table (Q5, Q6, D34, D37, D38). Replace the table and the note under it.

```markdown
| # | Handoff | Depends on |
|---|---|---|
| 00 | Windows setup | – |
| 01 | Foundations: tests, CI, migrations, environments | 00 |
| 01b | Claude Code harness | 01 |
| 02a | Bug fixes from the review: database and security (migration-only) | 01b, AUD-08 |
| 02b | Bug fixes from the review: store correctness | 02a applied in production |
| 02c | Bug fixes from the review: auth flows | 02b |
| 02d | Bug fixes from the review: gestures and UI | 02c |
| 03 | App architecture and design system: identities, client contract, real URLs, data layer, MusicBrainz limiter and search cache, Geist fonts, tokens, website layout | 02a–02d |
| 04a | Privacy model: schema, `can_view`, follows and blocks, scale seed | 03 |
| 04b | Profiles: storage, edit profile, privacy settings, public page, onboarding | 04a applied in production |
| 04c | Your data, legal pages, age and region rules, storage recovery, safety basics | 04b |
| 05 | Diary upgrade: re-listens, rating history, song ratings, fast logging, first-minute rating | 04c |
| 06 | Album, song and artist pages: community ratings, people you follow, your history, tracklist with song ratings, critic scores, discography, "Open in…" links | 05 |
| 09a-1 | Follow people, Home (Following and For You), Social people tools | 06 |
| 08 | Lists, Letterboxd-style | 05 |
| 09a-2 | Likes, comments, notifications, push subscriptions, artist follows and new-release alerts | 08, 09a-1 |
| 09b | Moderation, extended | 09a-2 |
| 10 | Library stats and recaps | 05 (uses 07 if present) |
| 07 | Listening history import (optional, confirmed by the user) and ratings import | 05, 06, the demand test |
| 11 | Discover + recommendations phase 1 (SQL collaborative filtering) | 06, 08, 09a-2 |
| 13a | Badges from log timing | 05, 06, 09a-1 |
| M1 | Phone app v1, iPhone and Android builds (ROADMAP item 1) | 03, 06, 09a-1. Runs in parallel with 08–11 |
| M2 | Android store release | M1 |
| 12 | Recommendation service phase 2 (Python hybrid model + learning-to-rank) | 11 + enough data |
| 13b, 13c | Badges from the import and from a scrobble bridge (Last.fm, ListenBrainz) | 07, 13a, and D34's conditions |
| S-1 | iPhone scan spike (ROADMAP item 1) | – |

Handoff 02 was split into 02a–02d on 2026-11-16. Handoffs 04 and 09a were split on <date PR-01 merges> (plan review). `handoffs/02-bug-fixes.md`, `04-profiles-privacy.md` and `09-social.md` are now indexes.
```

### AM-42. Run order table (Q15, Q25, D38). Replace rows 9 to 15.

```markdown
| 9 | AUD-03 CI and tooling guardrails · AUD-04 preview guard target check · AUD-05 Wikipedia attribution · AUD-06 docs drift · 01b Harness | Next. Independent of each other, so they can run in parallel |
| 10 | Founder actions, any time from now: **F-5** rotate the service-role key (before AUD-08-i deploys) · **F-6** request your own Spotify Extended Streaming History and Apple privacy export · **F-7** a list of 20–30 named testers, five watched sessions on `/demo`, and four Friday checks of new releases in MusicBrainz · **S-1** iPhone scan spike | Open |
| 11 | PR-01: apply the plan-review amendments (docs only) | Done (the PR that changed this table) |
| 12 | 01 PR D2: backup routine, restore drill, Sentry, billing docs, SMTP choice, the question to Vercel | Waiting on 9 and F-5. Choose the SMTP provider here, but don't enable it in production until AUD-01, AUD-02 and AUD-08 are applied there |
| 13 | Staging setup checklist (`STAGING.md`, Vishnu) | Waiting on AUD-03, AUD-04 and D2 |
| 14 | AUD-01 sign-up username collision → AUD-02 `releases` input constraints → AUD-08 server-only catalog writes | Waiting. Each production step needs a fresh backup first. AUD-01 may be pulled forward if sign-ups matter sooner |
| 15 | 02a → 02b → 02c → 02d | Waiting on 01b and AUD-08 |
| 16 | 03 → 04a → 04b → 04c → 05 → 06 → 09a-1 | Waiting. Decision gates as below |
| 17 | **Gate: First invite** | Waiting |
| 18 | Website: 08 → 09a-2 → 09b → 10 → 07 → 11 → 13a. Phone: M1, in parallel | Waiting |
| 19 | **Gate: Public launch** | Waiting |
| 20 | M2 · 12 at its data gate · 13b, 13c and the on-device scan only if D34's conditions hold | Waiting |
```

### AM-43. Decision gates (D35, D36, D37, D39, D40). Replace the list.

```markdown
**Decision gates (stop and confirm with Vishnu):**
- Before 03: `docs/IDENTITIES.md` (catalog IDs and stable links) and `docs/CLIENT-CONTRACT.md` (D35).
- Before 04a: effective visibility, revocation and aggregate rules (D19, D24), and the activity-feed details (D39). The age and region rules are set by D36.
- Before 04b: the domain name (D40).
- Before 05: the recommendation data rules and the privacy notice (D27).
- **First invite** (before anyone outside the Supabase organization is invited). All of these hold:
  - AUD-01, AUD-02 and AUD-08 are applied in production, and the service-role key has been rotated
  - the domain and the mail provider are live
  - the Privacy notice, the Terms, the age screen and the region gate are published
  - reporting, blocking and admin removal work, and a response target is set
  - weekly dumps are running and one restore drill has passed
  - 05, 06 and 09a-1 are shipped, and the PWA installs on iPhone Safari and Android Chrome
  - Sentry is on, and the cohort queries are in `RUNBOOK.md`
- Before 07: `docs/IMPORT-CONTRACT.md` built from real redacted fixtures, confirming D37; and the demand-test result.
- **Public launch** (before online-community invites). Vishnu has decided each of these:
  - the cohort results are reviewed
  - M1 meets the phone-app quality bar on TestFlight, and the Apple Developer Program is joined
  - the regions: representatives, the legal-basis assessment and counsel, or the gate stays (D36)
  - Supabase Pro for backups, and the Vercel plan (D40)
  - MetaBrainz's reply, and the moderation load
- Before 12: the data-volume check.
- Before 13b, 13c or an on-device scan: D34's conditions.
```

---

## 8. Root `README.md`

### AM-44. Status sentence (D33). PR-01 runs after AUD-06, which edits this file's Setup section only.
- Replace `This is a personal-use prototype, not production code.` with `It began as a weekend prototype. It is now being built into a long-term product with phone apps and a website on one backend; the plan is in [docs/README.md](docs/README.md).`
- Replace `concurrent Vercel lambdas can still exceed the limit under parallel load — fine
for personal use, but a shared deploy would want a Redis-backed token bucket.` with `concurrent Vercel lambdas can still exceed the limit under parallel load. Handoff 03 replaces it with one shared limiter (D9).`

---

## 9. `docs/CONVENTIONS.md` and `CLAUDE.md`

### AM-45. Three-client rule (Q16). Add as the first bullet under "## Code", in both files, with the same words.
`- Three clients share this backend: iPhone, Android and the website (D33, D35). Never put a business rule only in web code.`

PR-01 runs after 01b, so it adds the line to both files and keeps CLAUDE.md within 01b's length target. Rules for the phone app's own code and tests are not proposed now (register L10).

---

## 10. `docs/RECOMMENDATIONS.md`

### AM-46. § 4, phase 1, cold start (Q19).
After `Onboarding offers an optional "Rate albums you know" grid (skip anytime) plus genre picks,` add `(the grid is built in handoff 05b)`.

### AM-47. § 5, events and decision logging (Q17).
- After the sentence that begins `- **Capture events from day one** (start in handoff 05):`, add: `` `open` events start in handoff 11, not 05.``
- Replace `- **Decision logging (from 11), separate from impressions:**` with `- **Decision logging (from 12a), separate from impressions:**`

### AM-48. § 7 (Q17, D39).
- In row S2, replace `Home becomes **titled shelves**` with `Discover is built from **titled shelves**`, and replace `2 (log propensities from 1)` with `2 (log propensities from 12a)`.
- Under "Revisions after review", replace `and exposure plus decision logging.` with `and exposure logging. Decision logging moves to 12a.`
- Replace `- **S2 pilot first:** fix one shelf and one slot.` with `- **S2 pilot first (in 12a, behind the data-volume gate):** fix one shelf and one slot.`

---

## 11. Handoffs

Existing text moves word for word. Only the wording below is new.

### `01-foundations.md`

**AM-49. Task 13, backup routine (D40).** Add after the "Backup routine, done first." bullet:
`    - **From the first invite, weekly and scheduled.** A scheduled task on Vishnu's PC runs the same dump every week into the same local folder. The database credential is kept in a secure store (for example Windows Credential Manager), never in a script. `docs/RUNBOOK.md` states the recovery point plainly: up to one week of data can be lost until Supabase Pro is taken at public launch. (Added <date>, plan review Q14.)`

**AM-50. Task 15, SMTP and Vercel (D40).** Add to the BILLING-SETUP checklist:
`      - confirm whether each mail provider needs a sending domain you own. If so, the provider is switched on only after the domain is bought (before the first invite, D40)`
`      - ask Vercel whether a free public app with user sign-ups fits the Hobby plan's "non-commercial personal use", and record the answer in COSTS.md (plan review Q22)`

**AM-51. Task 16, MetaBrainz email (D34).** Add:
`Also ask (a) whether earwrm may read a consenting user's ListenBrainz listens inside a release window to award a badge, and under what terms, and (b) whether anything changes when requests come from phone apps through earwrm's server. (Added <date>, plan review.)`

### `01b-harness.md`

**AM-52. No text change.** 01b already depends only on 01. The run order now starts it at step 9 (Q15). If 01b has not merged when PR-01 runs, PR-01 stops and reports.

### `03-architecture.md`

**AM-53. New task 0b, the client contract (D35).** Add after task 0:

```markdown
0b. **Client contract second (write `docs/CLIENT-CONTRACT.md` before any routes, D35).** It states, with one example each: how a route handler authenticates (cookie session or `Authorization: Bearer`); the error shape and the 401 rule; cursor pagination; idempotent writes with client-supplied UUIDs; which calls are SQL functions and which are route handlers; how a client reads the safe feature flags; the "only add" rule for backend changes once an app is in a store; the push-subscription table; and that Realtime is optional. Vishnu confirms it before task 1 (decision gate).
```

**AM-54. Task 1, routes (D39).** Replace `   - `/` → the Log tab (diary). `/lists`, `/queue`, `/library`, `/social` and `/discover` are the tabs.` with:

```markdown
   - `/` → Home. `/discover`, `/social` and `/library` are the other tabs. `/library/diary`, `/library/lists`, `/library/queue` and `/library/stats` are Library's segments (D39).
   - Until handoff 09a-1 ships, `/` redirects to `/library/diary`, and Home, Discover and Social show the existing "Coming soon" screen. `/library/stats` shows it until handoff 10.
   - Profile and settings open from the avatar: top corner on a phone, the avatar menu on the website.
```

**AM-55. Task 2, data layer (D35).** Add a bullet:
`   - The data core (query and mutation functions, schemas, and everything in `src/lib`) imports nothing from `next/*`, `react-dom`, the DOM or cookies. The React hooks are a thin layer on top. An ESLint rule enforces the boundary, so the core can become a shared package when the phone app starts.`

**AM-56. Task 4, API boundary (D35).** Add:
`Every route handler gets the user through one helper that accepts the cookie session or an `Authorization: Bearer` access token. Under `/api/*`, a missing or invalid session answers 401 as JSON; the proxy never redirects an API path to `/login`. A unit test covers both ways of signing a request. A safe subset of `feature_flags` is readable by any client through one function.`

**AM-57. Task 5, search (plan proposal P9).** Add a bullet:
`   - Search responses are cached in Postgres by normalized query, with an expiry. Matches already in the local catalog are returned at once while the upstream call waits its turn. An empty result shows a "Can't find it?" state that says the catalog comes from MusicBrainz and how a missing release gets added. Record two more metrics: the share of searches with no result, and the share of upstream calls answered 503.`

**AM-58. Task 6, PWA (first invite).** Replace `6. **PWA basics:** manifest, icons, theme color, installable. Leave out offline support for now.` with:
`6. **PWA basics:** manifest, icons, theme color, installable. Leave out offline support for now. The first cohort uses the PWA on their phones, so check the install flow, the standalone display and the safe areas on iPhone Safari and on Android Chrome, and put both screenshots in the PR.`

**AM-59. Task 7, tokens (D35).** In the "Tokens" bullet, add:
`The typed `theme.ts` is the single source. The CSS variables are generated from it, and it imports nothing web-only, so the phone apps can read it.`

**AM-60. Acceptance criteria (D35).** Add:
`- A route handler test passes with a cookie session and with a bearer token, and an unauthenticated API call gets 401 JSON, not a redirect.`
`- The lint rule fails a data-core file that imports from `next/*` or touches the DOM.`

### `04-profiles-privacy.md` → split into three (Q6)

**AM-61. The split.** `04-profiles-privacy.md` becomes a short index (goal, a table "task → file", the shared "Read" line). Three new files hold the tasks, moved word for word:

| New file | Branch | Holds |
|---|---|---|
| `04a-privacy-schema.md` | `feat/04a-privacy-schema` | Task 1 in full, except its bullet about `<head>` metadata. From Tests: the pgTAP line (without "Storage policies" and "deletion leaves no rows behind") and the race and revocation tests that need only the database. **Two PRs:** the migration with its pgTAP tests (migration-only), then the scale seed. `supabase/seed/` isn't on the Release-order allowlist, so the seed can't ride with the migration |
| `04b-profiles.md` | `feat/04b-profiles` | Tasks 2, 3, 4, 5, 6, 11 and 12, and task 1's `<head>` metadata bullet. From Tests: Storage policies, the Unit line, the E2E line, and the race tests that need an open page or a Realtime subscription. The acceptance criterion as written. Its Storage migration ships first, as a migration-only PR. **Depends on** 04a applied in production |
| `04c-your-data-legal-safety.md` | `feat/04c-data-legal-safety` | Tasks 7, 8, 9 and 10, plus AM-63 to AM-65 below. From Tests: "deletion leaves no rows behind". **Depends on** 04b |

**AM-62. 04a and 04b, usernames (Q30, D41).**
- In 04a, add to task 1's username bullet:
  `Existing usernames aren't rewritten by this migration. They, AUD-01's fallback and the neutral default for new accounts are temporary placeholders (D41). The 3–20 character rule applies to every username chosen from 04b on: the set-username function enforces it, a `username_chosen_at` column records the pick, and the constraint covers only profiles that have one. Until an account has picked, its profile can't be public and no policy or function returns its placeholder to anyone but its owner. pgTAP: a placeholder that breaks the rule survives the migration; a new pick that breaks the rule is refused; anon, a stranger and a follower can't read a placeholder username through any table, view or function.`
- In 04b, add to task 6, after the "Existing accounts" sentence:
  `The pick must satisfy the 3–20 character rule. A placeholder username is never shown publicly: not on a profile, a review, a feed, a list, a URL or a share image (D41). E2E: an account that hasn't picked has no public page, and its placeholder appears nowhere a signed-out visitor or another user can see.`

**AM-63. 04c, safety basics (Q6, D14).** Add as a new task:

```markdown
13. **Safety basics, shipped with the first public content (D14).** Profiles, bios, links, avatars and banners become public in 04b, so the tools arrive here, not in 08:
   - **Report** a profile, an avatar or banner, and (from 06b) a review, with a reason.
   - **Block** from a profile, using the tables from 04a.
   - **A minimal `/admin` removal path** with an audit log: a moderator can remove or restore reported content and its Storage object.
   - **Per-user rate limits** on reports and profile edits.
   - **The link and profanity filters** from handoff 09b § 4, applied to usernames, display names, bios and links.
   - A published contact address for safety concerns, in the Terms.
   - **Tests:** e2e: a user reports a profile image, a moderator removes it, the image is gone from the public page and from Storage, and the audit log has the entry. pgTAP: only a moderator can read reports.
   - Handoffs 08 and 09b extend these to comments, lists and the full queue. They don't introduce them.
```

**AM-64. 04c, age and region (D36).** Replace task 8 (`8. **Age policy:** decide the minimum age and the signup check in this handoff, because public profiles launch here and comments in 08. Document it in the Terms.`) with:

```markdown
8. **Age and region rules (D36).**
   - Sign-up asks for a birth date on a neutral screen: no default year, no hint at the answer that passes. Under 13 is refused, and the refusal can't be retried by going back.
   - Sign-up is refused for requests from the EEA, the UK and Switzerland, by the request's country, with a short message that earwrm isn't available there yet. Public pages stay readable. The check runs on the server and applies to every client.
   - The Terms state both rules.
   - **Tests:** a sign-up with a gated country is refused, one without is accepted, and an under-13 birth date is refused.
```

**AM-65. 04b, onboarding wording (D34).** In task 6, replace `→ **main music service (Apple Music, Spotify or Other, stored as `profiles.main_service`)** →` with `→ **main music service (Apple Music, Spotify, YouTube Music, Tidal or Other, stored as `profiles.main_service`; it sets the order of the "Open in…" links)** →`, and replace `Handoff 13 adds the optional badges card for Spotify users after this step.` with `Handoff 13c, if it's built, adds an optional scrobble-bridge card after this step (D34).`

**AM-66. 04c, privacy notice wording (D34).** In task 9, the notice describes connected services as "scrobble services you connect, and on-device music-library access in the phone apps", wherever D27 § 7 says "Last.fm for badges, iPhone Music-library access".

### `05-diary-upgrade.md`

**AM-67. 05a, entry ids (D35).** Add as task 4b:
`4b. **Entry ids and retries (D35).** `diary_entries.id` may be supplied by the client as a UUID; the database generates one when it's absent. The log function is idempotent on that id: sending the same log twice creates one entry and returns it. pgTAP proves it. Phones retry on bad networks.`

**AM-68. 05b, first-minute rating (Q19).** Add as task 8:

```markdown
8. **Rate albums you know (optional, skippable).** After onboarding, and from an empty diary, offer a grid of well-known albums across genres and decades. Tapping stars sets the current rating only, with no diary entry (the rule in 05a task 3). "Pick your top 5" fills Favorites. The grid comes from a curated seed list of MusicBrainz release groups, committed with the code and inserted by the server (D30). It never blocks: one tap skips it.
   - **Tests:** e2e: a new account rates three albums from the grid; its profile shows them; the diary is still empty.
```

**AM-69. 05b task 6, events (Q17).** Replace `   - Record `interaction_events` for open, log, rate, like and queue add.` with `   - Record `interaction_events` for log, rate, like and queue add. `open` events start in handoff 11.`

### `06-album-song-pages.md`

**AM-70. 06b, link-outs and share card (Q20).** Add two bullets:

```markdown
- **Open in…:** a row of links that open this album in a music service, ordered by `profiles.main_service`. Build each link as a search deep link from the artist and title, so it needs no API and no key. Where MusicBrainz has a streaming link for the release, prefer it; measure how many of 100 logged albums have one and record the number in EXTERNAL-SOURCES. Plain text links: check each service's brand rules before using a logo. Song pages get the same row.
- **Share card:** a public entry's permalink (`/u/[username]/entry/[id]`) gets an OG image with the cover, the stars and a short review snippet. A restricted entry gets the generic preview. Covers in generated images are covered by the review named under "Attribution and fallbacks".
```

**AM-71. 06b, naming (Q27).**
- Replace `- **Friends:** up to 10 avatars of people you follow, each with their latest rating. Tapping one opens their review if they wrote one. Also show "N people you follow have it queued". Until handoff 09 adds follows, this section stays hidden.` with `- **Following:** up to 10 avatars of people you follow, each with their latest rating. Tapping one opens their review if they wrote one. Also show "N people you follow have it queued". Until handoff 09a-1 adds follows, this section stays hidden.`
- Replace `- **Reviews:** tabs for Popular (by likes), Recent and Friends, each paginated.` with `- **Reviews:** tabs for Popular (by likes), Recent and Following, each paginated.`

**AM-72. 06e, image source 2 (D33).** Delete the sentence `This fits the Apple-first plan.` Add: `The Apple Music API needs a paid Apple Developer Program membership, so this source can't be used before M1 (D40).`

### `07-history-import.md` (D37; all of this is confirmed or revised at the import-contract gate)

**AM-73. Depends on.** Add: `Also the demand test's result (D37): 07 is scheduled only when Vishnu has seen it.`

**AM-74. The contract.** Add to "Before writing code: the import contract":
`- **Where grouping runs (D37):** the contract confirms that session grouping can run on the device and still support every edge case in the table. It defines the device-side pre-filter (which sessions count as candidates) so that no qualifying listen is dropped before the server sees it. If it can't, stop and tell Vishnu: D37 is revisited.`

**AM-75. Step 2, the privacy screen.** Replace `We send only artist, album, track, time and duration for each play, and keep them on our servers for up to 7 days to find matches.` with `We group your plays into album sessions on your device. We send only the sessions that look like an album listen (the artist, the album, the tracks in that session and when each ended), and keep them on our servers for up to 7 days to find matches. Plays outside those sessions never leave your device.`

**AM-76. Step 3 and 07a.**
- In step 3, replace `a Web Worker unzips and parses the file with an **allowlist** of fields.` with `a background worker unzips the file, parses it with an **allowlist** of fields, and groups plays into candidate album sessions.`
- In 07a, add: `- Parsers and the session grouper are pure TypeScript with no DOM types: they take chunks of text and return rows and sessions, so the same code runs in the browser and in the phone app.`
- In 07a, replace the "Temporary storage" bullet's table definition `import_staging(batch_id, user_id, row_hash, played_end_at, ms_played, track, artist, album, service_track_id)` with `import_candidates(batch_id, user_id, session_hash, artist, album, session_start, session_end, tracks)`, where `tracks` holds, per distinct track, its name, service track ID, play-end time and ms played. Replace `**Idempotency:** `row_hash` is unique per user` with `**Idempotency:** `session_hash` is unique per user`.

**AM-77. 07b task 1.** Replace `1. **Sessions first:** group consecutive or nearby plays` with `1. **Sessions first, on the device:** group consecutive or nearby plays`. Add: `The server checks each uploaded session's window and track list for consistency before matching. It doesn't trust the device's grouping for the final decision: task 4 still decides what qualifies.`

**AM-78. New 07d, ratings import.** Add:

```markdown
## 07d: Ratings import (CSV)
- A CSV of album, artist, rating and an optional date, with column mapping. It can come from another diary app's export, where that app's terms allow the user to take their data.
- Matching uses the same matcher as 07b. Ambiguous rows stay unresolved for the user to pick.
- A row without a date sets the current rating only. A row with a date also proposes a diary entry on that date. Nothing is written until the user confirms.
- Imported ratings are private by default, tagged by batch, and undone per batch. Ratings the user later changed survive the undo.
- **Tests:** unit: the parser and the mapping. pgTAP: confirm and undo. E2E: upload a sample, resolve one ambiguous row, confirm, undo.
```

**AM-79. Acceptance.** Replace `- A 100k-row Spotify history parses on a mid-range phone without freezing the UI.` with `- A 100k-row Spotify history parses and groups on a mid-range phone without freezing the UI.` Add: `- No play that falls outside a candidate session is ever uploaded. A test inspects the upload payload.`

### `08-lists.md`

**AM-80. Task 5 (Q6).** Replace from `**The safety basics ship in this handoff, with the first public comments:**` to `   - Handoff 09 extends these. It doesn't introduce them.` with:
`The safety basics (blocking, reporting, per-user rate limits, the `/admin` removal path with its audit log, and the link and profanity filters) exist since handoff 04c. This handoff extends each of them to comments, list titles, list descriptions and list notes. Handoff 09b extends them further.`

### `09-social.md` → split (Q5)

**AM-81. The split.** `09-social.md` becomes a short index. Three new files hold the tasks, moved word for word except where AM-82 to AM-85 say otherwise:

| New file | Branch | Holds |
|---|---|---|
| `09a1-follow-home.md` | `feat/09a1-follow-home` | 09a task 2 (Following), task 3 (Home, as amended by AM-82), task 6 (album and song pages), and AM-83, AM-84. From Tests: the pgTAP matrix for the feed, and the first half of the E2E ("two users follow each other → B logs and reviews something → it shows in A's feed"). **Depends on** 06 |
| `09a2-interactions-notifications.md` | `feat/09a2-interactions` | 09a task 1 (migrations), task 4 (interactions), task 5 (notifications), task 7 (artists and alerts), and AM-85. From Tests: the Realtime integration test and the rest of the E2E. **Depends on** 08 and 09a-1 |
| `09b-moderation.md` | `feat/09b-moderation` | 09b in full, unchanged. Its item 1 now says the basics came in 04c and 08. **Depends on** 09a-2 |

**AM-82. 09a-1, Home (D39).** Replace task 3's heading and first bullet (`3. **Home feed (the Social tab becomes Home):**` and `   - Activity from people you follow: diary entries (rating and review snippet), new reviews, lists they created or updated, and reviews they liked (that last one can be turned off in settings).`) with:

```markdown
3. **Home (D39), two segments:**
   - **Following** (the default until there's enough activity): diary entries (rating and review snippet), new reviews, and lists created or updated, from accounts the viewer follows, whatever `can_view` allows.
   - **For You:** reviews the viewer is allowed to see, ranked by relevance. In this handoff the rule is popular and recent reviews of albums the viewer has logged. 09a-2 adds reviews of releases by artists the viewer follows. Handoff 11 replaces the ordering with relevance to the viewer's taste. It includes public reviews from anyone (when the account and the review are both public) and reviews from followed accounts that are visible to the viewer. It never shows anything `can_view` would hide from the viewer, or anything from a user blocked in either direction.
   - Both segments are built per viewer and checked at read time. Neither is served from a shared cache (D24, D27 § 5).
   - **Leak test:** a private account's review appears in For You for an approved follower, and for no one else: not a pending follower, a stranger, a blocked user or a signed-out visitor.
```

The other bullets of task 3 stay. "Reviews they liked" moves to 09a-2's activity feed.

In task 6 (Q27), replace `turn on the Friends section and the Friends reviews tab from 06b.` with `turn on the Following section and the Following reviews tab from 06b.`

**AM-83. 09a-1, the Social tab (D39).** Add as a new task:

```markdown
8. **Social tab (D39):**
   - Find and add people: search by username, and invite links.
   - Follow requests (for private accounts), followers and following.
   - An activity feed of follows and queue adds from people the viewer follows. 09a-2 adds likes and list adds. An item appears only if the actor's "Activity in others' feeds" setting is on and the viewer may see the underlying object. Queue adds follow the diary setting. A block removes items at once. The exact rules come from the privacy gate before 04.
   - Two people who follow each other are shown as friends. Nothing else depends on it in this handoff.
   - A reserved, empty place for messages. No message feature is built (ROADMAP item 9).
```

**AM-84. 09a-1, the cohort's measures and the demand test (D37).** Add as a new task:

```markdown
9. **Before the first invite:**
   - Add read-only cohort queries to `docs/RUNBOOK.md`: accounts that logged three or more albums in their first week; accounts that logged in week 4; follows per account; days per week Home was opened. They read tables that already exist. No analytics vendor is added.
   - **Import demand test (D37):** Settings shows "Import your listening history" with a short explanation and a "Tell me when it's ready" button. Tapping it records one row per user. Nothing else is built.
```

**AM-85. 09a-2, push and wording (D35, D39).**
- In task 5, replace `   - Web push for installed PWAs is optional and the user has to turn it on (check the current Next 16 approach).` with `   - Push is optional and the user turns it on, per device. Subscriptions for every client live in one table, `push_subscriptions(user_id, channel web|apns|fcm, token, …)`, and one delivery worker serves all channels. This handoff delivers web push for installed PWAs (check the current Next 16 approach, and what iPhone requires of a PWA). The phone apps add their channels in M1. Push text never contains private content.`
- In task 7, replace `Push to iPhone and PWA is optional, opt-in and rate-limited to at most one per release.` with `Push, on any client, is optional, opt-in and rate-limited to at most one per release.`
- In task 5, notifications are reached from the Social tab (D39).
- The Social activity feed gains likes and list adds, and "reviews they liked" can be turned off in settings.

### `10-library-recaps.md`

**AM-86. Naming (D39).** Replace `## 10a: Library tab` with `## 10a: Library › Stats`. In 10b task 3, replace `   - A Recaps section in Library.` with `   - A Recaps section in Library › Stats.`

**AM-87. 10b task 1, generation (Q18).** Replace the first bullet (`   - A scheduled Edge Function runs in each user's own timezone. Weekly runs on Monday for the previous Mon–Sun, monthly on the 1st, and yearly with a "so far" version from Dec 1 and a final one on Jan 1.`) and the bullet `   - Recaps are also generated on demand when a user opens a period that doesn't have one yet.` with:

```markdown
   - A recap is computed when its owner first opens that period, then stored. Periods: weekly (Mon–Sun, in the user's timezone), monthly, and yearly with a "so far" version from Dec 1 and a final one from Jan 1.
   - A scheduled job only sends the "your recap is ready" notification, in batches. It generates nothing.
```

### `11-discover.md`

**AM-88. Task 10 (Q17, D39).** Replace the three bullets `    - **Home becomes titled shelves** (S2 layout), filled by rules in this phase.`, `    - **Decision logging** (separate from impressions): …` and `    - **S2 pilot:** …` with:

```markdown
    - **Discover is built from titled shelves** (S2 layout), filled by rules in this phase.
    - **Home › For You** (built in 09a-1) changes only its ordering here: reviews the viewer may see, ranked by relevance to their taste. Its visibility rule doesn't change (D39).
    - Decision logging and the S2 pilot move to handoff 12a.
    - `open` events start being recorded in this handoff.
```

**AM-89. Section 8, naming (Q31).** Replace `8. **For you** (phase 1):` with `8. **Recommended for you** (phase 1):`. "For You" now names only the Home segment (D39).

**AM-90. Depends on.** Replace `**Depends on:** 06, 08, 09.` with `**Depends on:** 06, 08, 09a-2.`

### `12-recommendations.md`

**AM-91. 12a and 12b (Q17).**
- Add to 12a, moved word for word from handoff 11: the "Decision logging" bullet and the "S2 pilot" bullet. They start only after the data-volume gate.
- In 12b, replace `using the propensities logged since 11` with `using the propensities logged since 12a`.

### `13-badges.md` (D34)

**AM-92. Header.**
- Replace `- 13c: the optional Last.fm bridge for Spotify users` with `- 13c: the optional scrobble bridge (Last.fm and ListenBrainz), for any user`.
- Add under "Depends on": `13a ships after 05, 06 and 09a-1. **13b and 13c are built only if D34's conditions hold** and Vishnu says so.`

**AM-93. Badge table and schema.**
- In the "Full Album, Day One" row, replace `import evidence (13b), Last.fm (13c) or the iPhone scan (iOS app)` with `import evidence (13b), a scrobble service (13c) or an on-device scan in a phone app, if one is ever built`.
- In 13a, replace `source log|import|lastfm|ios` with `source log|import|scrobble|device`.

**AM-94. 13c.**
- Replace the heading `## 13c: The optional Last.fm bridge (for Spotify users)` with `## 13c: The optional scrobble bridge`.
- Replace the three sub-bullets under "When it shows up" (`**Spotify** users see…`, `**Apple Music** users on the web see…`, and `Users can change all of this later…`) with:

```markdown
  - **Every user** can see an optional card: *"Want listening badges? Connect a scrobble service (Last.fm or ListenBrainz). Takes about 2 minutes."* It has a short guide for each service and a Skip button. Skipping changes nothing else. The guide explains which music services can send plays to each scrobble service.
  - A card about on-device listening in a phone app appears only if a scan has shipped (D34).
  - Users can change all of this later in Settings → Connected services.
```

- Add to "Flow": `The bridge has one interface and two providers. ListenBrainz: the user pastes a user token, `validate-token` proves the account is theirs, and listens are read for the release window only, with `min_ts` or `max_ts`. The same rules apply to both providers: only windowed requests, raw plays thrown away, minimal evidence kept.`
- Replace `This PR ships behind the `lastfm_badges` feature flag.` with `Each provider ships behind its own feature flag (`lastfm_badges`, `listenbrainz_badges`).` Add: `ListenBrainz's terms for this use are unverified until MetaBrainz replies (handoff 01 task 16). Its flag stays off until they're confirmed.`
- In Tests, replace `- **Integration (13c):** mocked Last.fm responses.` with `- **Integration (13c):** mocked responses for each provider.` and replace `Spotify onboarding card → skip → everything still works.` with `the scrobble-bridge card → skip → everything still works.`
