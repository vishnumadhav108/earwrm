-- Every table in public must have row level security enabled.
--
-- Production also runs Supabase's `ensure_rls` event trigger, which turns RLS on for new
-- tables automatically. The app must never rely on it: the local stack doesn't have it,
-- and a table created any other way (ALTER, restore, another schema moved in) bypasses
-- it. This test runs against the migrations alone, so a migration that forgets
-- `enable row level security` fails here.
begin;
select plan(2);

select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
    order by 1
  $$,
  'every table in public has RLS enabled'
);

-- Guard against the test passing vacuously, e.g. if the schema failed to build.
select cmp_ok(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')),
  '>=', 8,
  'public has the baseline tables to check'
);

select * from finish();
rollback;
