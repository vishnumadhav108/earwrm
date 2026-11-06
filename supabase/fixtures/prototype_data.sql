-- Synthetic data shaped like today's production (the prototype). No real user data.
-- Loaded by scripts/db/verify-migrations.mjs on top of the legacy schema, so pending
-- migrations are proven to apply to a database that already has rows, not just an
-- empty one. Keep it small but cover every table and the awkward cases (half-star
-- ratings, empty reviews, list items, gaps in positions).
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('f0000000-0000-4000-8000-000000000001', 'proto-one@earwrm.test', 'authenticated', 'authenticated', '{"username": "protoone"}'),
  ('f0000000-0000-4000-8000-000000000002', 'proto-two@earwrm.test', 'authenticated', 'authenticated', '{}');
-- The signup trigger creates both profiles. Give one non-default settings.
update public.profiles set settings = '{"privateDiary": false, "halfStars": true, "recap": true, "autoQueue": false}'
where id = 'f0000000-0000-4000-8000-000000000001';

insert into public.releases (id, title, artist, year, type, initials, c1, c2) values
  ('6e335887-60ba-38f0-95af-fae7774336bf', 'In Rainbows', 'Radiohead', 2007, 'Album', 'IR', '#1f1e1a', '#2a2823'),
  ('8588c5a5-b491-37a4-8d51-2227346a072e', 'Aja', 'Steely Dan', 1977, 'Album', 'AJ', '#1f1a1e', '#2a2329'),
  ('416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 'Rumours', 'Fleetwood Mac', 1977, 'Album', 'RU', '#1f1a1c', '#2a2325'),
  ('fixture-single-0001', 'A Single', 'Someone', null, 'Single', 'AS', '#1a1a1d', '#2d2726'),
  ('fixture-ep-00000001', 'An EP', 'Someone Else', 2024, 'EP', 'AE', '#1a1a1d', '#2d2726');

insert into public.entries (user_id, release_id, rating, review, logged_on) values
  ('f0000000-0000-4000-8000-000000000001', '6e335887-60ba-38f0-95af-fae7774336bf', 4.5, 'Half-star rating with a review.', '2026-09-01'),
  ('f0000000-0000-4000-8000-000000000001', '8588c5a5-b491-37a4-8d51-2227346a072e', 0, '', '2026-09-02'),
  ('f0000000-0000-4000-8000-000000000001', 'fixture-single-0001', 5, '', '2026-09-03'),
  ('f0000000-0000-4000-8000-000000000002', '6e335887-60ba-38f0-95af-fae7774336bf', 3, 'Second user.', '2026-10-01');

insert into public.queue (user_id, release_id, position) values
  ('f0000000-0000-4000-8000-000000000001', '416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 0),
  ('f0000000-0000-4000-8000-000000000001', 'fixture-ep-00000001', 3);

insert into public.likes (user_id, release_id) values
  ('f0000000-0000-4000-8000-000000000001', '6e335887-60ba-38f0-95af-fae7774336bf'),
  ('f0000000-0000-4000-8000-000000000002', '6e335887-60ba-38f0-95af-fae7774336bf');

insert into public.favorites (user_id, release_id, position) values
  ('f0000000-0000-4000-8000-000000000001', '6e335887-60ba-38f0-95af-fae7774336bf', 0),
  ('f0000000-0000-4000-8000-000000000001', '8588c5a5-b491-37a4-8d51-2227346a072e', 2);

insert into public.lists (id, user_id, name, description, position) values
  ('f0000000-0000-4000-8000-0000000000a1', 'f0000000-0000-4000-8000-000000000001', 'Late drives', '', 0),
  ('f0000000-0000-4000-8000-0000000000a2', 'f0000000-0000-4000-8000-000000000001', 'Empty list', 'No items yet', 1);
insert into public.list_items (list_id, release_id, position) values
  ('f0000000-0000-4000-8000-0000000000a1', '416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 0),
  ('f0000000-0000-4000-8000-0000000000a1', 'fixture-ep-00000001', 4);
