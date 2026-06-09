-- ============================================================
-- BeniFonla RLS attacker-scenario tests
-- Run: psql -v ON_ERROR_STOP=1 -f scripts/test-rls.sql
--
-- We cannot insert into auth.users from a standard role, so these
-- tests focus on the *rejection paths* (which is exactly what attackers
-- exercise) using PostgREST's standard role-impersonation pattern.
-- ============================================================

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'ASSERT FAIL: %', msg; end if;
  raise notice '  ok: %', msg;
end$$;

\set anon_jwt   '''{"role":"anon"}'''
\set a_jwt      '''{"role":"authenticated","sub":"11111111-1111-1111-1111-111111111111"}'''
\set b_jwt      '''{"role":"authenticated","sub":"22222222-2222-2222-2222-222222222222"}'''

\echo ''
\echo '======================================'
\echo '  ATTACKER SCENARIOS (rejection paths)'
\echo '======================================'

\echo ''
\echo '-- POLICY PRESENCE CHECKS --'
select pg_temp.assert(
  (select count(*) >= 5 from pg_policies where schemaname='public' and tablename='campaigns'),
  'campaigns has >= 5 policies');
select pg_temp.assert(
  (select count(*) >= 3 from pg_policies where schemaname='public' and tablename='campaign_media'),
  'campaign_media has >= 3 policies');
select pg_temp.assert(
  exists(select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='audit_logs_admin_read'),
  'audit_logs admin-read policy exists');
select pg_temp.assert(
  exists(select 1 from pg_policies where schemaname='public' and tablename='notifications' and cmd='UPDATE'),
  'notifications self-update policy exists');
select pg_temp.assert(
  exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='campaign_media_owner_insert'),
  'storage campaign_media_owner_insert policy exists');

\echo ''
\echo '-- HELPER FUNCTION GRANTS --'
select pg_temp.assert(
  not has_function_privilege('anon', 'public.is_admin()', 'execute'),
  'anon CANNOT execute is_admin()');
select pg_temp.assert(
  has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  'authenticated CAN execute is_admin()');
select pg_temp.assert(
  has_function_privilege('anon', 'public.check_username_available(citext)', 'execute'),
  'anon CAN execute check_username_available()');
select pg_temp.assert(
  not has_function_privilege('anon', 'public.claim_username(citext)', 'execute'),
  'anon CANNOT execute claim_username()');
select pg_temp.assert(
  not has_function_privilege('anon', 'public.my_contributions()', 'execute'),
  'anon CANNOT execute my_contributions()');
select pg_temp.assert(
  has_function_privilege('authenticated', 'public.my_contributions()', 'execute'),
  'authenticated CAN execute my_contributions()');

\echo ''
\echo '-- ANON: cannot read sensitive tables --'
reset role; set local role anon;
select set_config('request.jwt.claims', :anon_jwt, true);

select pg_temp.assert((select count(*) = 0 from public.audit_logs),
  'RLS-AUDIT-01: anon sees 0 audit_logs');
select pg_temp.assert((select count(*) = 0 from public.payment_transactions),
  'RLS-FIN-01a: anon sees 0 payment_transactions');
select pg_temp.assert((select count(*) = 0 from public.refunds),
  'RLS-FIN-01b: anon sees 0 refunds');
select pg_temp.assert((select count(*) = 0 from public.payouts),
  'RLS-FIN-01c: anon sees 0 payouts');
select pg_temp.assert((select count(*) = 0 from public.financial_ledger_entries),
  'RLS-FIN-01d: anon sees 0 ledger entries');
select pg_temp.assert((select count(*) = 0 from public.webhook_events),
  'RLS-FIN-01e: anon sees 0 webhook_events');
select pg_temp.assert((select count(*) = 0 from public.notifications),
  'RLS-NOTIF-01: anon sees 0 notifications');
select pg_temp.assert((select count(*) = 0 from public.contributions),
  'RLS-CONTRIB-01: anon sees 0 raw contributions');
select pg_temp.assert((select count(*) = 0 from public.user_roles),
  'RLS-ROLE-01a: anon sees 0 user_roles');
select pg_temp.assert((select count(*) = 0 from public.campaign_reviews),
  'RLS-REVIEW-01: anon sees 0 campaign_reviews (internal notes hidden)');

\echo ''
\echo '-- ANON: write attempts must be rejected --'
do $$ begin
  begin
    insert into public.user_roles(user_id, role) values
      ('11111111-1111-1111-1111-111111111111','admin');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-ROLE-01b anon cannot self-grant admin'; end;
end$$;

do $$ begin
  begin
    insert into public.notifications(user_id, type, title, body) values
      ('11111111-1111-1111-1111-111111111111','spam','x','x');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-NOTIF-02 anon cannot insert notification'; end;
end$$;

do $$ begin
  begin
    insert into public.payment_transactions(contribution_id, provider, amount_minor, currency, status, environment)
    values (gen_random_uuid(),'fake',100,'TRY','pending','sandbox');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-FIN-02 anon cannot insert payment_transaction'; end;
end$$;

do $$ begin
  begin
    insert into public.financial_ledger_entries(entry_type, amount_minor, currency, environment)
    values ('charge', 100, 'TRY', 'sandbox');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-FIN-03 anon cannot insert ledger entry'; end;
end$$;

do $$ begin
  begin
    insert into public.audit_logs(action, entity_type, entity_id) values
      ('hack','campaign', gen_random_uuid());
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-AUDIT-02 anon cannot insert audit_log'; end;
end$$;

\echo ''
\echo '-- AUTHENTICATED user_a: same attempts must be rejected --'
reset role; set local role authenticated;
select set_config('request.jwt.claims', :a_jwt, true);

do $$ begin
  begin
    insert into public.user_roles(user_id, role) values
      ('11111111-1111-1111-1111-111111111111','admin');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-ROLE-01c authenticated cannot self-grant admin'; end;
end$$;

do $$ begin
  begin
    insert into public.notifications(user_id, type, title, body) values
      ('11111111-1111-1111-1111-111111111111','spam','x','x');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: authenticated cannot insert own notification'; end;
end$$;

do $$ begin
  begin
    insert into public.payment_transactions(contribution_id, provider, amount_minor, currency, status, environment)
    values (gen_random_uuid(),'fake',100,'TRY','pending','sandbox');
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: authenticated cannot insert payment_transaction'; end;
end$$;

select pg_temp.assert((select count(*) = 0 from public.audit_logs),
  'authenticated sees 0 audit_logs');
select pg_temp.assert((select count(*) = 0 from public.payment_transactions),
  'authenticated sees 0 payment_transactions');
select pg_temp.assert((select count(*) = 0 from public.contributions),
  'authenticated sees 0 raw contributions');

-- my_contributions() returns only own
select pg_temp.assert((select count(*) = 0 from public.my_contributions()),
  'authenticated my_contributions() scoped to self (empty when no rows)');

\echo ''
\echo '-- STORAGE: anon path-spoofing rejected --'
reset role; set local role anon;
select set_config('request.jwt.claims', :anon_jwt, true);
do $$ begin
  begin
    insert into storage.objects(bucket_id, name, owner) values
      ('campaign-media', '11111111-1111-1111-1111-111111111111/evil.jpg', null);
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-STORAGE-01 anon cannot upload to campaign-media'; end;
end$$;

reset role; set local role authenticated;
select set_config('request.jwt.claims', :a_jwt, true);
do $$ begin
  begin
    -- user_a tries to upload to a random campaign she doesn't own
    insert into storage.objects(bucket_id, name, owner) values
      ('campaign-media', gen_random_uuid()::text || '/evil.jpg', null);
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-STORAGE-02 authenticated cannot upload to foreign campaign path'; end;
end$$;

do $$ begin
  begin
    insert into storage.objects(bucket_id, name, owner) values
      ('avatars', '99999999-9999-9999-9999-999999999999/spoof.png', null);
    raise exception 'EXPECTED FAILURE';
  exception when sqlstate '42501' then raise notice '  ok: RLS-STORAGE-03 authenticated cannot upload to foreign avatar path'; end;
end$$;

rollback;
\echo ''
\echo '✓ ALL RLS ATTACKER TESTS PASSED'
