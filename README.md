# earwrm
try it at https://earwrm-xi.vercel.app/

A Letterboxd-style music diary. Log what you played, rate it out of five, write a
line about it, keep lists and a queue of what's next. 
A long-time dream project sprinted over a weekend into a prototype.

Built from a Claude Design prototype. Prototype design viewable at earwrmDesign.pdf
This is a personal-use prototype, not production code.

## Stack

- **Next.js (App Router) + TypeScript**, deployed to Vercel
- **Supabase** for auth and storage, with row-level security on every user table
- **MusicBrainz** for release metadata, **Cover Art Archive** for sleeves,
  **Wikidata → Wikipedia** for the one-line release blurb

MusicBrainz was chosen over Spotify for two reasons: its release-group type
field natively distinguishes Album / Single / EP / Mixtape / Compilation, and it
has no per-app user cap (Spotify's Developer Mode is capped at 5 connected users
and requires the developer account to hold Premium).

## Setup

1. **Create a Supabase project**, then run `supabase/schema.sql` in the SQL
   editor. It creates every table, the RLS policies, the table grants, and the
   trigger that makes a profile row on sign-up.

   If your database was created before the grants existed, run
   `supabase/002_grants.sql` instead — without it every write fails with
   `permission denied for table ...`. RLS controls which *rows* a role may
   touch; it does not grant access to the table, and a policy cannot grant what
   was never granted.

2. **Configure the environment.** Copy `.env.example` to `.env.local` and fill
   it in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   MUSICBRAINZ_USER_AGENT=earwrm/0.1.0 ( https://github.com/vishnumadhav108/earwrm )
   SUPABASE_SERVICE_ROLE_KEY=…      # only for Settings > Delete account
   ```

3. **Run it.**

   ```
   npm install
   npm run dev
   ```

Deploying to Vercel needs the same variables set in the project's environment.

## How the MusicBrainz integration works

MusicBrainz allows roughly **one unauthenticated request per second** and
requires a **descriptive User-Agent** naming the app, or it may block the
client. Neither is possible from the browser, so all metadata traffic goes
through server route handlers:

- `GET /api/mb/search?q=` — release-group search
- `GET /api/mb/release-group/[mbid]` — tracklist, label, and blurb

`src/lib/rateLimit.ts` funnels every outbound call through one promise chain
spaced at 1.1s, with TTL caches in front of it. This is per server instance, so
concurrent Vercel lambdas can still exceed the limit under parallel load — fine
for personal use, but a shared deploy would want a Redis-backed token bucket.

Release metadata is denormalised into the `releases` table the first time a
release is logged, so the diary renders without one lookup per row.

### Search

Search runs two branches and merges them, because MusicBrainz scores
release-group search almost entirely on the **title**. Searching an artist name
returns unrelated releases that happen to be *titled* that name, and the
artist's own albums fall outside the 100-result window entirely — no amount of
local re-ranking recovers them.

1. **Title branch** — `releasegroup:"q"^6 OR releasegroup:(q)`
2. **Artist branch** — only when the query is exactly an artist's name: resolve
   the artist, then query `arid:<mbid>` with the noisy secondary types excluded
   (an artist like Radiohead has 585 release-groups, mostly live bootlegs, and
   the studio albums would otherwise never make the first 100).

Results are merged, scored, de-duplicated by title+artist, and sorted. An
artist with a real discography outranks a title coincidence, which is why
"radiohead" leads with their albums while "in rainbows" still leads with
Radiohead's album rather than the obscure band actually called In Rainbows.

Two gotchas worth knowing if you touch these queries: secondary-type negations
must be **unquoted** (`-secondarytype:live`, not `-secondarytype:"live"`) or
they silently stop filtering, and a Lucene clause group made only of negations
matches nothing.

### Release types

The brief calls for Album / Single / EP / Mixtape / Compilation. In MusicBrainz
only the first three are `primary-type`; **Mixtape** (spelled `Mixtape/Street`)
and **Compilation** are `secondary-types`. `releaseType()` in
`src/lib/musicbrainz.ts` resolves the two into the single tag the UI shows:
secondary wins over primary, and anything marked live / soundtrack / spokenword
/ dj-mix / demo / remix / interview / audiobook is dropped rather than shown
under a misleading tag.

## Where this departs from the prototype

- **No iPhone chrome.** The prototype renders inside a device frame with a fake
  status bar and home indicator. That was Claude Design's presentation wrapper,
  not app UI. The app fills the viewport on phones and sits in a device-width
  column on wider screens.
- **The "STATES" demo bar is gone.** It was prototype scaffolding for switching
  between seeded states.
- **Community reviews are hidden.** The prototype seeded three fictional
  reviewers. earwrm has one account per person and the Social tab is still
  "Coming soon", so the section is switched off behind
  `SHOW_COMMUNITY_REVIEWS` in `ReleaseScreen.tsx` rather than filled with
  invented people.
- **Empty search shows "RECENTLY LOGGED", not "SUGGESTED FOR YOU."** There is no
  recommendation source behind this build.
- **Real cover art.** The prototype only ever drew a striped monogram because it
  had no data. Those stripes are now the fallback layer, with Cover Art Archive
  art fading in over them when it exists.
- **A sign-in screen exists.** The prototype assumed a signed-in user.
