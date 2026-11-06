# Legacy schema files (historical, do not run)

These two files are how the production schema was first created, pasted into the Supabase SQL editor by hand before the project had migrations:

- `schema.sql`: tables, RLS policies, and the `handle_new_user` signup trigger.
- `002_grants.sql`: table grants added later, after writes failed with "permission denied".

They're kept for history only. **Don't run them** against any database. The source of truth is now `supabase/migrations/`, starting with `20260831000000_baseline.sql`, which was rebuilt from a read-only dump of production in handoff 01. Differences between these files and production are listed in the baseline PR.

The synthetic legacy-upgrade fixture used by `verify:migrations` (handoff 01, PR B) is modelled on these files.
