# Decision register, plan review 2026-11-16

Non-authoritative until adopted through `handoffs/PR-01-adopt-amendments.md`. See `README.md`.

**Labels:** [FD] founder decision · [FB] founder belief · [UE] user evidence · [SF] sourced fact · [REC] reviewer's recommendation · [HYP] hypothesis.

## Approvals

- **Document approval:** given by Vishnu in chat on 2026-11-16 ("Approved to write the packet"), with the answers below.
- **Execution approval:** none. No amendment is applied and no handoff is authorized.

## 1. The goal [FD]

Stated by the founder, in a message that dates it 2026-11-17. (The session clock read 2026-11-16 when it was received. Both dates are recorded; nothing depends on the difference.)

> A long-term solid "Letterboxd for music" built to the highest quality I can reach, that people actually want to use and keep coming back to. $0 until I choose to upgrade, with the option of going commercial later. The final product is two first-class clients sharing one backend:
> - Phone apps for both iPhone and Android (the main experience with initial focus being apple version)
> - A full website, designed for desktop and mobile browsers as its own product, not the phone app in web form.
>
> It must work well for Apple Music users and Spotify users alike (and anyone who listens elsewhere), without depending on any one streaming service.

Constraints given with it: $0 until the founder chooses to upgrade; no cutting architecture, privacy or safety work; product and design decisions are the founder's.

## 2. Interview answers (2026-11-16)

| Topic | Answer | Label |
|---|---|---|
| First real users | Friends and people the founder knows; online music communities; Letterboxd users who love music | FD |
| Evidence that people want it | The founder's own need; people said they'd use it; demand seen online. In the founder's words: "A gap i've noticed myself, and maybe not something people are asking for specifically but something people would never know they wanted/needed till they realized it existed." | FB, plus weak UE: stated intent, no usage yet |
| Monetization | "Undecided, keep the option." No contribution-margin model was built | FD |
| Public web research | Approved, all listed topics, read-only | FD |
| Devices | A Mac that runs current Xcode, and an iPhone. No Android phone | SF, from the founder |
| First invite | "Invite-only friends once the web core loop is solid (after 04-06), used mostly on their phones via the PWA. Wider online-community invites once the iPhone app exists." | FD |
| Regions | The founder is in the United States, and asked for research on whether a GDPR Art. 27 or UK representative is required and what it costs, and whether D27's use of private activity works under legitimate interests or needs consent, then a recommendation. The research is in `AMENDMENTS.md` § EXTERNAL-SOURCES; the decision is Q11 | FD |
| Time | 15 to 30 hours a week | SF, from the founder |

## 3. Decisions

Each entry: the question, the options, the reviewer's recommendation, and the founder's answer. Answers are the founder's own words where quoted.

**Q1. Record the goal as a decision (proposed D33).**
Options: approve the wording · edit · not now. Recommendation: approve.
**Answer:** Approve D33 wording.

**Q2. When the phone app starts.**
Options: after 06 and 09a-1, in parallel with the web · after 13 (the plan before this review) · before more web work. Recommendation: after 06 and 09a-1.
**Answer:** After 06 and 09a-1, parallel to web.

**Q3. App stack.**
Options: Expo / React Native in this repo with a shared core (ROADMAP's existing choice) · separate native Swift and Kotlin apps. Recommendation: Expo / React Native.
**Answer:** "Expo / React Native in this repo, shared core. Android is built from the same codebase from the start; only its store release follows iPhone."

**Q4. A client contract gate in handoff 03 (proposed D35).**
Options: yes · no. Recommendation: yes.
**Answer:** Yes.

**Q5. A slim social slice (09a-1) before the friend invite.**
Options: yes · keep 09 whole, after 08. Recommendation: yes.
**Answer:** Yes.

**Q6. Split handoff 04 into 04a–c and move the safety basics from 08 into 04.**
Options: both · split only · neither. Recommendation: both.
**Answer:** Both.

**Q7. Navigation map.**
Options: A, the reviewer's map · B, the founder's own. Recommendation: A.
**Answer:** B. In the founder's words:

> My own map (B). Phone tab bar, left to right:
> 1. **Home**: two segments, "Following" (logs, ratings and reviews from people I follow) and "For You" (public reviews from others, ranked by relevance to my taste once recommendations exist; before 11, popular and recent public reviews of albums I've logged or artists I follow). Following is the default until there's enough activity. Only effectively public content (D19).
> 2. **Discover**: shelves, charts, popular lists, recommendations, search entry points.
> 3. **+**: opens the action sheet, as today.
> 4. **Social**: find and add people, follow requests (for private accounts), followers and following, notifications, and a friend-activity feed like Letterboxd's Activity tab (likes, queue adds, list adds, follows). DMs will live here later.
> 5. **Library**: Diary, Lists, Queue, and Stats/Recaps as segments.
>
> My profile and settings open from my avatar in the top corner.
> Follows stay one-way (D10): you follow someone; if their account is private, they must accept. When two people follow each other, they are "friends". Only friends can DM each other.
> DMs are not built now and not in 09. Add them to ROADMAP as a planned handoff after 09, with their own privacy, blocking, reporting and moderation rules, and list the decisions it will need from me. Their place in the Social tab is reserved.
> Website top nav: Home, Discover, Social, Library, a Log button, search, and my avatar/profile menu, designed with wider layouts as its own product.
> Update handoffs 03, 09 and 11 and DESIGN § Layout to match.

The sentence "Only effectively public content (D19)" is replaced by the answer to Q26.

**Q8. Supersede D28's Apple-first parts with service-neutral badges and a two-provider scrobble bridge (proposed D34).**
Options: yes · Last.fm only · keep D28. Recommendation: yes.
**Answer:** Yes.

**Q9. Make 13b, 13c and the on-device scan conditional on the spike and on cohort interest.**
Options: yes · build as planned. Recommendation: yes.
**Answer:** Yes.

**Q10. Import: (a) candidate sessions built on the device (proposed D37); (b) a demand test before building 07; (c) a ratings CSV import.**
Options: each yes or no. Recommendation: (a) yes, to be confirmed at the import-contract gate; (b) yes; (c) yes, small.
**Answer:** (a) yes, confirmed at the contract gate; (b) yes; (c) yes.

**Q11. Regions (proposed D36).**
Options: gate sign-ups from the EEA, UK and Switzerland until the public-launch gate · open worldwide now with representatives · open worldwide now without. Recommendation: gate now.
**Answer:** Gate EEA, UK and Switzerland until the public-launch gate.

**Q12. Age rule for the First-invite gate.**
Options: 13+ with a neutral age screen · 16+ · 18+. Recommendation: 13+ while gated to non-EU regions; revisit when opening.
**Answer:** 13+ with a neutral age screen while gated; revisit when opening.

**Q13. Domain and auth email.**
Options: buy a domain before the first invite · stay on `vercel.app` and try Google sign-in only. Recommendation: buy a domain.
**Answer:** Buy a domain before the first invite.
Reviewer's note [REC]: choose the name before 04b, so public URLs, share images and email links are built against it. Buying can wait until the first invite.

**Q14. Backups.**
Options: weekly scheduled local dump from the first invite, Supabase Pro at public launch · stay monthly · Pro sooner. Recommendation: the first.
**Answer:** "Weekly scheduled local dump from first invite (credential stored securely, e.g. Windows Credential Manager, never in a script), Supabase Pro at public launch."

**Q15. Run 01b now, beside the audit handoffs.**
Options: yes · keep it after 01 PR D2. Recommendation: yes.
**Answer:** Yes.

**Q16. Add the three-client sentence to docs/README, CONVENTIONS and CLAUDE.md.**
Options: yes · README only · no. Recommendation: yes.
**Answer:** Yes.

**Q17. Move decision logging and the bandit pilot from 11 to 12; record no `open` events until 11.**
Options: yes · keep. Recommendation: yes.
**Answer:** Yes.

**Q18. Recaps computed when opened; the schedule only notifies.**
Options: yes · keep scheduled generation. Recommendation: yes.
**Answer:** Yes.

**Q19. "Rate albums you know" in 05b.**
Options: yes · keep it in 11. Recommendation: yes.
**Answer:** Yes.

**Q20. "Open in…" links and an entry share card in 06b.**
Options: yes · links only · no. Recommendation: yes.
**Answer:** Yes.

**Q21. A status index at the top of DECISIONS.md.**
Options: yes · keep the file as is. Recommendation: yes. (The file's own rule is "never edit the history". The index is an addition, not an edit to any entry.)
**Answer:** Yes.

**Q22. Vercel plan for a free public app.**
Options: ask Vercel at D2 and decide at public launch · move to Pro at the first invite · assume Hobby is fine. Recommendation: ask, then decide.
**Answer:** Ask Vercel at D2, decide at public launch.

**Q23. Sign-in options in the apps.**
Options: email plus Sign in with Apple and Google · email only. Recommendation: add both at M1.
**Answer:** Email plus Sign in with Apple and Google at M1.

**Q24. The packet folder's date.**
Options: the clock's date when written · 2026-11-17. Recommendation: the clock's date.
**Answer:** The clock's date. (It read 2026-11-16.)

**Q25. Rotate the service-role key (F-5) before AUD-08-i deploys.**
Options: yes · leave unordered. Recommendation: yes.
**Answer:** Yes.

**Q26. Which visibility rule governs the two Home segments?**
Reviewer's reading: D19 for For You only; `can_view` for Following.
**Answer:** In the founder's words:

> For You: may show anything the viewer is allowed to see, ranked by relevance. That means public content from anyone (including people the viewer doesn't follow, if their account and the item are public), plus content from accounts the viewer follows that's visible to them (including private accounts that approved the viewer, and followers-only items). It never shows anything can_view would hide from that viewer, and never anything from blocked users either way.
> Following: shows only content from accounts the viewer follows (public and approved private), whatever can_view allows.
> D19's "effectively public only" rule still applies to public aggregates (averages, counts, charts, Discover), not to these personal feeds. Add a leak test: a private account's items appear in For You only for its approved followers.

**Q27. "Friends" now means mutual follows, but ARCHITECTURE § 5 and handoff 06b use "Friends" for people you follow.**
Options: rename those to "Following" and keep them one-way · narrow them to mutual follows. Recommendation: rename.
**Answer:** Rename them to "Following" and keep them one-way.

**Q28. Visibility of items in the Social activity feed (likes, queue adds, list adds, follows).**
Recommendation: an item appears only if the actor's activity setting is on and the viewer may see the underlying object; queue adds follow the diary setting; blocks remove it at once.
**Answer:** Agreed as recommended. "Settle the details at the before-04 privacy gate."

**Q29. Tabs that have nothing to show before their handoffs ship.**
Options: land on Library › Diary until 09a-1, other tabs show "Coming soon" · hide the empty tabs. Recommendation: the first.
**Answer:** Agreed: land on Library › Diary until 09a-1; other tabs show "Coming soon".

### Found while writing the packet

These two were not in the approved plan. Vishnu answered them in a later message on 2026-11-16.

**Q30. Handoff 04's new username rule and the usernames that already exist.**
Handoff 04 task 1 makes `username` 3–20 characters from `[a-z0-9_.]`. Existing usernames come from email addresses and may contain other characters or be longer. AUD-01's last-resort fallback (`user_` plus the 32-character id) is 37 characters, and 02a item 19 allows up to 64. A plain CHECK constraint would fail on existing rows, and a migration that rewrote them would change URLs without the owner choosing.
Options: (a) the migration leaves existing usernames alone; the 3–20 rule is enforced on every username chosen from 04b on (in the set-username function, and by a constraint that applies only once a profile has `username_chosen_at`); accounts that have not chosen stay non-public, as D31 already requires · (b) the migration rewrites non-conforming usernames to neutral defaults. Recommendation: (a).
**Answer:** In the founder's words:

> Enforce the 3–20 character rule on every username chosen from 04b on. Existing email-derived usernames and AUD-01's fallback stay valid only as temporary placeholders: per D31 they must be re-picked before the profile becomes public, and the re-pick must satisfy the rule. Never show a placeholder username publicly.

This is option (a), with one rule added: a placeholder username is never shown publicly. It is proposed as D41 (AM-95) and applied in handoff 04 by AM-62.

**Q31. Two things would be called "For you".**
The founder's map has a Home segment named "For You" (a feed of reviews). Handoff 11 § 8 has a section named "For you" (album recommendations), which now lives in Discover.
Options: rename the Discover shelf "Recommended for you" · keep both names · another name. Recommendation: rename the shelf.
**Answer:** Rename handoff 11's shelf to "Recommended for you".

## 4. Decisions that come later

These are not asked now. Each is named so the gate that needs it is visible. The gates are in `TABLES.md` § 4.

| ID | Decision | Needed at | Reviewer's recommendation, if any | Answer |
|---|---|---|---|---|
| L1 | The evidence thresholds in `TABLES.md` § 2 (for example: 60% of invited friends log three albums in week 1) | Before the First-invite gate | The numbers shown there [REC] | |
| L2 | The domain name | Before 04b | – | |
| L3 | The details of activity-feed visibility (Q28) and effective visibility, revocation and aggregates (already a gate) | Before 04 | Q28's rule | |
| L4 | A response-time target for reports | First-invite gate | 48 hours [REC] | |
| L5 | A catalog supplement, if the Friday checks show MusicBrainz misses new releases | After founder action F-7 | Decide from the numbers | |
| L6 | Whether to build 07, from the demand test | Before 07 | Build if 25% or more of the cohort ask for it [REC] | |
| L7 | Whether to build 13b, 13c and the on-device scan | After S-1 and after 13a has been used | Build only if both conditions hold (Q9) | |
| L8 | Opening the EEA, UK and Switzerland: representatives, a written legitimate-interests assessment, counsel, and whether those users get a self-serve objection control (which would touch D25) | Public-launch gate | Take an hour with privacy counsel first [REC] | |
| L9 | Vercel Hobby or Pro, after Vercel's reply (Q22) | Public-launch gate | – | |
| L10 | Phone-app rules for CONVENTIONS and CLAUDE.md (tests, screenshots, release order with store builds) | When M1 is planned | – | |
| L11 | Direct messages. The decisions are listed in `AMENDMENTS.md` § ROADMAP | When the DM handoff is planned, after 09 | – | |

## 5. Proposals approved with the plan, without a question of their own

The plan Vishnu approved on 2026-11-16 contained these proposals. No question asked about them one by one, so they were listed here for one confirmation.

| Amendment | What it proposes | Plan proposal |
|---|---|---|
| AM-13 | A research note in ROADMAP item 5 about opt-in tracking on Android | Capability table, C25 |
| AM-22 | Quality-bar lines for three clients, the website and the phone apps | Section 3.2 |
| AM-24 | DESIGN subsections on the website as its own product and on the phone apps | Section 3.2 |
| AM-43 | The First-invite and Public-launch gate checklists | P18 |
| AM-51 | Two more questions in the MetaBrainz email | P3 |
| AM-57 | A Postgres search cache, a "Can't find it?" state and two metrics in 03b | P9 |
| AM-58 | Checking the PWA install flow on iPhone Safari and Android Chrome in 03 | Section 3.3 |
| AM-84 | Read-only cohort queries in RUNBOOK | Evidence plan |
| AM-85 | One push-subscription table for every client | P12 |

**Confirm this list before PR-01 runs.**
**Answer:** Approve all nine. (2026-11-16.)

## 6. State of the register

Every question from Q1 to Q31, and § 5, has an answer. The only blank "Answer" cells are the later decisions in § 4, which are not asked yet. Recording these answers approved the documents. It authorized no handoff: PR-01 and S-1 still need their own go-ahead.
