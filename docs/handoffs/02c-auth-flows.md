# 02c: Bug fixes from the review (auth flows)

**Branch:** `fix/02c-auth-flows`, one PR.
**Goal:** fix every finding below. Each fix comes with a test that fails before the fix and passes after.
**Depends on:** 02b merged.

Part 3 of 4 of handoff 02, split on 2026-11-16 (audit proposal P-2, `docs/audits/AUDIT_2026-11-16.md`). The index is `docs/handoffs/02-bug-fixes.md`. Item numbers are the original ones, so earlier references still resolve.

These flows are tested with local mail. They aren't live for real users until a custom SMTP provider is configured (handoff 01 task 15). (Added 2026-11-16, audit Q-06, A-025.)

## Rules
- Make database changes in a new migration (`supabase migration new review_fixes`).
- Don't refactor beyond what a fix needs. Handoff 03 does the restructuring.
- For each item: write the failing test, fix it, then confirm the test passes.

## Bugs
12. **No email confirmation callback.** Add `/auth/callback` (PKCE code exchange with `@supabase/ssr`), set `emailRedirectTo` on signUp, and check `src/proxy.ts`. **Test:** e2e with local Supabase (Inbucket/Mailpit catches the email).
13. **No forgot-password flow.** Add a reset email plus a page for setting a new password. **Test:** e2e with local mail.
14. **Settings account rows don't work.**
    - Display name becomes editable.
    - Username becomes editable, with a uniqueness check and a friendly error.
    - Password opens the change-password flow.
    - Email stays read-only, with no chevron.
    - **Test:** e2e.
20. **The password minimum is 6 in the app and 8 in production.** Production's minimum password length was raised to 8 on 2026-11-16. The login form still has `minLength={6}` (`src/app/login/page.tsx`) and the local stack still allows 6 (`minimum_password_length` in `supabase/config.toml`), so a 6- or 7-character password passes the form and is refused by production, and local and CI accept what production rejects. **Fix:** move both from 6 to 8 to match production. **Test:** e2e with local Supabase: signing up with a 7-character password is refused with a clear message, and an 8-character one works. (Added 2026-11-16, audit § 8, approved by Vishnu.)

## Acceptance criteria
- Every item (12, 13, 14, 20) has a test that fails on `main` and passes on this branch. The PR description lists the test file for each item.
- CI is green. Demo mode works.

## PR
A table of item # → fix → test. Include the migration to apply to production once staging looks right.
