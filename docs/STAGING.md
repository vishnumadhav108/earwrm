# Environments: local, staging, production

| Env | Web | Database | How the schema gets there |
|---|---|---|---|
| local | `npm run dev` | local Supabase stack (Docker) | `npm run db:reset` |
| preview | a Vercel preview per branch or PR | `earwrm-staging`, **or demo mode** (see § Preview guard) | `staging-migrate` workflow on merge to main |
| production | earwrm-xi.vercel.app | `earwrm` | by hand (`supabase db push`), after review. Never automated |

## Staging setup (one-time checklist for Vishnu)

Staging is a separate Supabase project in a **separate Free organization**, so it never shares billing, members or credentials with production (docs/COSTS.md rule 6). Work through these in order.

1. **Create the staging org and project.** In Supabase, create a new organization (Free plan), then a project named `earwrm-staging` in it. Note the project ref: the 20 letters in the dashboard URL.
2. **Create a bot account for CI.** Sign up a separate Supabase account (for example a `+staging-bot` alias of your email). Invite it to the **staging organization only**, as Developer or Administrator. It must never be a member of the production organization.
3. **Create a scoped access token from the bot account.** Account → Access Tokens → new token:
   - **Scope:** the `earwrm-staging` project only.
   - **Permissions:** **Migrations: Read-write**, **Database: Read-write**, **Project Settings: Read**.
     - Migrations lets the workflow apply migrations and list their history.
     - Database covers the CLI's temporary login role, which `db push`, `migration list` and `db query --read-only` use.
     - Project Settings is needed for `GET /v1/projects/{ref}`, the paused/unavailable check.
     - Grant nothing else. In particular, not "Projects (account-wide)".
   - These permission names come from Supabase's docs (checked 2026-11-06); the dashboard's token page didn't load for verification. If a name differs in the form, choose the closest match and note it here.
   - Give it an expiry you'll remember to rotate, and keep it in your password manager.
4. **Check what the token can read.** In a terminal, with the token in an environment variable, not pasted into the command:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $BOT_TOKEN" https://api.supabase.com/v1/projects/<staging ref>
   curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $BOT_TOKEN" https://api.supabase.com/v1/projects/fvbifyhaamgaebsltulu
   ```
   - The first must print **200**. The second must print **401, 403 or 404**.
   - A timeout, a network error, or a 401 on the *first* request (an invalid token) is **not** a pass. Fix the token and repeat.
   - What this proves: **this token can't read production project details.** The broader isolation comes from the bot's staging-only membership and the token's scope.
5. **Dry run with the pinned CLI before enabling anything.** From the repo, with the bot token:
   ```bash
   SUPABASE_ACCESS_TOKEN="$BOT_TOKEN" STAGING_PROJECT_REF=<staging ref> PRODUCTION_PROJECT_REF=fvbifyhaamgaebsltulu node scripts/db/target.mjs staging -- migration list --remote=<staging ref>
   ```
   ```bash
   SUPABASE_ACCESS_TOKEN="$BOT_TOKEN" STAGING_PROJECT_REF=<staging ref> PRODUCTION_PROJECT_REF=fvbifyhaamgaebsltulu node scripts/db/target.mjs staging -- db push --dry-run --remote=<staging ref>
   ```
   The first should show an empty remote history. The second should list every migration in `supabase/migrations/` as pending and apply nothing. Don't continue until both work.
6. **Point Vercel previews at staging.** Vercel → Project → Settings → Environment Variables:
   - Set the **Preview** values for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to **staging's** values.
   - **Check that the Preview scope has no production Supabase values, including any branch-specific overrides.**
   - Sensitive variables can't be read back after saving, so keep the values in your password manager.
7. **Create the GitHub App that moves the staging tags.** GitHub → Settings → Developer settings → GitHub Apps → New:
   - **Private** (only this account can install it).
   - **No webhook** (untick "Active").
   - **Repository permissions: Contents: Read and write.** Nothing else; Metadata: Read is mandatory and added automatically.
   - Install it on **`earwrm` only** ("Only select repositories").
   - Generate a private key, and note the App ID.
8. **Create the GitHub Environment `staging`.** Repo → Settings → Environments → New → `staging`:
   - Deployment branches: **`main` only**.
   - Environment secrets:
     - `STAGING_APP_ID`
     - `STAGING_APP_PRIVATE_KEY` (the .pem contents)
     - `SUPABASE_ACCESS_TOKEN` (the bot's scoped token)
     - `STAGING_ANON_KEY` (staging's anon key, for the pinger)
9. **Repository variables** (Settings → Secrets and variables → Actions → Variables):
   - `STAGING_PROJECT_REF`
   - `PRODUCTION_PROJECT_REF` = `fvbifyhaamgaebsltulu` (used only to refuse it)
   - `STAGING_ENABLED` = `false` for now
10. **Rulesets.** See § GitHub settings.
11. **Enable and bootstrap.** Set `STAGING_ENABLED` = `true`. Then Actions → *Staging migrations* → Run workflow → mode **bootstrap** (see § Bootstrap). After it succeeds, both tags exist and later merges to main migrate staging automatically.
12. **After this PR (D1) merges:**
    - Rebase open PRs, so their previews build with the guard.
    - Delete obsolete preview deployments that still carry production Supabase configuration or were built before the guard existed. Do this even though Deployment Protection is on.
      - **Confirm each one is a Preview before deleting it. Never delete a production deployment.**
    - Keep Deployment Protection on as an extra access restriction.

### Bootstrap (one-time)
`mode=bootstrap` is allowed only on a fresh project. It refuses unless all of these hold:
- `staging-last-good` doesn't exist;
- staging's migration history is empty;
- **staging has no app-owned objects**, checked with `scripts/db/snapshot.sql` through `db query --read-only`. Supabase's own default privileges are ignored.

Then it runs, in order:
1. Apply all migrations.
2. Verify the migration history equals this commit's migrations.
3. Compare staging's app-owned objects with a clean local build of the same commit: grants, policies, functions, our triggers on managed tables, the same scope as `verify:migrations`.
4. Publish `staging-last-good`.
5. Publish `staging-applied`.

**Any difference stops the run**, publishes nothing, and comes to review. If it fails after partly applying migrations, see RUNBOOK § Staging recovery.

### How staging stays migrated
`.github/workflows/staging-migrate.yml` runs on every push to main (only when `STAGING_ENABLED` is `true`). When enabled, missing configuration fails clearly. It keeps two tags:
- **`staging-last-good`**: the newest commit whose migrations were pushed to staging *and verified*. It's never deleted and only moves forward (an ancestry check enforces this).
- **`staging-applied`**: published last, after verification. Preview builds compare against it, and it's deleted before any push.

Each run:
1. Mints a GitHub App token.
2. Reads the state: both tags, the project status, and the applied migrations. It reports **auth** problems and **"staging unavailable, possibly paused"** separately.
3. Checks `staging-last-good` is an ancestor of this commit, and that staging's applied migrations sit between the two. If the database and the tags disagree, it stops (RUNBOOK § Staging recovery).
4. If the migration files are identical to `staging-last-good`'s and staging matches, it skips the push. Otherwise it deletes `staging-applied` (and confirms it's gone), runs `db push`, and verifies staging has exactly this commit's migrations. A failing migration is reported as a **SQL error** with its version.
5. Moves `staging-last-good`, then publishes `staging-applied`, confirming each. If either fails, `staging-applied` stays absent.

Retrying the same commit is safe. Staging is kept awake by a best-effort daily pinger (`staging-keepalive.yml`); see RUNBOOK § Resume staging.

## Preview guard
The preview guard checks migration equality at build time. Existing previews are not automatically invalidated when staging changes. Use synthetic data only; redeploy and revalidate previews after staging migrations (the branch may need updating first). Review migrations for compatibility with existing application behavior, including policies, triggers, constraints, and functions.

How it works:
- `vercel.json` makes every Vercel build run `scripts/vercel-build.mjs`.
  - Production and other non-preview builds run a plain `next build`, as before.
  - A preview build compares this commit's `supabase/migrations/` (filenames and contents) with the `staging-applied` tag. If they're identical, the preview runs against staging. On any difference, a missing tag, or any error, it's built in **demo mode** (`NEXT_PUBLIC_EARWRM_PREVIEW_GUARD=1`).
  - The build log always shows one line: `[preview-guard] full: …` or `[preview-guard] demo: …`.
- In demo mode:
  - every page redirects to `/demo`, and app APIs answer **503**;
  - static assets, `/demo` and `/api/mb` (MusicBrainz only, which never touches Supabase) keep working;
  - **every Supabase client factory refuses to create a client**, in the browser and on the server, so nothing can reach staging.
  - `npm run test:e2e:guard` proves it with a tripwire standing in for Supabase.
- A schema-changing PR therefore never writes to shared staging. Its database behaviour is tested in CI's isolated local stack instead.

### GitHub settings
Settings → Rules → Rulesets:
- **`main` (branch ruleset), active:**
  - target the default branch;
  - **require a pull request** before merging;
  - **require status checks**: *Static checks*, *Database*, *Unit tests*, *E2E*, *Release order*;
  - **block force pushes**; **restrict deletions**.
  - No bypass list, so direct pushes are blocked for everyone, including you.
- **`staging tags` (tag ruleset), active:**
  - target tags **`staging-applied`** and **`staging-last-good`**;
  - **restrict creations**, **restrict updates**, **restrict deletions**;
  - **bypass list: only the GitHub App** from step 7. Don't add Repository admin.
- **Then test it from your laptop:** `git push origin HEAD:refs/tags/staging-applied`, and a delete with `git push origin :refs/tags/staging-applied`, must both be **rejected**. GitHub's docs don't say whether admins bypass automatically, so this confirms it.

### Later option: Supabase Branching
Branching gives each PR its own isolated database, but it's billed by usage (Micro compute from $0.01344/hour, verified). It's **not enabled**. Revisit it if previews of schema-changing PRs need real data paths. Production migrations stay manual either way.

## Local development

Local development runs against the **local Supabase stack** (Docker), never production.

### First time, and after every `git pull`
```bash
npm ci
npx supabase start          # starts the local stack (Docker Desktop must be running)
npm run env:local           # writes .env.localstack + .env.development.local from `supabase status`
npm run db:reset            # rebuilds the local database from supabase/migrations + supabase/seed.sql
npm run dev                 # http://localhost:3000, on the local stack
```

- **Seeded test user:** see the header of `supabase/seed.sql`. It's local only, and `db:reset` recreates it every time.
- **Local email:** with confirmations off locally, sign-up works straight away. Mail the stack sends shows up in Mailpit at http://127.0.0.1:54324.
- **Studio:** http://127.0.0.1:54323.

### Which env file is used where
| Command | Env source | Database |
|---|---|---|
| `npm run dev` | `.env.development.local` (loaded ahead of `.env.local`) | local stack |
| `npm run build:local`, `check`, `test:e2e` | `.env.localstack`, via `scripts/with-local-env.mjs`. It sets every `.env.example` key and blanks any other key found in Next's env files (e.g. `VERCEL_OIDC_TOKEN`), so nothing from `.env.local` leaks in | local stack |
| `npm run build` / `next start` | `.env.local` | **production** (only for reproducing a prod build. Don't use it to test writes) |
| Vercel builds | the deployment's configured env vars | per Vercel environment |

All of these files are gitignored. `.env.local` holds the production values, copied by hand because Vercel marks them Sensitive.

### Guards
- **`next dev` refuses a hosted database.** If `NEXT_PUBLIC_SUPABASE_URL` isn't localhost, the dev server exits with an explanation (`next.config.ts`). That happens, for example, if `.env.development.local` is missing and `.env.local` (production) is all that's left.
  - To point dev at a hosted project **on purpose**, set `EARWRM_ALLOW_REMOTE_DB=1` for that one run (PowerShell: `$env:EARWRM_ALLOW_REMOTE_DB = "1"; npm run dev`, then `Remove-Item Env:EARWRM_ALLOW_REMOTE_DB`).
- **Database commands go through `scripts/db/target.mjs`.** `db:reset`, `db:types`, `test:db` and `verify:migrations` only ever run against the local stack. The script prints its target and refuses `--remote` and the other hosted-target flags. Its `production-read` mode allows only schema dumps and `migration list` against production, with a password. There's no mode that writes to production.

### Switching back to production for a single check
Don't. Use the deployed site, or (from PR D) a Vercel preview on staging. If you really need a local build against production data, use `npm run build && npm run start` (production mode reads `.env.local`). That talks to the live database, so treat every click as real.

### Troubleshooting
- **`supabase_vector` crash-loops on Windows:** analytics is off in `supabase/config.toml`, so vector no longer starts. If it does, use `npx supabase start -x vector`.
- **`[local-env] REFUSED: missing …`:** run `npm run env:local` (the stack must be running).
- **Keys changed after `supabase stop --no-backup`:** run `npm run env:local` again.
