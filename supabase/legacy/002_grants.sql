-- Fixes: "permission denied for table X" on every write.
--
-- Enabling RLS and writing policies is only half the story. RLS decides which
-- *rows* a role may touch; the role must separately hold table-level
-- privileges, and a policy cannot grant what was never granted. Supabase
-- normally hands `authenticated` these privileges through default privileges on
-- the public schema, but that only applies when the DDL runs as the role those
-- defaults were configured for — so tables created by a pasted script can end
-- up with policies and no grants, which fails closed on every write.
--
-- All eight tables had the gap, not only the four that surfaced it; the other
-- four simply had not been exercised yet. Safe to re-run.

grant usage on schema public to authenticated;

-- Diary and the other per-user tables: full CRUD, fenced in by RLS to the
-- owner's rows. UPDATE is required even where the app looks insert-only,
-- because supabase-js .upsert() emits INSERT ... ON CONFLICT DO UPDATE.
grant select, insert, update, delete on public.entries    to authenticated;
grant select, insert, update, delete on public.queue      to authenticated;
grant select, insert, update, delete on public.likes      to authenticated;
grant select, insert, update, delete on public.favorites  to authenticated;
grant select, insert, update, delete on public.lists      to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;

-- Shared reference data. Deliberately no DELETE: the release cache is common to
-- every user, so one account must not be able to evict another's rows.
grant select, insert, update on public.releases to authenticated;

-- Profiles: the row is created by the on-signup trigger (security definer) and
-- updated when settings change. No DELETE — removing a profile happens by
-- cascade from auth.users, which runs with elevated privilege.
grant select, insert, update on public.profiles to authenticated;
-- service_role normally receives these through Supabase's default privileges
-- too. On this project it did not, so grant them explicitly: without it the
-- SQL editor, dashboard table view, and any server-side admin work hit the
-- same wall. anon is deliberately left out — earwrm requires a signed-in user,
-- so unauthenticated clients have no reason to reach these tables at all.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on schema public to service_role;

