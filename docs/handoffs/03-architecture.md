# 03: App architecture and design system (real URLs, data layer, API boundary, fonts and tokens)

**Branch:** `refactor/architecture`, in 3 PRs:
- 03a: routes and data layer (tasks 1–4, 6)
- 03b: MusicBrainz limiter (task 5)
- 03c: design system (task 7)

**Goal:** reshape the app so every later feature has an obvious place to go, and lock in the visual system before features pile up. 03a and 03b change **no behavior**. 03c is the only PR that changes how the app looks, and it must follow `docs/DESIGN.md`. The e2e tests from 01 and 02 must pass without any edits. They should select by role or text, never by style.
**Read:** `docs/ARCHITECTURE.md` §3, `docs/DESIGN.md`, and DECISIONS D9, D12, D13 and D18.

## Why
Right now the whole app is one page. `AppShell` keeps a stack of overlays in React state, so nothing has a URL, the browser back button leaves the app, and nothing can be shared or linked. All data goes through one ~440-line context (`src/lib/store.tsx`) that every screen re-renders from. Public profiles, deep links, pagination, realtime and a future mobile app all need this changed.

## Tasks
0. **Identities first (write `docs/IDENTITIES.md` before any routes):**
   - **Album = release group** (`/album/[rg-mbid]`). **Edition = release** (a query param or a picker). **Song = recording** (`/song/[recording-mbid]`).
   - **Diary entry** = a stable UUID, and every review permalink uses it: `/u/[username]/entry/[id]`.
   - **User** = a UUID inside the app. URLs use the username, and an `old_usernames` table redirects to the current one after a rename. **Old usernames stay reserved forever**, so a later user can never take over someone's old review links. Entry URLs resolve by the entry UUID, whatever username appears in the path.
   - **Merged MBIDs** redirect (MusicBrainz guarantees this, verified). Resolve them through an `mbid_redirects` lookup, then serve a 301 to the canonical URL.
   - **Merge collisions:** if a user has rated both of the merged entities, keep all diary entries from both, re-keyed to the survivor. The current rating goes to the most recently updated one. The merge job is idempotent (safe to run twice) and is tested for this.
   - **Default edition:** the earliest official release by full date. Partial dates sort after full dates in the same year. Ties go to the release with the most complete tracklist, then the lowest release MBID. If there's no official release, use the earliest release of any status. Confirmed imports and entries **store the edition they used**, so a later catalog correction can't change what "7 of 10 tracks" meant.
   - Every route below follows these rules.
1. **Routes** (App Router, with a route group for the signed-in shell):
   - `/` → the Log tab (diary). `/lists`, `/queue`, `/library`, `/social` and `/discover` are the tabs.
   - `/album/[mbid]` → album page (today's release screen). `/song/[mbid]` and `/artist/[mbid]` get placeholder pages that 06 fills in.
   - `/list/[id]` → list detail
   - `/u/[username]` → profile (the signed-in user's own profile for now; handoff 04 makes it public)
   - `/settings` and `/search`
   - The tab bar and segments become links. The back button works. Scroll position is restored when going back to a tab.
   - Sheets and dialogs (action sheet, confirmations, "pick lists") stay as overlays, but closing them with the back button works on mobile.
   - The rate and edit-log screen can be `/album/[mbid]/log`, or a sheet. Pick one and explain why in the plan.
   - Demo mode keeps working under `/demo/...` with the same routes. Pick the cleanest mechanism (a route segment, or a cookie plus provider) and explain it in the plan.
2. **Data layer (`src/data/`):**
   - Add TanStack Query. Make one module per domain: `entries`, `queue`, `lists`, `favorites`, `likes`, `releases`, `profile` and `settings`. Each exports typed query hooks and mutation hooks with the *current* optimistic and rollback behavior, including the release-FK wait (`ensureRelease`) and the error dialog.
   - Demo mode becomes an alternative adapter behind the same interface (in-memory), not `if (demo)` branches spread through the code.
   - Remove `src/lib/store.tsx` once nothing uses it.
   - Components never import Supabase.
3. **Features:** move screens into `src/features/<feature>/`. Pull repeated inline styles into `src/components/ui` primitives (header, segmented control, row, section label, avatar, empty state, dialog buttons). Match the current look exactly.
4. **API boundary:** anything the future mobile app would need (search, release detail, account delete) stays as route handlers with typed request and response schemas (zod). Don't use server actions for those.
5. **MusicBrainz throttle across instances (DECISIONS D9):** today the 1.1 s spacing is per serverless instance. Move it to a single shared limiter, either an Upstash Redis token bucket or a Postgres-based one. Choose one, explain why in the plan, and keep the in-memory version as the local-dev fallback.
   - It needs **two priority lanes**. `interactive` (search, release detail) always goes ahead of `background` (the enrichment jobs coming in 06). Background calls back off as soon as interactive traffic shows up.
   - Add a test proving that a full background queue doesn't slow down interactive search.
   - Put a Postgres-backed cache table in front of release detail too, so a cold lambda doesn't refetch it.
5b. **Caching and cost (COSTS.md §3):**
    - public pages use ISR or edge caching with revalidation
    - add a robots.txt
    - add Vercel Firewall rate-limit rules for `/api/*` and search, written down in `docs/BILLING-SETUP.md`
    - covers are never optimized by Vercel
    - rate-limit rules also cover expensive pages and OG routes, and the rule's pricing goes in the cost note
    - **request limits:** maximum body size on every route handler, plus limits on pagination size and search query length
    - OG generation has bounded inputs and is cached
    - Realtime refetches are debounced and jittered on the client
6. **PWA basics:** manifest, icons, theme color, installable. Leave out offline support for now.
7. **Design system (03c, following `docs/DESIGN.md`):**
   - **Fonts:** replace Archivo with the `geist` package: `geist/font/serif/regular` for display, plus `geist/font/sans` and `geist/font/mono`. Expose them as CSS variables. Check the current package exports first (v1.9.1 was checked). This also removes the build's dependency on Google Fonts.
   - **Tokens:** move the colors, type scale, radii, spacing and motion from DESIGN into CSS variables, plus a typed `theme.ts`. Merge the 40-step alpha ramp into the semantic tokens, and map every old use to its closest token. Add an ESLint rule (or a lint script) that flags raw hex or rgba colors and raw font sizes in components.
   - **Primitives:** build the components DESIGN lists (Cover, Stars, Histogram, Button variants, Chip, Row variants, SectionHeader, Empty/Skeleton/Error states, Dialog, Sheet) in `src/components/ui`, and move every screen onto them. Use Geist Serif only at 20 px and up.
   - **Responsive shell:** keep the mobile layout and tab bar. Remove the fixed 402 px device-frame column on desktop, and add the desktop top nav and content column from DESIGN. Album and list pages get their two-column desktop layout here, using today's content.
   - **Album header backdrop:** a blurred and darkened version of the cover, fading into `bg`.
   - Add a **`/design` page**, a dev-only route that isn't linked anywhere, showing every token and primitive. Use it for visual review in the PR.
   - **Screenshots** at 390 px and 1440 px of Diary, album page, list page, profile and settings, before and after. Accessibility must stay at 95 or above.

## Acceptance criteria
- Every e2e test from 01 and 02 passes unchanged.
- New e2e tests:
  - deep link to `/album/<mbid>` and `/list/<id>` loads the right screen
  - back button behavior
  - a demo deep link works
- No component imports `@/lib/supabase`. Add an ESLint rule that enforces this.
- Lighthouse mobile on `/demo`: Performance at least 90, Accessibility at least 95. Include the reports in the PR.
- 03c: no raw colors or font sizes are left in components, Geist Serif never renders below 18 px, and `npm run build` works with no network access to Google Fonts.

## PR
A before/after directory tree, the route map, the limiter choice with its reasoning, and (03c) the before/after screenshots plus the mapping from old to new tokens.
