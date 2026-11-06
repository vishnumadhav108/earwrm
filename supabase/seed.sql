-- Local development seed. Applied only by `supabase db reset` / `supabase start` on the
-- local stack. Never run it against a hosted project: the staging workflow never passes
-- --include-seed, and scripts/db/target.mjs refuses --include-seed for hosted targets.
--
-- It creates one confirmed test user with a few diary rows, so a reset local database
-- gives a working app. These credentials are for the local stack only:
--   email:    local-tester@earwrm.test
--   password: local-only-password
-- Sign in with them at http://localhost:3000/login after `npm run env:local`.

-- ------------------------------------------------------------- test user --
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'local-tester@earwrm.test',
  extensions.crypt('local-only-password', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "localtester", "display_name": "Local Tester"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-4000-8000-0000000000aa',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'sub', 'a0000000-0000-4000-8000-000000000001',
    'email', 'local-tester@earwrm.test',
    'email_verified', true
  ),
  'email', now(), now(), now()
);
-- The on_auth_user_created trigger has created the matching public.profiles row.

-- ---------------------------------------------------------- diary rows --
-- Real MusicBrainz release-group ids (the same ones demo mode uses), so covers load.
-- initials/c1/c2 are what initialsOf() and sleeveColors() in src/lib/cover.ts return
-- for these ids, so seeded rows look like rows the app writes itself.
insert into public.releases (id, title, artist, year, type, initials, c1, c2) values
  ('6e335887-60ba-38f0-95af-fae7774336bf', 'In Rainbows', 'Radiohead', 2007, 'Album', 'IR', '#1f1e1a', '#2a2823'),
  ('8588c5a5-b491-37a4-8d51-2227346a072e', 'Aja', 'Steely Dan', 1977, 'Album', 'AJ', '#1f1a1e', '#2a2329'),
  ('416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 'Rumours', 'Fleetwood Mac', 1977, 'Album', 'RU', '#1f1a1c', '#2a2325');

insert into public.entries (user_id, release_id, rating, review, logged_on) values
  ('a0000000-0000-4000-8000-000000000001', '6e335887-60ba-38f0-95af-fae7774336bf', 4.5, 'Local seed review.', current_date - 1),
  ('a0000000-0000-4000-8000-000000000001', '8588c5a5-b491-37a4-8d51-2227346a072e', 5, '', current_date - 3);

insert into public.queue (user_id, release_id, position) values
  ('a0000000-0000-4000-8000-000000000001', '416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 0);

insert into public.lists (id, user_id, name, description, position) values
  ('a0000000-0000-4000-8000-0000000000b1', 'a0000000-0000-4000-8000-000000000001', 'Seed list', 'Created by supabase/seed.sql', 0);
insert into public.list_items (list_id, release_id, position) values
  ('a0000000-0000-4000-8000-0000000000b1', '416bb5e5-c7d1-3977-8fd7-7c9daf6c2be6', 0);
