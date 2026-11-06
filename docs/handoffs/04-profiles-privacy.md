# 04: Customizable profiles and the privacy model

**Branch:** `feat/profiles-privacy`
**Goal:** profiles people can customize and share, plus one privacy system that everything later plugs into.
**Read:** `docs/ARCHITECTURE.md` §4 (Identity and privacy) and §7, and DECISIONS D10 and D11.

## Tasks
1. **Schema migration:**
   - Add to `profiles`: `bio` (max 160), `avatar_path`, `banner_path`, `accent` (one of a fixed palette that works with the theme), `links` (max 5: label + URL, http/https only), `showcase` (ordered widget list) and `timezone` (IANA).
   - Make `username` citext and unique, 3–20 characters `[a-z0-9_.]`, with a reserved list (`admin`, `api`, `settings`, `u`, `demo` and so on).
   - Add a `visibility` enum (`public` | `followers` | `private`) and a `privacy` table, with the defaults from ARCHITECTURE §7. Add `profiles.private_account`.
   - Private content never shows up in `<head>` metadata, OG images or link previews. Add a test for this.
   - **Relationship tables now, Social UI later (09):** `follows(follower, followee, status accepted|pending)`, `blocks(blocker, blocked)` and `profiles.private_account`, with RLS and indexes on `(followee, status)` and both sides of `blocks`.
   - **State rules, each one tested:**
     - A pending request grants **zero** access.
     - When a public account goes private, existing followers stay approved and new follows become requests.
     - Removing a follower revokes their access right away.
     - A block in either direction removes **both pending and accepted** follows, both ways, and hides everything both ways for **signed-in** use. Public content is still viewable while signed out, and share images someone already downloaded can't be recalled. We only promise to revoke the URLs and caches earwrm controls.
     - **Effective visibility** = the item's own setting combined with the account's private status (a public list on a private account is visible to followers only).
     - Unblocking doesn't bring the follow back.
   - Add `can_view(owner, viewer, v)`, with the viewer taken from `(select auth.uid())` (Supabase's per-statement optimization). Use it for **follower-visible reads**. Public catalog reads, owner-only writes and moderator actions get their own simpler policies. Benchmark the main feed and profile queries as an ordinary signed-in user on the scale seed.
   - Policies:
     - anon and authenticated can read a profile when `can_view(..., privacy.profile)`
     - entries and reviews follow `privacy.diary`, each list and its items follow that list's own `visibility` (new lists start from `privacy.lists_default`), favorites follow `privacy.profile`
     - the owner always has full access
   - Grant anon `select` *only* on the tables that need it, with policies limiting it to public rows.
2. **Storage:** `avatars` and `banners` buckets. The user can only write under their own `user_id/` folder, and reads follow profile visibility. Resize on the client before upload (avatar 512², banner 1500×500), **and enforce maximum size and allowed MIME types in the bucket configuration on the server**, since browser resizing can be bypassed.
3. **Edit profile** (from your own profile → Edit):
   - avatar and banner pickers with crop
   - display name, username (live availability check), bio, accent, links
   - showcase editor: turn widgets on and off and drag to reorder them. Widgets available now: Favorites (top 5), Recent logs, Lists, Stats summary (diary counts). Later handoffs add Pinned review, Pinned list, Top artists, Ratings spread and Latest recap.
4. **Privacy settings:** a "Privacy" section in Settings with a Public / Followers / Only me control for each item in ARCHITECTURE §7, plus the Private account toggle. Each one has a short line explaining who can see it.
5. **Public profile page `/u/[username]`:**
   - Server-rendered, with an OG image (`next/og`, check the Next 16 docs) showing avatar, name and top favorites.
   - Signed-out visitors see what `public` allows, with a "Join earwrm" call to action. Private items aren't rendered at all, not just hidden with CSS.
   - Profiles that don't exist or are private return a proper 404.
6. **Onboarding (first sign-in):**
   - Pick username → avatar (optional) → **main music service (Apple Music, Spotify or Other, stored as `profiles.main_service`)** → privacy defaults explained in one screen (with a "Change anytime" link) → done. Handoff 13 adds the optional badges card for Spotify users after this step.
   - Under 30 seconds. Every step but the username can be skipped.
7. **Your data:**
   - **Export:** Settings → Download my data gives a documented JSON and CSV export of diary entries, ratings, reviews, lists, favorites and the queue.
   - **Account deletion:** cascades across database rows, Storage objects (avatars, banners), import staging and overrides, notifications, cached pages, OG images, interaction events, the taste profile, personal recommendations and aggregate contributions. **Jobs queued before the deletion must not recreate data for the deleted user** (workers check that the user still exists). Recompute aggregates. Test it end to end with synthetic fixtures in staging.
8. **Age policy:** decide the minimum age and the signup check in this handoff, because public profiles launch here and comments in 08. Document it in the Terms.
9. **Legal pages:** the Privacy notice must cover everything in DECISIONS D27 §7: the activity collected, which visibilities influence others, the named service providers, retention, deletion, and the objection route with an owner and deadline. Publish a Privacy notice and Terms (drafts for Vishnu to review, clearly marked as not legal advice) before anything public launches. The privacy notice has to exist before handoff 07's import ships.
10. **Storage recovery:** Supabase database backups **don't include Storage objects** (verified). Write down the decision for avatars and banners in `docs/RUNBOOK.md` (for example, a scheduled copy to a second bucket or an external store) and run one restore drill.
11. **Realtime rule (D24):** set this pattern up now for 09 to use. Channels send a generic refresh signal only, the content is fetched through RLS, and the JWT expiry is short.
12. **Demo mode:** a filled-out demo profile with a banner, links and showcase.

## Tests
- **pgTAP:** every policy × viewer (owner, accepted follower, pending, stranger, blocked, anon) × each visibility value; every follow and block state transition above; Storage policies; deletion leaves no rows behind.
- **Race and revocation tests:** a block that lands while a pending request is being accepted; opening an old notification after you've been removed as a follower; a private list made public while the owner stays private; a public rating that becomes private after the nightly model build (it's gone from aggregates and shared artifacts after the next build); a Realtime subscription that's already open when a block happens (it only gets a generic signal, and the follow-up read is denied).
- **Unit:** username validation, link validation, showcase ordering.
- **E2E:** edit profile end to end, change privacy, then open `/u/<name>` signed out and confirm the right things show; onboarding.

## Acceptance criteria
Setting every privacy control to "Only me" makes `/u/<name>` show only name and avatar to signed-out visitors, and this is proven by both a pgTAP test and an e2e test.
