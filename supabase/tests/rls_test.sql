-- RLS: what one signed-in user can and can't do to their own and another user's rows,
-- and what anon can reach. Generated once from a template (six per-user tables, the
-- same ten checks each); edit by hand from here on.
--
-- This covers the cases listed below. It does NOT claim every current policy is correct:
-- the shared releases UPDATE policy ("refresh releases") is a known bug, handoff 02
-- item 10, and is deliberately not asserted here.
begin;
select plan(78);

-- ------------------------------------------------------------------ setup (postgres) --
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'rls-a@earwrm.test', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'rls-b@earwrm.test', 'authenticated', 'authenticated');
-- on_auth_user_created has created both profiles.
insert into public.releases (id, title, artist, type, initials, c1, c2) values
  ('rel-1', 'Release One', 'Artist', 'Album', 'RO', '#111111', '#222222'),
  ('rel-2', 'Release Two', 'Artist', 'Album', 'RT', '#111111', '#222222');
-- B owns one row in every per-user table.
insert into public.entries (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-1');
insert into public.queue (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-1');
insert into public.likes (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-1');
insert into public.favorites (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-1');
insert into public.lists (id, user_id, name) values ('bbbbbbbb-0000-4000-8000-00000000000b', '22222222-2222-4222-8222-222222222222', 'B list');
insert into public.list_items (list_id, release_id) values ('bbbbbbbb-0000-4000-8000-00000000000b', 'rel-1');
-- A owns a list to put items in.
insert into public.lists (id, user_id, name) values ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'A list');

-- --------------------------------------------------------------- as user A --
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

-- entries
select lives_ok($$ insert into public.entries (user_id, release_id, rating, review) values ('11111111-1111-4111-8111-111111111111', 'rel-1', 4, 'mine') $$, 'entries: A can insert own row');
select is((select count(*)::int from public.entries where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'entries: A can read own row');
select lives_ok($$ update public.entries set rating = 3 where user_id = '11111111-1111-4111-8111-111111111111' $$, 'entries: A can update own row');
select is((select rating::text from public.entries where user_id = '11111111-1111-4111-8111-111111111111'), '3.0', 'entries: the update took effect');
select is_empty($$ select 1 from public.entries where user_id = '22222222-2222-4222-8222-222222222222' $$, 'entries: A cannot read B''s rows');
select is_empty($$ update public.entries set rating = 1 where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'entries: A cannot update B''s rows');
select is_empty($$ delete from public.entries where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'entries: A cannot delete B''s rows');
select throws_ok($$ insert into public.entries (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-2') $$, '42501', null, 'entries: A cannot insert a row owned by B');
select lives_ok($$ delete from public.entries where user_id = '11111111-1111-4111-8111-111111111111' $$, 'entries: A can delete own row');
select is((select count(*)::int from public.entries where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'entries: the delete took effect');

-- queue
select lives_ok($$ insert into public.queue (user_id, release_id, position) values ('11111111-1111-4111-8111-111111111111', 'rel-1', 0) $$, 'queue: A can insert own row');
select is((select count(*)::int from public.queue where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'queue: A can read own row');
select lives_ok($$ update public.queue set position = 5 where user_id = '11111111-1111-4111-8111-111111111111' $$, 'queue: A can update own row');
select is((select position::text from public.queue where user_id = '11111111-1111-4111-8111-111111111111'), '5', 'queue: the update took effect');
select is_empty($$ select 1 from public.queue where user_id = '22222222-2222-4222-8222-222222222222' $$, 'queue: A cannot read B''s rows');
select is_empty($$ update public.queue set position = 9 where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'queue: A cannot update B''s rows');
select is_empty($$ delete from public.queue where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'queue: A cannot delete B''s rows');
select throws_ok($$ insert into public.queue (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-2') $$, '42501', null, 'queue: A cannot insert a row owned by B');
select lives_ok($$ delete from public.queue where user_id = '11111111-1111-4111-8111-111111111111' $$, 'queue: A can delete own row');
select is((select count(*)::int from public.queue where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'queue: the delete took effect');

-- likes
select lives_ok($$ insert into public.likes (user_id, release_id) values ('11111111-1111-4111-8111-111111111111', 'rel-1') $$, 'likes: A can insert own row');
select is((select count(*)::int from public.likes where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'likes: A can read own row');
select lives_ok($$ update public.likes set release_id = 'rel-2' where user_id = '11111111-1111-4111-8111-111111111111' $$, 'likes: A can update own row');
select is((select release_id from public.likes where user_id = '11111111-1111-4111-8111-111111111111'), 'rel-2', 'likes: the update took effect');
select is_empty($$ select 1 from public.likes where user_id = '22222222-2222-4222-8222-222222222222' $$, 'likes: A cannot read B''s rows');
select is_empty($$ update public.likes set release_id = 'rel-2' where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'likes: A cannot update B''s rows');
select is_empty($$ delete from public.likes where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'likes: A cannot delete B''s rows');
select throws_ok($$ insert into public.likes (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-2') $$, '42501', null, 'likes: A cannot insert a row owned by B');
select lives_ok($$ delete from public.likes where user_id = '11111111-1111-4111-8111-111111111111' $$, 'likes: A can delete own row');
select is((select count(*)::int from public.likes where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'likes: the delete took effect');

-- favorites
select lives_ok($$ insert into public.favorites (user_id, release_id, position) values ('11111111-1111-4111-8111-111111111111', 'rel-1', 0) $$, 'favorites: A can insert own row');
select is((select count(*)::int from public.favorites where user_id = '11111111-1111-4111-8111-111111111111'), 1, 'favorites: A can read own row');
select lives_ok($$ update public.favorites set position = 5 where user_id = '11111111-1111-4111-8111-111111111111' $$, 'favorites: A can update own row');
select is((select position::text from public.favorites where user_id = '11111111-1111-4111-8111-111111111111'), '5', 'favorites: the update took effect');
select is_empty($$ select 1 from public.favorites where user_id = '22222222-2222-4222-8222-222222222222' $$, 'favorites: A cannot read B''s rows');
select is_empty($$ update public.favorites set position = 9 where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'favorites: A cannot update B''s rows');
select is_empty($$ delete from public.favorites where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'favorites: A cannot delete B''s rows');
select throws_ok($$ insert into public.favorites (user_id, release_id) values ('22222222-2222-4222-8222-222222222222', 'rel-2') $$, '42501', null, 'favorites: A cannot insert a row owned by B');
select lives_ok($$ delete from public.favorites where user_id = '11111111-1111-4111-8111-111111111111' $$, 'favorites: A can delete own row');
select is((select count(*)::int from public.favorites where user_id = '11111111-1111-4111-8111-111111111111'), 0, 'favorites: the delete took effect');

-- lists
select lives_ok($$ insert into public.lists (id, user_id, name) values ('aaaaaaaa-0000-4000-8000-0000000000a2', '11111111-1111-4111-8111-111111111111', 'A second list') $$, 'lists: A can insert own row');
select is((select count(*)::int from public.lists where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), 1, 'lists: A can read own row');
select lives_ok($$ update public.lists set name = 'renamed' where id = 'aaaaaaaa-0000-4000-8000-0000000000a2' $$, 'lists: A can update own row');
select is((select name from public.lists where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), 'renamed', 'lists: the update took effect');
select is_empty($$ select 1 from public.lists where user_id = '22222222-2222-4222-8222-222222222222' $$, 'lists: A cannot read B''s rows');
select is_empty($$ update public.lists set name = 'hijacked' where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'lists: A cannot update B''s rows');
select is_empty($$ delete from public.lists where user_id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'lists: A cannot delete B''s rows');
select throws_ok($$ insert into public.lists (user_id, name) values ('22222222-2222-4222-8222-222222222222', 'planted') $$, '42501', null, 'lists: A cannot insert a row owned by B');
select lives_ok($$ delete from public.lists where id = 'aaaaaaaa-0000-4000-8000-0000000000a2' $$, 'lists: A can delete own row');
select is((select count(*)::int from public.lists where id = 'aaaaaaaa-0000-4000-8000-0000000000a2'), 0, 'lists: the delete took effect');

-- list_items
select lives_ok($$ insert into public.list_items (list_id, release_id, position) values ('aaaaaaaa-0000-4000-8000-00000000000a', 'rel-1', 0) $$, 'list_items: A can insert own row');
select is((select count(*)::int from public.list_items where list_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 1, 'list_items: A can read own row');
select lives_ok($$ update public.list_items set position = 5 where list_id = 'aaaaaaaa-0000-4000-8000-00000000000a' $$, 'list_items: A can update own row');
select is((select position::text from public.list_items where list_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), '5', 'list_items: the update took effect');
select is_empty($$ select 1 from public.list_items where list_id = 'bbbbbbbb-0000-4000-8000-00000000000b' $$, 'list_items: A cannot read B''s rows');
select is_empty($$ update public.list_items set position = 9 where list_id = 'bbbbbbbb-0000-4000-8000-00000000000b' returning 1 $$, 'list_items: A cannot update B''s rows');
select is_empty($$ delete from public.list_items where list_id = 'bbbbbbbb-0000-4000-8000-00000000000b' returning 1 $$, 'list_items: A cannot delete B''s rows');
select throws_ok($$ insert into public.list_items (list_id, release_id) values ('bbbbbbbb-0000-4000-8000-00000000000b', 'rel-2') $$, '42501', null, 'list_items: A cannot insert a row owned by B');
select lives_ok($$ delete from public.list_items where list_id = 'aaaaaaaa-0000-4000-8000-00000000000a' $$, 'list_items: A can delete own row');
select is((select count(*)::int from public.list_items where list_id = 'aaaaaaaa-0000-4000-8000-00000000000a'), 0, 'list_items: the delete took effect');

-- profiles and feature_flags
select is((select count(*)::int from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 1, 'profiles: A can read own profile');
select is_empty($$ select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222222' $$, 'profiles: A cannot read B''s profile');
select is_empty($$ update public.profiles set display_name = 'x' where id = '22222222-2222-4222-8222-222222222222' returning 1 $$, 'profiles: A cannot update B''s profile');
select lives_ok($$ select key from public.feature_flags $$, 'feature_flags: authenticated can read');
select throws_ok($$ insert into public.feature_flags (key, enabled) values ('a_flag', true) $$, '42501', null, 'feature_flags: authenticated cannot write');

-- --------------------------------------------------- B's rows survived A ---
reset role;
select set_config('request.jwt.claims', '', true);
select is(
  (select (select count(*) from public.entries where user_id = '22222222-2222-4222-8222-222222222222') + (select count(*) from public.queue where user_id = '22222222-2222-4222-8222-222222222222')
        + (select count(*) from public.likes where user_id = '22222222-2222-4222-8222-222222222222') + (select count(*) from public.favorites where user_id = '22222222-2222-4222-8222-222222222222')
        + (select count(*) from public.lists where user_id = '22222222-2222-4222-8222-222222222222') + (select count(*) from public.list_items where list_id = 'bbbbbbbb-0000-4000-8000-00000000000b'))::int,
  6, 'B still has exactly one untouched row in each table');
select is((select rating::text from public.entries where user_id = '22222222-2222-4222-8222-222222222222'), '0.0', 'B''s entry was not modified');

-- ---------------------------------------------------------------- as anon --
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select 1 from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select 1 from public.releases $$, '42501', null, 'anon cannot read releases');
select throws_ok($$ select 1 from public.entries $$, '42501', null, 'anon cannot read entries');
select throws_ok($$ select 1 from public.queue $$, '42501', null, 'anon cannot read queue');
select throws_ok($$ select 1 from public.likes $$, '42501', null, 'anon cannot read likes');
select throws_ok($$ select 1 from public.favorites $$, '42501', null, 'anon cannot read favorites');
select throws_ok($$ select 1 from public.lists $$, '42501', null, 'anon cannot read lists');
select throws_ok($$ select 1 from public.list_items $$, '42501', null, 'anon cannot read list_items');
select lives_ok($$ select key from public.feature_flags $$, 'feature_flags: anon can read');
select throws_ok($$ insert into public.feature_flags (key, enabled) values ('a_flag', true) $$, '42501', null, 'feature_flags: anon cannot write');

-- ---------------------------------------------------------- as service_role --
reset role;
set local role service_role;
select lives_ok($$ insert into public.feature_flags (key, enabled, rollout) values ('a_flag', true, 50) $$, 'feature_flags: service_role can write');

select * from finish();
rollback;
