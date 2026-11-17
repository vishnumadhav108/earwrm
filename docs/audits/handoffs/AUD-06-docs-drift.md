# AUD-06: Docs drift (mechanical fixes)

**Branch:** `docs/aud-06-drift`, one PR. Docs only.
**Goal:** a fresh session, or a new contributor, can follow the docs without being sent to files that moved, a Node version the repo doesn't use, or a database it shouldn't touch. Fixes findings **A-018** and the documentation part of **A-019** in `docs/audits/AUDIT_2026-11-16.md`.
**Depends on:** nothing. AUD-07 runs after this one because both edit `docs/handoffs/01-foundations.md` and `docs/README.md`.
**Read:** `CLAUDE.md`, `docs/README.md`, `docs/STAGING.md`, audit findings A-018, A-019 and § 7 (Q-09).

Writing this handoff did not authorize running it. Start in plan mode and show the plan first.

## Canonical files
- **Reads:** root `README.md`, `docs/ARCHITECTURE.md`, `docs/EXTERNAL-SOURCES.md`, `docs/RUNBOOK.md`, `docs/STAGING.md`, `docs/handoffs/01-foundations.md`, `.nvmrc`, `package.json`, `next.config.ts`, `supabase/legacy/README.md`.
- **Updates:** root `README.md`, `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/EXTERNAL-SOURCES.md`, `docs/RUNBOOK.md`, `docs/STAGING.md`, `docs/handoffs/01-foundations.md` (two Node mentions only).

## Starting-state checks
Stop and report if any is not true.
1. `git status --short` prints nothing; branch cut from current `main`.
2. `.nvmrc` contains `24` and `package.json` `engines.node` is `24.x`.
3. Root `README.md` § Setup still tells the reader to run `supabase/schema.sql`.
4. `docs/RUNBOOK.md` has no section describing which migrations production has applied.

## Scope
**In:** corrections of fact, listed below. **Out (non-goals):** `CLAUDE.md`, `AGENTS.md` and `docs/CONVENTIONS.md` (project rules; handoff 01b owns them); any handoff's tasks, tests or acceptance criteria (AUD-07 owns approved amendments); `docs/DECISIONS.md`; code.

## Tasks
1. **Root `README.md` § Setup.** Replace the three setup steps with a pointer to `docs/STAGING.md` § Local development (the five commands there). Say that `supabase/legacy/` is historical and is never run. Keep the stack, MusicBrainz and "departs from the prototype" sections as they are.
   - **Verify (proposed, not run):** on a fresh clone with Docker running, following only the README reaches `npm run dev` on the local stack. The dev server must not print the "pointed at a hosted Supabase project" refusal.
2. **Node 24, in docs and in the shell (Q-09).**
   - `docs/handoffs/01-foundations.md`: the two mentions of Node 26 (the "Local machine" line and the `.nvmrc` task) become Node 24, with a note "corrected 2026-11-16, audit A-018; the repo has pinned 24 since #17". Change nothing else in that file.
   - `docs/STAGING.md` § Local development: add a short "Node version" note. The repo needs Node 24 (`.nvmrc`). On this Windows machine a system-wide Node 26 at `C:\Program Files\nodejs` comes first on PATH unless fnm's environment is loaded in the shell, which is how the audit ran on 26. Give the fix for PowerShell and for Git Bash (loading fnm's environment from the shell profile; take the exact lines from fnm's current docs, don't write them from memory) and the fallback for a shell that can't load a profile: `fnm exec --using=24 <command>`.
   - **Verify:** in a new PowerShell window and a new Git Bash window, from the repo root, `node -v` prints `v24.` (proposed, not run). In a shell without the profile, `fnm exec --using=24 node -v` prints `v24.` (run during the audit on 2026-11-16: printed `v24.22.2`, while plain `node -v` in the same shell printed `v26.13.0`). If either still prints v26, the profile line isn't being loaded: stop and tell Vishnu, who decides whether to remove the system-wide install.
3. **`docs/ARCHITECTURE.md`.** "handoffs 01–12" becomes "01–13". In § 2, say staging migration runs only when `STAGING_ENABLED` is true. In § 8, mark Sentry and the restore drill as arriving in handoff 01 PR D2. No other edits.
4. **`docs/RUNBOOK.md`: new section "Production migration state".** A table of every file in `supabase/migrations/` with its state in production and how that is known. As of 2026-11-16: baseline marked applied by a manual `migration repair`; `keep_alive` applied; `feature_flags` **not applied**, approved to go out with the next production push (audit Q-08). Add the rule: update this table in the same PR description step that records a production apply.
   - **Verify (proposed, not run):** the table lists exactly the files `git ls-files supabase/migrations` prints.
5. **`docs/EXTERNAL-SOURCES.md`.** Add, each with its link and "read 2026-11-16":
   - Cover Art Archive: "These covers are being collected for archival purposes", "Use the images at your own risk"; the page grants no licence. Consequence: fine for linking covers while non-commercial; any reuse in generated images (06b, 10) and any commercial use needs its own review.
   - MusicBrainz API: "Non-commercial use of this web service is free"; one call per second per client; a meaningful User-Agent is required.
   - Wikimedia APIs: 200 requests a minute for unauthenticated clients with a compliant User-Agent, 10 a minute without; "new in 2026 and are subject to experimentation and change".
   - Supabase Free: projects pause after low activity over 7 days and can be restored for up to 1 year.
   Re-open each page before writing; if one has changed, write what it says now and note the difference.
6. **`docs/README.md`.** Under the order table, add one line pointing to `docs/audits/AUDIT_2026-11-16.md` for the audit handoffs and where they sit in the order. Don't edit the table (AUD-07 does).
7. **Record, don't fix.** In the PR description, list what you saw but left alone: the unused template SVGs in `public/`, the missing LICENSE file, and the stale references in `CLAUDE.md` (`src/components/ui`, `supabase/seed/`). They belong to handoffs 03, Vishnu and 01b.

## Tests
None; docs only. `npm run format:check` must still exit 0 (Markdown is excluded from Prettier, so this only proves nothing else changed).

## Stop and ask
- A correction would change a rule, a decision, or a handoff's tasks or criteria.
- An external page now contradicts what the audit recorded.
- The Node fix needs anything installed or removed on the machine.

## Rollback
Revert the PR.

## Acceptance criteria
- Following the root README on a fresh clone gives a running local app and never touches production.
- No doc names Node 26 as the project's version; `node -v` prints v24 in the shells Vishnu uses.
- `docs/RUNBOOK.md` states which migrations production has, and that `feature_flags` is pending.
- Negative: `git diff --stat main` shows changes only under `docs/` and to root `README.md`; `CLAUDE.md`, `AGENTS.md` and `docs/CONVENTIONS.md` are untouched.
