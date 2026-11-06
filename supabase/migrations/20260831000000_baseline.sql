-- Baseline: the earwrm schema as it exists in production before migration history began.
--
-- Written by hand from a read-only, schema-only dump of production (public and auth
-- schemas, 2026-11-06), not from `db pull`. It reproduces production as it is,
-- including grants that are wider than they should be. Tightening them is handoff 02's
-- job, not the baseline's.
--
-- Production never runs this file. Its tables were created by hand from what is now
-- supabase/legacy/. After this migration merges, production gets
-- `supabase migration repair 20260831000000 --status applied`, run by hand and
-- approved separately. The next migration, 20261005000453_keep_alive, is already in
-- production's history.
--
-- Not included: public.rls_auto_enable() and its event trigger `ensure_rls` (enabled in
-- production, checked 2026-11-06). Supabase manages them, the app didn't create them,
-- and a fresh local stack doesn't have them. Every migration enables RLS itself, and
-- supabase/tests/rls_enabled_test.sql fails if any public table doesn't. See
-- docs/VENDOR-DEPENDENCIES.md.

-- -------------------------------------------------------- default privileges --
-- Production's defaults for objects postgres creates in public: tables get only
-- REFERENCES, TRIGGER, TRUNCATE and MAINTAIN for the API roles, and functions and
-- sequences get nothing. A fresh local stack grants ALL. Match production, so a table
-- that forgets its GRANTs fails closed here the same way it would there.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- ------------------------------------------------------------------ functions --
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- --------------------------------------------------------------------- tables --
create table public.profiles (
  id           uuid not null,
  username     text,
  display_name text,
  settings     jsonb not null default
    '{"recap": false, "autoQueue": true, "halfStars": true, "privateDiary": true}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username),
  constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

-- Shared cache of MusicBrainz release groups (public metadata, not user-scoped).
create table public.releases (
  id         text not null,
  title      text not null,
  artist     text not null,
  year       integer,
  type       text not null,
  initials   text not null,
  c1         text not null,
  c2         text not null,
  updated_at timestamptz not null default now(),
  constraint releases_pkey primary key (id),
  constraint releases_type_check check (type = any (array['Album', 'Single', 'EP', 'Mixtape', 'Compilation']))
);

create table public.entries (
  user_id    uuid not null,
  release_id text not null,
  rating     numeric(2,1) not null default 0,
  review     text not null default '',
  logged_on  date not null default current_date,
  created_at timestamptz not null default now(),
  constraint entries_pkey primary key (user_id, release_id),
  constraint entries_rating_check check (rating >= 0 and rating <= 5),
  constraint entries_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint entries_release_id_fkey foreign key (release_id) references public.releases (id)
);
create index entries_user_date_idx on public.entries using btree (user_id, logged_on desc);

create table public.queue (
  user_id    uuid not null,
  release_id text not null,
  position   integer not null default 0,
  constraint queue_pkey primary key (user_id, release_id),
  constraint queue_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint queue_release_id_fkey foreign key (release_id) references public.releases (id)
);

create table public.likes (
  user_id    uuid not null,
  release_id text not null,
  constraint likes_pkey primary key (user_id, release_id),
  constraint likes_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint likes_release_id_fkey foreign key (release_id) references public.releases (id)
);

create table public.favorites (
  user_id    uuid not null,
  release_id text not null,
  position   integer not null default 0,
  constraint favorites_pkey primary key (user_id, release_id),
  constraint favorites_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint favorites_release_id_fkey foreign key (release_id) references public.releases (id)
);

create table public.lists (
  id          uuid not null default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  description text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint lists_pkey primary key (id),
  constraint lists_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

create table public.list_items (
  list_id    uuid not null,
  release_id text not null,
  position   integer not null default 0,
  constraint list_items_pkey primary key (list_id, release_id),
  constraint list_items_list_id_fkey foreign key (list_id) references public.lists (id) on delete cascade,
  constraint list_items_release_id_fkey foreign key (release_id) references public.releases (id)
);

-- ------------------------------------------------------------------------ RLS --
alter table public.profiles   enable row level security;
alter table public.releases   enable row level security;
alter table public.entries    enable row level security;
alter table public.queue      enable row level security;
alter table public.likes      enable row level security;
alter table public.favorites  enable row level security;
alter table public.lists      enable row level security;
alter table public.list_items enable row level security;

create policy "own profile" on public.profiles
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "read releases" on public.releases
  for select to authenticated using (true);
create policy "cache releases" on public.releases
  for insert to authenticated with check (true);
-- Lets any signed-in user overwrite shared metadata. Handoff 02, item 10, removes it.
create policy "refresh releases" on public.releases
  for update to authenticated using (true) with check (true);

create policy "own rows" on public.entries
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.queue
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.likes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.favorites
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.lists
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own list items" on public.list_items
  using (exists (select 1 from public.lists l where l.id = list_items.list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_items.list_id and l.user_id = auth.uid()));

-- --------------------------------------------------------------------- grants --
-- Copied exactly from production, including the over-broad parts: TRUNCATE (which
-- RLS does not govern) for anon and authenticated, and ALL for authenticated on the
-- per-user tables. Handoff 02 tightens these in a new migration.
grant usage on schema public to postgres, anon, authenticated, service_role;

grant references, trigger, truncate, maintain on table
  public.entries, public.favorites, public.likes, public.list_items, public.lists,
  public.profiles, public.queue, public.releases
  to anon;

grant all on table
  public.entries, public.favorites, public.likes, public.list_items, public.lists, public.queue
  to authenticated;
grant select, insert, update, references, trigger, truncate, maintain on table
  public.profiles, public.releases
  to authenticated;

grant all on table
  public.entries, public.favorites, public.likes, public.list_items, public.lists,
  public.profiles, public.queue, public.releases
  to service_role;

-- -------------------------------------------------------- profile on signup --
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
