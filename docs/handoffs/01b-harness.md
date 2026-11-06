# 01b: Claude Code harness

**Branch:** `chore/harness`, one PR.
**Goal:** every later session picks up where the last one stopped, can't weaken its own done criteria, and can't touch secrets or hosted databases without asking. No app code changes.

**Depends on:** 01 (needs `npm run check`).

**Read:** `CLAUDE.md`, `docs/CONVENTIONS.md`, and the current Claude Code docs for settings, permissions and hooks (check the exact syntax; don't write it from memory).

## Tasks
1. **Progress log:** create `docs/PROGRESS.md`, **append-only**. Write one entry at the end of every session in this format:
   - **Date / handoff / branch**
   - **Done:** what changed
   - **Verified:** the commands run and their result (paste the summary lines, don't just say they pass)
   - **Open problems**
   - **Next**
   - **Needs Vishnu:** anything blocked on a decision, credential or manual step

   Add a first entry that summarizes handoffs 00 and 01.
2. **CLAUDE.md working principles.** Add these to CONVENTIONS "Working rules" (and so to CLAUDE.md), keeping CLAUDE.md under about 60 lines:
   - **Think first:** state your assumptions. If a request can be read more than one way, ask.
   - **Simplest solution:** the minimum code. No options or abstractions nobody asked for.
   - **Surgical changes:** touch only what the task needs and match the existing style. Every changed line traces back to the task.
   - **Verify with evidence:** a bug gets a failing test first. "Done" comes with command output.
   - **Done criteria are fixed:** never change a handoff's tasks, tests or acceptance criteria. If one is wrong or can't be met, stop and ask.
   - **Ask before adding any dependency.**
   - **Blocked** (missing credentials, a decision, a manual step): stop cleanly and log it in PROGRESS.md. Don't retry or work around it.
   - **Corrected twice on the same thing:** stop and log it.
   - **Session start:** read the handoff, `ARCHITECTURE.md`, `CLAUDE.md`, the latest PROGRESS.md entry and `git log --oneline -20`. If `npm run check` fails on a fresh checkout, fix that first.
   - **Session end:** append to PROGRESS.md. Never edit past entries.
3. **`.claude/settings.json` permissions** (committed):
   - **Allow:** npm scripts for build, test, lint, format, typecheck and local db (`db:reset`, `db:types`, `test:db`); local git (status, diff, log, add, commit, switch, branch); `supabase start|stop|status`.
   - **Ask:** `git push`, `gh`, package installs (`npm install <pkg>`, `npx` of anything new), network fetches, and **any Supabase CLI command containing `--remote`**.
   - **Ask:** Supabase and Vercel MCP tools that write: `apply_migration`, `execute_sql`, branch, edge-function and secret tools, deploys, env var and project setting changes. Read-only MCP tools (list, get, logs, docs search) may be allowed.
   - **Deny:** reading `.env*` (except `.env.example` and `.env.localstack.example`), `*.pem`, `*.key`, and `supabase/.temp/`. Cover both the Read tool and shell commands like `cat`/`type`. Scripts like `env:local` still work, because they run as programs rather than Claude reading the files.
   - Document in the PR which rules are best-effort (shell patterns can be bypassed) and which are firm.
4. **Stop hook** (`.claude/hooks/`, Node so it runs on Windows):
   - Runs a **fast** gate: `format:check`, `typecheck`, `lint` and unit tests. Not `test:db`, build or e2e, which stay in CI. Target under 30 s. Report the measured time in the PR.
   - If the gate fails, it blocks stopping and shows the failing output.
   - **Reads `stop_hook_active` from the hook input and lets Claude stop if it's already true**, so a failing check can't loop forever.
   - Skips if nothing under `src/`, `supabase/`, `tests/` or config files changed since the last commit (`git status --porcelain`), so pure Q&A turns don't wait.
   - Test the hook: one passing run, one failing run that blocks, and one run with `stop_hook_active` set that doesn't loop.
5. **Zero-test guard:** confirm PR C of handoff 01 made Vitest, Playwright and `supabase test db` each fail when zero tests ran. If any of them doesn't, add the guard here (for example, a CI step that parses the reported test count and fails on 0).
6. **README:** add "Start a fresh session (or `/clear`) for each handoff" above the start prompt, add "and the latest entry in docs/PROGRESS.md" to the files it reads, and add a row for 01b (harness, depends on 01) to the order table, with 02 now depending on 01b.

## Acceptance criteria
- A fresh session following the new start prompt finds the latest PROGRESS.md entry and the handoff it points to.
- Claude Code asks before `git push`, any `--remote` CLI command and any Supabase/Vercel MCP write, and can't read `.env.local`.
- The Stop hook blocks on a failing gate, allows stopping on the second attempt (`stop_hook_active`), and finishes in under 30 s on a clean tree.
- CLAUDE.md stays under about 60 lines.
