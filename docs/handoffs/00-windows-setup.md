# 00: Windows setup

**Goal:** the repo runs on the Windows PC with local Supabase, and nothing in the app changes.

**Before you start (on the Mac):** run `git status` and `git log origin/main..main`. If either shows anything, push it. The last commit on GitHub is "demo mode added" from Sep 2.

## Prompt
I'm moving my Next.js project earwrm (github.com/vishnumadhav108/earwrm) from my Mac to this Windows PC. Set it up step by step. After each step, confirm it worked. If something fails, stop and tell me.

1. **Tools.** Check each of these and tell me exactly how to install anything that's missing:
   - Git for Windows
   - Node.js LTS
   - GitHub CLI (`gh auth status` must show me logged in)
   - Vercel CLI
   - Docker Desktop with the WSL 2 backend, needed for local Supabase
   - Supabase CLI
2. **Clone** to `C:\dev\earwrm`. Keep spaces and OneDrive out of the path.
3. **Line endings.** Add `.gitattributes` with `* text=auto eol=lf`, renormalize if needed, and set `git config core.autocrlf false` for this repo.
4. **Env vars.** Run `vercel link` (the earwrm project), then `vercel env pull .env.local`. Variables marked Sensitive in Vercel can't be pulled, so copy those values from the Mac's `.env.local` by hand. Confirm the variable names in `.env.example` are all present, without printing any values, and that `.env.local` is gitignored. `vercel link` may add lines to `.gitignore` that ignore `.env.example`; remove them.
5. **Run `npm install`.** The lockfile is out of sync, so let it be rewritten and leave the change uncommitted. Handoff 01 commits it.
6. **Smoke test.** Run `npx tsc --noEmit`, `npx eslint src` and `npm run dev`. Then open `/demo` and `/login`, sign in with my real account and confirm my diary loads.
7. **Supabase CLI.** Run `supabase login`. If the repo has no `supabase/config.toml`, run `supabase init` (leave the result uncommitted for handoff 01). Then `supabase link` to my production project. Run `supabase start`, confirm the local stack comes up, then run `supabase stop`. Don't push or pull schema yet. Handoff 01 handles that.

Don't change app code.
