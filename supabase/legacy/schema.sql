-- earwrm schema. Run once against a fresh Supabase project (SQL editor).
-- Every user-owned table is protected by RLS keyed on auth.uid().

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique,
  display_name text,
  settings     jsonb not null default
    '{"privateDiary":true,"halfStars":true,"recap":false,"autoQueue":true}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Shared cache of MusicBrainz release-groups. Without this the diary would
-- need one MusicBrainz lookup per row, and MusicBrainz allows ~1 req/sec.
-- Not user-scoped: the metadata is public and identical for everyone.
create table if not exists public.releases (
  id         text primary key,            -- MusicBrainz release-group MBID
  title      text not null,
  artist     text not null,
  year       int,
  type       text not null check (type in ('Album','Single','EP','Mixtape','Compilation')),
  initials   text not null,
  c1         text not null,
  c2         text not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ diary --
create table if not exists public.entries (
  user_id    uuid not null references auth.users on delete cascade,
  release_id text not null references public.releases(id),
  rating     numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review     text not null default '',
  logged_on  date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, release_id)
);
create index if not exists entries_user_date_idx on public.entries (user_id, logged_on desc);

create table if not exists public.queue (
  user_id    uuid not null references auth.users on delete cascade,
  release_id text not null references public.releases(id),
  position   int  not null default 0,
  primary key (user_id, release_id)
);

create table if not exists public.likes (
  user_id    uuid not null references auth.users on delete cascade,
  release_id text not null references public.releases(id),
  primary key (user_id, release_id)
);

create table if not exists public.favorites (
  user_id    uuid not null references auth.users on delete cascade,
  release_id text not null references public.releases(id),
  position   int  not null default 0,
  primary key (user_id, release_id)
);

-- ------------------------------------------------------------------ lists --
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text not null default '',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.list_items (
  list_id    uuid not null references public.lists(id) on delete cascade,
  release_id text not null references public.releases(id),
  position   int  not null default 0,
  primary key (list_id, release_id)
);

-- -------------------------------------------------------------------- RLS --
alter table public.profiles   enable row level security;
alter table public.releases   enable row level security;
alter table public.entries    enable row level security;
alter table public.queue      enable row level security;
alter table public.likes      enable row level security;
alter table public.favorites  enable row level security;
alter table public.lists      enable row level security;
alter table public.list_items enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Release metadata is public reference data; any signed-in user may read it
-- and add to the cache, but nobody may delete another user's cached rows.
drop policy if exists "read releases" on public.releases;
create policy "read releases" on public.releases
  for select to authenticated using (true);
drop policy if exists "cache releases" on public.releases;
create policy "cache releases" on public.releases
  for insert to authenticated with check (true);
drop policy if exists "refresh releases" on public.releases;
create policy "refresh releases" on public.releases
  for update to authenticated using (true) with check (true);

do $$
declare t text;
begin
  foreach t in array array['entries','queue','likes','favorites','lists'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

drop policy if exists "own list items" on public.list_items;
create policy "own list items" on public.list_items
  for all
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- ----------------------------------------------------------------- GRANTS --
-- RLS decides which *rows* a role may touch; it does not grant access to the
-- table in the first place. A policy cannot grant what was never granted, so
-- without these every write fails with "permission denied for table X".
-- UPDATE is required even on tables the app appears to only insert into,
-- because supabase-js .upsert() emits INSERT ... ON CONFLICT DO UPDATE.
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.entries    to authenticated;
grant select, insert, update, delete on public.queue      to authenticated;
grant select, insert, update, delete on public.likes      to authenticated;
grant select, insert, update, delete on public.favorites  to authenticated;
grant select, insert, update, delete on public.lists      to authenticated;
grant select, insert, update, delete on public.list_items to authenticated;

-- Shared reference data: no DELETE, so one account cannot evict the release
-- metadata other accounts depend on.
grant select, insert, update on public.releases to authenticated;

-- Created by the signup trigger, updated when settings change. No DELETE:
-- profile removal happens by cascade from auth.users.
grant select, insert, update on public.profiles to authenticated;
-- service_role normally receives these through Supabase's default privileges
-- too. On this project it did not, so grant them explicitly: without it the
-- SQL editor, dashboard table view, and any server-side admin work hit the
-- same wall. anon is deliberately left out — earwrm requires a signed-in user,
-- so unauthenticated clients have no reason to reach these tables at all.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on schema public to service_role;


-- ------------------------------------------------- profile on signup hook --
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
