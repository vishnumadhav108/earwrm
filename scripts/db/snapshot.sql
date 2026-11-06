-- App-owned objects in the database, one row per object, for comparing two builds.
-- Used by scripts/db/verify-migrations.mjs. Supabase-managed objects (auth internals,
-- extensions, the platform's rls_auto_enable) are excluded. Our trigger on auth.users
-- is included because it calls a public function.
with tbl as (
  select c.oid, c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
fn as (
  select p.oid, p.proowner, p.proacl
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname <> 'rls_auto_enable'
)
select kind, name, detail from (
  select 'table' as kind, c.relname::text as name,
         'rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity as detail
  from tbl join pg_class c on c.oid = tbl.oid

  union all
  select 'column', table_name || '.' || column_name,
         concat_ws(' ', data_type,
                   case when character_maximum_length is not null then '(' || character_maximum_length || ')' end,
                   case when numeric_precision is not null and data_type = 'numeric'
                        then '(' || numeric_precision || ',' || numeric_scale || ')' end,
                   case when is_nullable = 'NO' then 'not null' end,
                   'default ' || column_default)
  from information_schema.columns
  where table_schema = 'public' and table_name in (select relname from tbl)

  union all
  select 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid)
  from pg_constraint
  where conrelid in (select oid from tbl)

  union all
  select 'index', i.indexrelid::regclass::text, pg_get_indexdef(i.indexrelid)
  from pg_index i
  where i.indrelid in (select oid from tbl)

  union all
  select 'policy', tablename || '.' || policyname,
         concat_ws(' | ', cmd, permissive, roles::text, 'using ' || qual, 'check ' || with_check)
  from pg_policies
  where schemaname = 'public'

  union all
  select 'table_grant', table_name || ' -> ' || grantee,
         string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select relname from tbl)
    and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
  group by table_name, grantee

  union all
  select 'function', fn.oid::regprocedure::text, pg_get_functiondef(fn.oid)
  from fn

  union all
  select 'function_grant',
         fn.oid::regprocedure::text || ' -> ' || case when a.grantee = 0 then 'PUBLIC' else a.grantee::regrole::text end,
         string_agg(a.privilege_type, ',' order by a.privilege_type)
  from fn, aclexplode(coalesce(fn.proacl, acldefault('f', fn.proowner))) a
  where a.grantee = 0 or a.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
  group by fn.oid, a.grantee

  union all
  select 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where not t.tgisinternal
    and (p.pronamespace = 'public'::regnamespace or t.tgrelid in (select oid from tbl))

  union all
  select 'default_acl', defaclrole::regrole::text || ' ' || defaclobjtype::text, defaclacl::text
  from pg_default_acl
  where defaclnamespace = 'public'::regnamespace and defaclrole = 'postgres'::regrole
) s
order by kind, name;
