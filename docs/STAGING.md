# Environments: local, staging, production

> Started in handoff 01, PR B, with § Local development. PR D adds the staging setup, the
> Vercel Preview environment, GitHub secrets and § GitHub settings.

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
