# 08: Lists (Letterboxd-style)

**Branch:** `feat/lists-v2`
**Goal:** users can make lists that other people find, follow, like, comment on and clone.
**Read:** ARCHITECTURE §4 (Lists) and §7, DECISIONS D11 and D14.

## Tasks
1. **Schema migration:** add `lists` (with new columns), `list_items` (target-typed with a `note`), `list_likes`, `list_follows`, `list_comments` and `list_clones`. Each list has its own visibility. Migrate existing lists so nothing is lost.
2. **Creating and editing:**
   - title, description and tags
   - ranked or unranked
   - albums and songs, mixed in one list
   - an optional note on each item
   - drag to reorder, using the fixed reorder logic from 02
   - an optional cover image, otherwise a mosaic of the first 4 covers
   - visibility
   - Bulk add: "Add from my diary" with filters for year and rating.
3. **List page `/list/[id]`:**
   - header with owner, follower count, likes and last updated
   - items as a grid or a numbered list (for ranked lists), with notes shown
   - **Your progress:** "You've logged 12 of 30", with the ones you've logged marked
   - Like, Follow (notifies you when items are added, wired up in 09), Comment, Share, and Clone (copies it to your own lists and credits the original)
   - SEO and an OG image showing the mosaic and title
4. **Finding lists:**
   - "Lists" sections on album and song pages (06b)
   - on profiles
   - a Lists area in Discover (11) with Popular this week, New and By tag
5. **Comments:** threaded one level deep, with likes on comments and delete. **The safety basics ship in this handoff, with the first public comments:**
   - blocking (uses the 04 tables)
   - reporting
   - per-user rate limits
   - a minimal `/admin` removal path with an audit log
   - the link and profanity filters from 09b §4
   - Handoff 09 extends these. It doesn't introduce them.
6. **Demo mode:** seed several public lists from demo users with likes, comments and a clone.

## Tests
- **pgTAP:** each list's own visibility (public, followers or private) is enforced for owner, follower, stranger and anon; clones of private lists aren't allowed; comments follow the list's visibility.
- **Unit:** ranked reordering, the progress calculation, mosaic selection.
- **E2E:** create a ranked mixed list with notes → reorder → make it public → a second user likes, follows, comments and clones it → the original owner sees the like and comment counts.
