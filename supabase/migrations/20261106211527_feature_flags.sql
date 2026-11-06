-- Kill switches for risky subsystems (imports, enrichment, recommendations), so they can
-- be turned off without touching manual logging. Later handoffs add their own rows.
--
-- Flags aren't secret. Anyone, including anon, may read them, so the server can check a
-- flag on signed-out requests with the normal anon client. Only service_role (the
-- dashboard, or server-side admin code) may change them.

create table public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  -- Percentage of users (0-100) who see the flag on when enabled. Bucketing is in
  -- src/lib/flags.ts.
  rollout     smallint not null default 100,
  description text,
  updated_at  timestamptz not null default now(),
  constraint feature_flags_key_format check (key ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  constraint feature_flags_rollout_range check (rollout between 0 and 100)
);

alter table public.feature_flags enable row level security;

create policy "anyone reads flags" on public.feature_flags
  for select to anon, authenticated using (true);

-- Production's default privileges (reproduced in the baseline) would give anon and
-- authenticated REFERENCES, TRIGGER, TRUNCATE and MAINTAIN on this new table. Don't
-- inherit the over-broad defaults that handoff 02 item 16 removes. Grant exactly what
-- the table needs.
revoke all on table public.feature_flags from anon, authenticated;
grant select on table public.feature_flags to anon, authenticated;
grant all on table public.feature_flags to service_role;
