# AUD-08: Only the server writes catalog rows

**Branch:** `fix/aud-08-catalog-writes`, two PRs in release order: 08-i (app), then 08-ii (migration-only).
**Goal:** the shared `releases` table holds only what MusicBrainz says. A signed-in user can read it and nothing else. Second half of finding **A-002** (`AUD-SEC-1`) in `docs/audits/AUDIT_2026-11-16.md`; approved as Q-02 (decision D30 once AUD-07 has merged). Supersedes handoff 02 item 10.
**Depends on:** AUD-02 merged and applied in production. F-2 (data dump) before each production step.
**Read:** `CLAUDE.md` (Code, Release order, Tests), `AGENTS.md` and the Next.js route-handler guide under `node_modules/next/dist/docs/` before writing the route, `docs/STAGING.md` § Preview guard, `docs/EXTERNAL-SOURCES.md` § MusicBrainz, audit finding A-002.

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** `src/lib/store.tsx` (`remember`, `ensureRelease`, `persistWithRelease`), `src/lib/musicbrainz.ts` (`toRelease`, `getRelease`, the caches), `src/lib/rateLimit.ts`, `src/app/api/account/route.ts` (the pattern for a route that needs the service role), `src/lib/supabase/admin.ts`, `src/lib/supabase/guard.ts`, `src/proxy.ts`, `supabase/migrations/20260831000000_baseline.sql` (policies on `releases`, lines 151–157; grants, lines 188–190), `tests/e2e/fixtures.ts`, `scripts/e2e-server.mjs`.
- **Updates (08-i):** a new route handler under `src/app/api/`, `src/lib/musicbrainz.ts`, `src/lib/store.tsx` (`remember` only), unit tests, the e2e server and fixtures.
- **Updates (08-ii):** one new migration, `supabase/tests/` (new assertions; adjust AUD-02's test to insert as `service_role`).

## Starting-state checks
Stop and report if any is not true.
1. `node -v` prints `v24.`
2. `git status --short` prints nothing; branch cut from `main` with AUD-02 merged.
3. `remember()` in `src/lib/store.tsx` still upserts into `releases` from the browser. If handoff 03 has replaced the store with `src/data/`, stop and ask where the call now lives.
4. Policies "cache releases" (INSERT) and "refresh releases" (UPDATE) still exist for `authenticated`.
5. The six constraints from AUD-02 exist on `public.releases`.
6. `npm run check` passes before any change.

## Scope
**In:** a server route that creates a `releases` row from MusicBrainz data; the client calling it; removing the client's write access.
**Out (non-goals):** re-checking or repairing rows already in the table (list it as a follow-up); the shared limiter and Postgres cache (03b); per-user rate limiting (03 § 5b); renaming the table (05a); a new dependency (validate by hand; `zod` arrives in handoff 03).

## Tasks, PR 08-i (app only, compatible with today's schema)
1. **Plan the test seam before coding, and show it.** The e2e suite must never call the real MusicBrainz, and today it only intercepts browser requests. The new route fetches on the server, so it needs a server-side stand-in: for example a base-URL override for MusicBrainz that `scripts/e2e-server.mjs` points at a small local fixture server, accepted only for loopback addresses. Say in the plan how production is prevented from ever honouring it.
2. **Failing tests first.**
   - Unit, route handler: no session → 401; an id that isn't a UUID → 400 with no upstream call; a valid id → one upstream lookup and a row whose every field comes from the upstream response, whatever the request body contained; upstream failure → 502 and no row; missing service-role key → 501.
   - E2E, local Supabase: sign up, log an album never seen before, reload, it's still there (the existing round trip, now through the route).
   - **Verify (proposed, not run):** `npm test`. Expected on `main`: the new unit file fails because the route doesn't exist.
3. **The route.** `POST`, signed-in users only (`getUser()`), body carries only the release-group id. It returns the existing row if there is one. Otherwise it looks the release group up from MusicBrainz through the existing throttle (one call; reuse `toRelease()` so the row is shaped exactly as today), and inserts with the service-role client, ignoring a duplicate. Search results the server has already fetched may be kept in a bounded in-memory map by id so that logging straight from search usually costs no extra upstream call. Errors are visible: the route never reports success without a row.
4. **The client.** `remember()` calls the route instead of upserting. `ensureRelease` and `persistWithRelease` keep their behaviour: a failed `remember` still backs the dependent write out with the existing dialog. Demo mode still short-circuits and never calls the route.
   - **Verify (proposed, not run):** `npm run check`, then `npm run test:e2e` and `npm run test:e2e:guard` (local stack running, Chromium installed). Expected: exit 0, and the e2e fixture reports no request to an outside host. In a guard build the route must answer 503 like every other app API.
5. **PR 08-i description.** App-only; works against the current schema because the service role bypasses RLS; needs `SUPABASE_SERVICE_ROLE_KEY` in every environment that logs (already required for account deletion); the measured delay of logging a brand-new album, before and after.

## Between the PRs (Vishnu)
Deploy 08-i to production and use it for a day. Confirm in the deployed app that logging a new album works and that the browser's network panel shows no direct write to `releases`.

## Tasks, PR 08-ii (migration-only, after 08-i is live)
6. **Failing test first.** pgTAP: as `authenticated`, INSERT and UPDATE on `releases` are denied; SELECT still works; as `service_role`, a valid insert works and a malformed one still violates AUD-02's constraints.
   - **Verify (proposed, not run):** `npm run test:db` on `main`'s schema: the new assertions fail.
7. **Migration.** `npx supabase migration new releases_server_only_writes`: drop policies "cache releases" and "refresh releases"; revoke INSERT and UPDATE on `public.releases` from `authenticated`. Leave SELECT.
   - **Verify (proposed, not run):** `npm run db:reset` (local only), `npm run test:db`, `npm run verify:migrations`, `npm run check`, `npm run test:e2e`. Expected: all exit 0. If the e2e round trip fails here, something in the app still writes `releases` from the browser: fix it in a new app PR first, never by loosening the migration.

## Production step for 08-ii (Vishnu, by hand)
Dump first. `migration list` shows only this migration pending. Apply by hand. Verify: log a new album in the deployed app; then, signed in, try an insert into `releases` from the browser console with the app's own client and confirm it is refused.

## Stop and ask
- Logging a brand-new album becomes noticeably slower and the in-memory map doesn't help (measure first).
- The test seam needs a production code path you aren't sure can be closed.
- An existing row looks wrong. Don't repair data in this handoff.
- A tab opened before 08-ii was applied can still be in use: its old code will show the "release details never reached the server" dialog until reloaded. If that isn't acceptable, say so before 08-ii.

## Rollback
08-ii: a new migration re-creating the two policies and the grants from `baseline.sql`. 08-i: revert the PR (only before 08-ii is applied; after it, the old client can't write).

## Acceptance criteria
- A signed-in user can log an album that has never been logged by anyone, and it survives a reload.
- Sending the route a made-up title or colours has no effect: the stored row matches MusicBrainz.
- Negative: through the Data API, a signed-in user's INSERT or UPDATE on `releases` is refused; an unsigned request to the route gets 401; a non-UUID id gets 400 and causes no upstream request.
- Demo mode and preview-guard builds never reach Supabase (the existing guard suite still passes).
