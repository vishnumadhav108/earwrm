# 09: Social (follows, feed, likes, comments, notifications, moderation)

**Branch:** `feat/social`. Two PRs: 09a covers follows, the feed and notifications. 09b covers moderation.
**Goal:** a Letterboxd-style social layer. You follow people, see what they logged and reviewed, and interact with it. It needs to be safe enough to open to strangers.
**Read:** DECISIONS D10, D11, D14, D24 and D29, and ARCHITECTURE §4 (Social, Artist follows and alerts) and §7.

## 09a: Follows, feed, likes, comments, notifications
1. **Migrations:** `likes_on`, `notifications`, plus whatever extra moderation fields are needed. `follows`, `blocks`, private accounts and the access rules already exist from 04, and the `comments` and `reports` basics from 08. Policies from 04 shouldn't need to change. If one does, fix the 04 design instead of patching around it.
2. **Following:**
   - Follow or unfollow from profiles and from reviews.
   - Private accounts get follow requests (accept or decline).
   - Followers and following lists.
   - "Find people": search by username, plus invite links. Suggestions are out of scope.
3. **Home feed (the Social tab becomes Home):**
   - Activity from people you follow: diary entries (rating and review snippet), new reviews, lists they created or updated, and reviews they liked (that last one can be turned off in settings).
   - Bulk-imported entries (handoff 07) never show up in the feed one by one. At most, one summary item appears: "Ana imported 812 albums", and only if she opts in.
   - Uses cursor pagination and pull to refresh. New items show a "N new" pill that arrives through Realtime.
   - The empty state links to Discover (11) and to invite friends.
4. **Interactions:** likes on reviews, lists and comments, and comments on reviews and lists. Both live on the review permalink page and the list page.
5. **Notifications:**
   - New follower or follow request
   - Likes and comments on your reviews and lists
   - Replies to your comments
   - Updates to lists you follow
   - New releases from artists you follow (one per release, also shown as the popup on next open)
   - An in-app inbox with an unread badge, delivered through Realtime.
   - Web push for installed PWAs is optional and the user has to turn it on (check the current Next 16 approach).
   - Similar notifications get grouped, for example "Ana and 4 others liked your review".
6. **Album and song pages:** turn on the Friends section and the Friends reviews tab from 06b.
7. **Following artists and new-release alerts:**
   - **Tables:** `artist_follows(user_id, artist_mbid, created_at)`, plus `release_alerts(user_id, release_group_mbid, status pending|seen|listened|queued|dismissed, created_at)`.
   - The **Follow** button on artist pages (06e). Its follower count is effectively public follows only, under the D19 spirit.
   - **Detection:** a daily job, on the background MusicBrainz lane, batched and deduplicated across users, checks each followed artist for new release groups where they're the primary artist. New ones go into the catalog and become one `release_alert` per follower. Cache the results per artist and share them across all followers.
   - **On the next app open,** pending alerts show as a **popup card** (one per release, or a swipeable stack if there are several) with the cover, title, artist and release date, plus:
     - **Listened already**, which opens the logging sheet with today's date
     - **Add to queue**
     - **Not now**, which dismisses it
   - **Push:** an in-app notification and inbox entry (this handoff's notification system). Push to iPhone and PWA is optional, opt-in and rate-limited to at most one per release.
   - **Upcoming releases:** if MusicBrainz has a future date, show "Out Friday" with a "Remind me" toggle that fires on release day.
   - Alerts follow blocks and moderation (an artist page is never blocked, but a removed or merged catalog item cancels its alert).

## 09b: Moderation and safety
1. Report reviews, comments, lists, critic-link submissions and profiles, with a reason. The basics came in 08. This extends them.
   - Once enough **distinct reporters** (a named threshold) report something, it goes into **temporary review**. It's never hidden permanently by reports alone.
   - Only a moderator decision removes it. Every step is written to the audit log.
   - Reports from accounts that are new or linked to each other count for less, so a small group can't bury a review.
2. **Admin queue** at `/admin`, gated by an `is_moderator` role checked in RLS. It shows reports with their context, with actions to remove, restore, warn the user or suspend the account. Every action is written to an audit log.
3. **Rate limits:** posts, comments, follows and link submissions, per user per hour, enforced in SQL or the route handler. Return friendly errors.
4. **Filters:** a basic profanity and slur filter on usernames, list titles and comments (block, or send to the queue), and an allowlist of domains for submitted links.
5. Blocking hides content in both directions, removes any follows, and blocks mentions and comments.
6. Soft-delete everything so moderators can review it. Hard-delete when an account is deleted.
7. **Age policy:** the minimum age and the signup age check, decided and documented (legal review) before public social features launch. Show it in the Terms.

## Tests
- **pgTAP:** the full visibility matrix (owner, follower, pending, stranger, blocked, anon) × each privacy item × each visibility value; block symmetry; moderators can see hidden content and normal users can't.
- **Integration:** a Realtime subscription never receives notifications or feed items the user isn't allowed to see.
- **E2E:** two users follow each other → B logs and reviews something → it shows in A's feed → A likes and comments → B gets a notification → A reports the comment → a moderator removes it.

## Acceptance criteria
No query or subscription leaks data that the privacy matrix forbids, and the tests prove it.
