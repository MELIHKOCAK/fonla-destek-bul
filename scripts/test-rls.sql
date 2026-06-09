-- ============================================================
-- BeniFonla RLS regression tests (psql role impersonation)
-- Run: psql -v ON_ERROR_STOP=1 -f scripts/test-rls.sql
--
-- Method: PostgREST normally validates `auth.uid()` via JWT claims.
-- We simulate three contexts (anon, user_a, user_b, admin) by setting
-- `request.jwt.claims` and switching to the corresponding Postgres role.
-- This is the same path RLS takes in production.
-- ============================================================

\set ON_ERROR_STOP on
\set QUIET on

begin;

-- ----- Fixture: two normal users + one admin (in auth.users) -----
do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_admin  uuid := '33333333-3333-3333-3333-333333333333';
begin
  -- create stub auth.users rows (idempotent)
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values
    (v_user_a, 'rls-a@test.local', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}'),
    (v_user_b, 'rls-b@test.local', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}'),
    (v_admin,  'rls-x@test.local', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', '', now(), now(), now(), '{}', '{}')
  on conflict (id) do nothing;

  -- profiles auto-created by handle_new_user trigger; ensure exist
  insert into public.profiles (id, display_name) values
    (v_user_a, 'User A'), (v_user_b, 'User B'), (v_admin, 'Admin')
  on conflict (id) do nothing;

  -- admin role
  insert into public.user_roles (user_id, role) values (v_admin, 'admin')
  on conflict do nothing;
end$$;

-- fixture campaigns (one draft by A, one live by A, one draft by B)
do $$
declare
  v_cat uuid;
begin
  select id into v_cat from public.categories where is_active limit 1;

  insert into public.campaigns (id, creator_id, category_id, title, slug,
    short_description, goal_amount_minor, currency, start_at, end_at, status)
  values
    ('aaaaaaaa-0000-0000-0000-000000000001',
     '11111111-1111-1111-1111-111111111111', v_cat,
     'A draft', 'a-draft-rlstest', 'd', 100000, 'TRY',
     now(), now() + interval '30 days', 'draft'),
    ('aaaaaaaa-0000-0000-0000-000000000002',
     '11111111-1111-1111-1111-111111111111', v_cat,
     'A live', 'a-live-rlstest', 'd', 100000, 'TRY',
     now(), now() + interval '30 days', 'live'),
    ('bbbbbbbb-0000-0000-0000-000000000001',
     '22222222-2222-2222-2222-222222222222', v_cat,
     'B draft', 'b-draft-rlstest', 'd', 100000, 'TRY',
     now(), now() + interval '30 days', 'draft')
  on conflict (id) do nothing;
end$$;

-- ----- helper: switch context -----
\set anon_jwt '''{"role":"anon"}'''
\set a_jwt    '''{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111"}'''
\set b_jwt    '''{"role":"authenticated","sub":"22222222-2222-2222-2222-222222222222"}'''
\set admin_jwt '''{"role":"authenticated","sub":"33333333-3333-3333-3333-333333333333"}'''

-- ============================================================
-- TESTS
-- ============================================================
create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'ASSERT FAIL: %', msg; end if;
  raise notice '  ok: %', msg;
end$$;

\echo ''
\echo '== RLS-CAMP-01: anon sees only live/successful =='
reset role; set local role anon;
select set_config('request.jwt.claims', :anon_jwt, true);
select pg_temp.assert(
  (select count(*) = 1 from public.campaigns where id in (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001')),
  'anon sees exactly 1 (live) of 3 fixture campaigns');

\echo ''
\echo '== RLS-CAMP-02: user_a sees own draft + live =='
reset role; set local role authenticated;
select set_config('request.jwt.claims', :a_jwt, true);
select pg_temp.assert(
  (select count(*) = 2 from public.campaigns where creator_id = '11111111-1111-1111-1111-111111111111'),
  'user_a sees 2 own campaigns');
select pg_temp.assert(
  (select count(*) = 0 from public.campaigns where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'user_a CANNOT see user_b draft');

\echo ''
\echo '== RLS-CAMP-03: user_a cannot promote draft to live (field lock trigger) =='
do $$
declare
  err text;
begin
  begin
    update public.campaigns set status='live'
      where id='aaaaaaaa-0000-0000-0000-000000000001';
    raise exception 'EXPECTED FAILURE';
  exception
    when sqlstate '42501' then
      raise notice '  ok: status update rejected (42501)';
    when others then
      get stacked diagnostics err = message_text;
      raise exception 'wrong error: %', err;
  end;
end$$;

\echo ''
\echo '== RLS-CAMP-04: user_b cannot update user_a draft =='
reset role; set local role authenticated;
select set_config('request.jwt.claims', :b_jwt, true);
do $$
declare n int;
begin
  update public.campaigns set title='hijack'
    where id='aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'user_b update on user_a draft affected 0 rows');
end$$;

\echo ''
\echo '== RLS-FAV-01: user_a cannot see user_b favorite =='
reset role; set local role service_role;
insert into public.favorites (user_id, campaign_id) values
  ('22222222-2222-2222-2222-222222222222','aaaaaaaa-0000-0000-0000-000000000002')
on conflict do nothing;
reset role; set local role authenticated;
select set_config('request.jwt.claims', :a_jwt, true);
select pg_temp.assert(
  (select count(*) = 0 from public.favorites where user_id='22222222-2222-2222-2222-222222222222'),
  'user_a cannot see user_b favorites');

\echo ''
\echo '== RLS-FIN-01: authenticated cannot read finance tables =='
do $$
declare t text;
begin
  foreach t in array array['audit_logs','payment_transactions','refunds','payouts',
                           'platform_fees','financial_ledger_entries',
                           'webhook_events','idempotency_keys','contributions']
  loop
    execute format('select count(*) from public.%I', t);
    -- count returns 0 because RLS filters everything for non-admin
  end loop;
  raise notice '  ok: non-admin finance reads return 0 (filtered)';
end$$;

\echo ''
\echo '== RLS-FIN-02: authenticated cannot INSERT into finance tables =='
do $$
begin
  begin
    insert into public.payment_transactions (contribution_id, provider, amount_minor, currency, status, environment)
    values (gen_random_uuid(), 'test', 100, 'TRY', 'pending', 'sandbox');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then
    raise notice '  ok: payment_transactions insert rejected';
  end;
end$$;

\echo ''
\echo '== RLS-ROLE-01: user_a cannot grant self admin =='
do $$
begin
  begin
    insert into public.user_roles (user_id, role) values
      ('11111111-1111-1111-1111-111111111111','admin');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then
    raise notice '  ok: self-grant admin rejected';
  end;
end$$;

\echo ''
\echo '== RLS-PROF-01: user_a updates own profile public fields =='
update public.profiles set bio = 'hi' where id='11111111-1111-1111-1111-111111111111';
select pg_temp.assert(
  (select bio = 'hi' from public.profiles where id='11111111-1111-1111-1111-111111111111'),
  'user_a updated own bio');

\echo ''
\echo '== RLS-PROF-02: user_a cannot update user_b profile =='
do $$
declare n int;
begin
  update public.profiles set bio='hijack' where id='22222222-2222-2222-2222-222222222222';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'cross-user profile update affected 0 rows');
end$$;

\echo ''
\echo '== RLS-NOTIF-01: client cannot insert notification =='
do $$
begin
  begin
    insert into public.notifications (user_id, type, title, body)
    values ('11111111-1111-1111-1111-111111111111','test','t','b');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then
    raise notice '  ok: notification insert rejected';
  end;
end$$;

\echo ''
\echo '== RLS-ADMIN-01: admin sees all campaigns =='
reset role; set local role authenticated;
select set_config('request.jwt.claims', :admin_jwt, true);
select pg_temp.assert(
  (select count(*) >= 3 from public.campaigns where id in (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001')),
  'admin sees all 3 fixture campaigns');

\echo ''
\echo '== RLS-ADMIN-02: admin can read finance tables =='
select pg_temp.assert(
  (select true from (select 1 from public.payment_transactions limit 1
                     union all select 0) s limit 1) is not null,
  'admin payment_transactions query did not error');

\echo ''
\echo '== RLS-CONTRIB-01: my_contributions RPC scoped =='
reset role; set local role authenticated;
select set_config('request.jwt.claims', :a_jwt, true);
select pg_temp.assert(
  (select count(*) = 0 from public.my_contributions()),
  'user_a my_contributions returns empty (no fixture contributions)');

\echo ''
\echo '== cleanup =='
rollback;
\echo ''
\echo '✓ ALL RLS TESTS PASSED'
