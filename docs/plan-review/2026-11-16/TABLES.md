# Supporting tables, plan review 2026-11-16

Non-authoritative. These tables support the amendments in `AMENDMENTS.md`. They don't repeat canonical content that isn't changing. The cost-trigger table is in `AMENDMENTS.md` (AM-29), because it is itself a proposed section of `COSTS.md`.

**Labels:** [SF] sourced fact · [FD] founder decision · [FB] founder belief · [UE] user evidence · [REC] reviewer's recommendation · [HYP] hypothesis.

## 1. Capability traceability

Every planned capability, at the level of what a user sees or what the system must guarantee. Clients: **i** iPhone, **A** Android, **W** website. "Research" lists what is still unverified. Nothing is dropped; deferrals are marked and were decided by the founder.

| # | Capability | Source | User value | Clients | Exists today | Depends on | Research still needed | Placement | Acceptance evidence |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Sign up, sign in, confirm, reset, edit account, delete, export | 02c, 04c, D31, D36, D38, AUD-01 | Join and leave safely | i A W | Email and password; delete route | AUD-01/02/08, mail provider, domain | Whether mail providers need an owned domain; live text of App Review 4.8 and 5.1.1(v) | 02c, 04c, M1 | E2E flows; route test with cookie and with bearer; region and age tests |
| C2 | Find any album, song or artist fast | D4, D9, D30, 03b, 05b | The first step of every log | i A W | Two-branch album search | AUD-08, 03b | How quickly MusicBrainz lists new releases (F-7); upstream 503s from shared addresses | 03b (AM-57), 05b | Search p95; no-result rate; the "Can't find it?" state |
| C3 | Log, rate, review; re-listens; rating history; quick log | D3, D20, 05 | The core habit | i A W | One entry per album | 03, 04 | – | 05 (AM-67) | 3 taps or fewer; a retried write makes one entry |
| C4 | Rate and open songs | D4, 05b, 06c | Song-level taste | i A W | – | 05 | – | 05b, 06c | E2E: rate from the tracklist |
| C5 | Album and artist pages: community ratings, people you follow, your history, tracklist, reviews, critic links | D5, D8, D19, D29, 06 | One place per record | i A W | A basic release screen | 05 | Wikidata P444 coverage; Cron and Queues on the Free plan; artist image terms | 06a–06e | Cached page under 1 s; leak tests |
| C6 | Profile and privacy controls | D10, D11, D32, 04 | Identity and control | i A W | Private-only data | 03 | – | 04a, 04b | pgTAP matrix; signed-out E2E |
| C7 | Follow people; Home with Following and For You; Social people tools | D10, D24, D39 | A reason to come back | i A W | "Coming soon" | 04, 06 | – | 09a-1 (AM-81 to AM-84) | Two-user E2E; For You leak test |
| C8 | Likes, comments, notifications, push, activity feed | 09, D39 | Feedback between people | i A W | – | 08, 09a-1 | What iPhone requires for web push in a PWA | 09a-2 (AM-85) | Realtime never leaks; push carries no private text |
| C9 | Lists: make, find, follow, clone | 08 | Curation and sharing | i A W | Basic lists | 05 | – | 08 | Two-user E2E |
| C10 | Queue (want to listen) | exists, 05 | A next-up list | i A W | Yes | 05 | – | 05 | Existing E2E |
| C11 | Follow artists; new-release alerts | D29, 09 | A timely reason to return | i A W | – | 06e, 09a-1 | New-release timeliness (F-7) | 09a-2 | One shared daily job |
| C12 | Library stats, recaps, share images | 10 | Reflection and sharing | i A W | – | 05 | Reuse of covers in generated images | 10 (AM-86, AM-87) | SQL under 150 ms; recap equals Library |
| C13 | History import with evidence and undo | D16, D21, D37, 07 | A filled diary at once; strongest for Spotify users | i A W | – | 05, 06a, demand test | Export formats and delivery times (F-6) | 07, after the demand test (AM-73 to AM-79) | Contract fixtures; no play outside a candidate session is uploaded |
| C14 | Discover and recommendations phase 1 | D22, D25, D27, 11 | Find music and people | i A W | – | 06, 08, 09a-2 | Genre licence; Wikidata P136 coverage | 11 (AM-88 to AM-90) | The D27 privacy tests |
| C15 | Recommendations phase 2 | 12 | Better picks | i A W | – | 11, data gate | Free tier of the batch host | 12 (AM-91) | Beats the baseline offline |
| C16 | Badges from log timing | D28, D34, 13a | Recognition for being early | i A W | – | 05, 06, 09a-1 | – | 13a | Window math tests |
| C17 | Badges from play evidence: import, scrobble bridge, on-device scan | D34, 13b, 13c, ROADMAP 1 | Proof of early listening | Bridge: i A W. Scan: phone apps only | – | 07, S-1, D34's conditions | The spike; ListenBrainz terms; Last.fm permission if ever commercial | **Conditional** [FD, Q9] | Spike report; no raw plays kept |
| C18 | Report, block, admin removal, filters, rate limits, age and region rules | D14, D36, 04c, 08, 09b | Safe to open to strangers | i A W | – | 04b | Ofcom's own text on small services | 04c basics (AM-63, AM-64), then 08, 09b | Report-to-removal E2E; audit log |
| C19 | Open the album in my music service; share card for a public entry | **New** (D33) | Works with any service; each share invites someone | i A W | – | 06b | Coverage of MusicBrainz streaming links; brand rules | 06b (AM-70) | 20 sampled albums open correctly |
| C20 | iPhone app | D33, D38, ROADMAP 1 | The main experience | i | – | 03, 06, 09a-1 | The spike; App Review 4.2 live text | S-1, M1 | A TestFlight build used by the cohort; the phone quality bar |
| C21 | Android app | D33, D38 | The other half of phones | A | – | M1 | The Play closed test in practice | Built in M1; released in M2 | 12 testers for 14 days [SF]; the same E2E set |
| C22 | Website as its own product, installable as a PWA | D33, D12, D39, DESIGN | Desktop and mobile browsers | W | A phone-width column | 03 | – | 03c, then every handoff | Screens at 390 and 1440; a pointer and keyboard path for every gesture |
| C23 | Home-screen widgets | ROADMAP 1 | Friends' activity at a glance | i, later A | – | M1 | Capability needs on a free Apple account | After M1 | – |
| C24 | Direct messages between friends | D39, ROADMAP 9 | Talk about music privately | i A W | – | 09 | The decisions in AM-15 | A planned handoff after 09. Not built now [FD, Q7] | – |
| C25 | Videos | D17, ROADMAP 3 | – | – | – | – | YouTube storage rules | Postponed (unchanged) | – |
| C26 | Opt-in live tracking | D1, D6, ROADMAP 5 | – | – | – | – | Android notification-listener route | Not scheduled (unchanged) | – |
| C27 | Ratings import from other diary apps | ROADMAP 4, D37 | Switchers bring their ratings | i A W | – | 05 | Other apps' export formats and terms | 07d (AM-78) | Confirm and undo tests |
| C28 | Ideas list: new music night, artist communities, the worm, swipe-to-queue | ROADMAP 6 | – | – | – | – | – | Not scheduled (unchanged) | – |
| O1 | One backend contract for three clients | D13, D35 | No rework later | all | Cookie-only routes | – | – | 03 gate (AM-53 to AM-60) | Lint rules; bearer test |
| O2 | Privacy enforced in the database | D11, D19, D24, D27, D39 | Trust | all | Owner-only RLS | 04a | – | 04a onward | pgTAP matrix; leak tests |
| O3 | Catalog integrity | D30 | Trust in shared data | all | See `AUD-SEC-1` | F-2, F-5 | – | AUD-02, AUD-08 | Client writes refused |
| O4 | Enrichment and the MusicBrainz limiter | D7, D9, D21 | Speed | all | Per-instance throttle | 03b | Cron and Queues on Free | 03b, 06a | Background work never slows search |
| O5 | Environments, release order, staging | 01, STAGING | Safe change | all | CI and the preview guard | AUD-03, AUD-04 | – | Staging checklist | A bootstrap run |
| O6 | Backups and recovery | 01 t13, D40 | Data survives | all | One dump (F-2) | 01 PR D2 | – | D2 (AM-49) | A drill restores with matching counts |
| O7 | Error monitoring and metrics | 01 t10, ARCHITECTURE § 8 | Find faults | all | – | D2 | Sentry's free limits | D2; M1 adds the apps | Payload allowlist test |
| O8 | Cost safety | COSTS, D40 | $0 holds until chosen otherwise | all | Rules written | D2 | Vercel's answer on Hobby | D2 (AM-50); monthly log | COST-LOG entries |
| O9 | Legal: notice, terms, age, regions, attribution | D27 § 7–8, D36, 04c, AUD-05 | A lawful opening | all | – | – | UK representative rule; EDPB text; Ofcom text | 04c; the Public-launch gate | Published pages; region-gate test |
| O10 | Agent harness | 01b | Reliable sessions | – | – | 01 | Current Claude Code settings syntax | 01b, now [FD, Q15] | 01b's own criteria |
| O11 | Accessibility and quality bar, website and apps | DESIGN, ARCHITECTURE § 8 | Usable by everyone | all | Gaps (audit A-020) | 03c | – | 03c, 05b, M1 (AM-22) | Keyboard-only E2E; the phone bar |
| O12 | Stable identities, links and domain | D12, D20, D40 | Links never break | all | – | Domain name | – | 03 gate; name before 04b | Redirect tests |

### Parity across music services

| Capability | Apple Music user | Spotify user | Other services |
|---|---|---|---|
| Log, rate, review, lists, follow, discover | The same for everyone: the catalog is MusicBrainz | The same | The same |
| Open the album in my service | Link-out (C19) | Link-out | Link-out |
| History import | Apple's privacy export. Whether it has per-play timestamps is unverified | Extended Streaming History, the lifetime of the account [SF]. Probably the stronger import | Generic CSV |
| Play evidence for badges | An on-device scan on iPhone only, if the spike passes. Forum reports are discouraging (unverified) | The scrobble bridge, on every client | The scrobble bridge, if their service scrobbles |
| The service's own API | Needs Apple's paid program; its recently-played list has no timestamps (unverified) | Not usable: 5 users in development mode, extended quota for organizations with 250k monthly users, and a policy against usage statistics and model training [SF] | – |

## 2. Evidence plan

Today's evidence is the founder's belief [FB] plus stated intent from people who haven't used it [UE, weak]. With 10 to 30 friends the numbers show direction, not proof. Every threshold is the reviewer's recommendation; the founder sets them (register L1).

| # | Assumption | Label | Cheap test | Who and when | Measure | A result that changes the plan |
|---|---|---|---|---|---|---|
| E0 | People who said they'd use it will try it | UE, weak | Write down 20 to 30 named people who agree to try it | Founder, now (F-7) | Count of names, split by Apple Music, Spotify, other | Fewer than 15: recruit before 04, or rethink the cohort |
| E1 | The log flow is fast and obvious | HYP | Watch 5 people log 3 albums on the public `/demo`, on their own phones | Founder, now (F-7); again after 05 | Where they hesitate; time from search to saved | A median over 20 s, or anyone stuck: fix the flow before more features |
| E2 | MusicBrainz has what people log, including new releases | HYP | Each Friday for 4 weeks, check 20 new releases, big and small, 24 hours after release | Founder, now (F-7) | Share present; share with cover art | Under 90% present, or under 80% with art: a catalog-supplement decision (L5) before 09a-2's alerts and 13a's badges |
| E3 | People form a logging habit | FB | The friend cohort, on the PWA | After the First-invite gate | Share logging 3 or more albums in week 1; share logging in week 4 | Under 60% in week 1, or under 40% in week 4: pause new feature handoffs, talk to them, fix the loop |
| E4 | The people you follow bring you back | HYP | The same cohort, with 09a-1 shipped | Weeks 1 to 4 | Share following 2 or more people; days per week Home is opened | Low Home use among people who stay: revisit Home before 09a-2 |
| E5 | Users will fetch and upload a streaming export | HYP | The demand test in 09a-1 (AM-84) | The cohort | Share who tap "Tell me when it's ready" | Under 25%: 07 moves behind 08, 10 and 11 (L6) |
| E6 | Spotify users are served as well as Apple Music users | HYP | Split E3 and E4 by `main_service`; ask three of each | The cohort | The gap in retention; what they say | A clear gap: bring the link-outs and the bridge forward |
| E7 | Badges motivate | HYP | Ship 13a; ask | The cohort or the TestFlight group | Share who mention or share a badge | Little interest: 13b, 13c and the scan stay unbuilt (L7) |
| E8 | The phone app is where people want it | FD, to confirm | Listen: do PWA users ask for an app, notifications, a widget? | The cohort | Count of unprompted requests | It should confirm M1's scope. Silence would deserve a conversation |
| E9 | The on-device scan can see what was played | HYP | S-1 | Founder, any time | The spike's measurement list | Fail: no scan is built |

**How it is measured.** Read-only SQL over tables that already exist (entry timestamps, follows), written into `RUNBOOK.md` by 09a-1 and run by the founder. Search numbers come from 03b's metrics. Five watched sessions. No analytics vendor is added. The D27 privacy notice already covers this collection.

## 3. Material risks

| # | Risk | Mitigation | Early warning sign |
|---|---|---|---|
| 1 | The diary is lonely: its value depends on other people being there | 09a-1 before the invite; first-minute rating in 05b; invite links | Fewer than 40% logging in week 4 |
| 2 | Search is slow, or the album is missing, at the moment of logging | The search cache, the not-found state and two metrics (AM-57); the Friday checks (E2) | No-result rate over 3%; upstream 503s; search p95 over 1.5 s |
| 3 | The main client arrives late and the backend hardens around the website | The client contract in 03 (D35); M1 after 06 (D38) | A route that needs cookies; a rule that exists only in web code |
| 4 | The on-device scan doesn't work, so Apple Music users have no play evidence | S-1 early; badges are service-neutral and conditional (D34) | The spike shows empty or library-only play dates |
| 5 | A free tier runs out just as the app succeeds: 500 MB, no backups, 200 connections, 1M requests with a 30-day lockout | The monthly cost log with 50% triggers; D37 and the deferred logging shrink tables; the upgrade order is decided ahead | Any meter over 50%; the size of the import tables |
| 6 | Data is lost before backups mature | A weekly scheduled local dump from the first invite; a restore drill; Supabase Pro at public launch (D40) | The newest dump is more than 7 days old |
| 7 | Legal exposure when the EU and UK open; the legal basis for D27's use of private activity | The region gate now (D36); the Public-launch checklist; counsel before opening | Sign-up attempts from gated regions; EU users among friends |
| 8 | Public user content with one person moderating | Safety basics in 04c; a response target; kill switches | A report older than the target |
| 9 | Too long to reach evidence: many handoffs, some too large for one session | 04 and 09a are split; 01b runs now; two gates with checks that can be measured | A handoff that needs more than two sessions; a request to edit acceptance criteria |
| 10 | Non-commercial terms close the commercial option later | The MetaBrainz email now; the ListenBrainz provider; the monogram fallback in generated images | MetaBrainz's reply; any plan to take money |

## 4. Execution map

Dependency order. Only the next work is detailed. The gate checklists are in `AMENDMENTS.md` (AM-43).

```
NOW (parallel; they touch different files)
  AUD-03 · AUD-04 · AUD-05 · AUD-06          existing handoffs, unchanged
  01b harness                                 existing handoff, started earlier (Q15)
  Founder: F-5 key rotation · F-6 data exports · F-7 testers, demo sessions, Friday checks · S-1 scan spike
THEN
  PR-01 docs amendments                       after AUD-06 and 01b merge (same files)
  01 PR D2 → staging checklist → AUD-01 → AUD-02 → AUD-08 → 02a → 02b → 02c → 02d
LATER (capability level)
  03   identities, client contract, navigation, data layer, limiter and search cache, design system
  04a → 04b → 04c   privacy model; profiles; your data, legal pages, age and region, safety basics
  05   diary v2, idempotent writes, first-minute rating
  06   album, song and artist pages, link-outs, share card
  09a-1   follow, Home (Following and For You), Social people tools, cohort queries, import demand test
  ── GATE: First invite ──
  Website: 08 → 09a-2 → 09b → 10 → 07 (if the demand test says so) → 11 → 13a
  Phone:   M1 (iPhone and Android builds), in parallel
  ── GATE: Public launch ──
  M2 Android store release · 12 at its data gate · 13b, 13c and the scan only if D34's conditions hold
  ROADMAP: direct messages (after 09), widgets, and the rest
```

### The next five pieces of work

| # | Work | Prerequisites | Boundaries | How it is verified |
|---|---|---|---|---|
| 1 | AUD-03, AUD-04, AUD-05, AUD-06 | As written in each handoff | As written | As written |
| 2 | 01b harness | `npm run check` passes on `main`. The shell runs Node 24 (`fnm exec --using=24`, per AUD-06) | `.claude/`, `docs/PROGRESS.md`, CONVENTIONS and CLAUDE.md, one README row. No app code | 01b's four acceptance criteria |
| 3 | Founder actions F-5, F-6, F-7 | F-5 before AUD-08-i deploys. F-6 and F-7 need nothing | No repository change. F-6's files stay off the repository until redacted for the import contract | F-5: account deletion still works after rotation. F-6: both exports requested, dates noted. F-7: a list, five session notes, four Friday tallies |
| 4 | S-1 iPhone scan spike | The founder's Mac and iPhone; a free Personal Team | A throwaway project outside this repository. No backend. Nothing leaves the phone | `handoffs/S-1-iphone-scan-spike.md`: each question has an observed answer or "could not observe" |
| 5 | PR-01 docs amendments | AUD-06 and 01b merged. Every question in the register is answered | Docs only: the files named in `AMENDMENTS.md` | `handoffs/PR-01-adopt-amendments.md` |

After these, handoff 01 PR D2 follows as already planned, with AM-49 to AM-51 applied.
