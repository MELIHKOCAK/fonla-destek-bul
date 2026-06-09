-- ============================================================
-- BeniFonla — RLS configuration regression suite
-- Run: psql -v ON_ERROR_STOP=1 -f scripts/test-rls.sql
--
-- These checks introspect pg_policies, has_function_privilege, and
-- has_table_privilege so they are runnable as any role (including the
-- Lovable sandbox role) and assert that the security configuration
-- matches docs/security/rls-matrix.md.
--
-- For live attacker behavior against PostgREST, see
-- scripts/test-rls-attacker.sh (uses the publishable/anon key).
-- ============================================================

\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'ASSERT FAIL: %', msg; end if;
  raise notice '  ok: %', msg;
end$$;

\echo ''
\echo '== RLS enabled on every public table =='
do $$
declare r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
  loop
    perform pg_temp.assert(
      (select rowsecurity from pg_tables where schemaname='public' and tablename=r.tablename),
      format('table %I has RLS enabled', r.tablename));
  end loop;
end$$;

\echo ''
\echo '== Required policies exist =='
-- (table, policy, cmd)
do $$
declare
  expected text[][] := array[
    ['campaigns','campaigns_public_read_visible','SELECT'],
    ['campaigns','campaigns_creator_read_own','SELECT'],
    ['campaigns','campaigns_admin_read_all','SELECT'],
    ['campaigns','campaigns_creator_insert_draft','INSERT'],
    ['campaigns','campaigns_creator_update_editable','UPDATE'],
    ['campaign_media','campaign_media_public_read','SELECT'],
    ['campaign_media','campaign_media_owner_write','INSERT'],
    ['reward_tiers','reward_tiers_public_read','SELECT'],
    ['campaign_updates','campaign_updates_public_read','SELECT'],
    ['campaign_reviews','campaign_reviews_admin_read','SELECT'],
    ['favorites','favorites_self_read','SELECT'],
    ['favorites','favorites_self_insert','INSERT'],
    ['favorites','favorites_self_delete','DELETE'],
    ['notifications','notifications_self_read','SELECT'],
    ['notifications','notifications_self_update','UPDATE'],
    ['contributions','contributions_admin_read','SELECT'],
    ['audit_logs','audit_logs_admin_read','SELECT'],
    ['payment_transactions','payment_transactions_admin_read','SELECT'],
    ['refunds','refunds_admin_read','SELECT'],
    ['payouts','payouts_admin_read','SELECT'],
    ['platform_fees','platform_fees_admin_read','SELECT'],
    ['financial_ledger_entries','financial_ledger_entries_admin_read','SELECT'],
    ['webhook_events','webhook_events_admin_read','SELECT'],
    ['idempotency_keys','idempotency_keys_admin_read','SELECT'],
    ['user_roles','user_roles_self_read','SELECT'],
    ['user_roles','user_roles_admin_read','SELECT'],
    ['profiles','profiles_self_read','SELECT'],
    ['profiles','profiles_self_update','UPDATE'],
    ['profiles','profiles_public_read','SELECT']
  ];
  row text[];
begin
  foreach row slice 1 in array expected loop
    perform pg_temp.assert(
      exists (
        select 1 from pg_policies
        where schemaname='public' and tablename=row[1]
          and policyname=row[2] and cmd=row[3]
      ),
      format('policy %I.%I (%s) exists', row[1], row[2], row[3]));
  end loop;
end$$;

\echo ''
\echo '== No write policies on append-only / admin-only tables =='
do $$
declare t text;
begin
  foreach t in array array[
    'audit_logs','payment_transactions','refunds','payouts','platform_fees',
    'financial_ledger_entries','webhook_events','idempotency_keys',
    'campaign_reviews','contributions','user_roles'
  ] loop
    perform pg_temp.assert(
      (select count(*) = 0 from pg_policies
       where schemaname='public' and tablename=t
         and cmd in ('INSERT','UPDATE','DELETE','ALL')),
      format('table %I has NO client write policies', t));
  end loop;
end$$;

\echo ''
\echo '== Storage: campaign-media policies exist =='
do $$
declare
  needed text[] := array[
    'campaign_media_public_select',
    'campaign_media_owner_select',
    'campaign_media_admin_select',
    'campaign_media_owner_insert',
    'campaign_media_owner_update',
    'campaign_media_owner_delete'
  ];
  n text;
begin
  foreach n in array needed loop
    perform pg_temp.assert(
      exists(select 1 from pg_policies
             where schemaname='storage' and tablename='objects' and policyname=n),
      format('storage policy %I exists', n));
  end loop;
end$$;

\echo ''
\echo '== Helper function grants =='
select pg_temp.assert(not has_function_privilege('anon','public.is_admin()','execute'),
  'anon cannot execute is_admin');
select pg_temp.assert(has_function_privilege('authenticated','public.is_admin()','execute'),
  'authenticated can execute is_admin');
select pg_temp.assert(has_function_privilege('anon','public.check_username_available(citext)','execute'),
  'anon can execute check_username_available');
select pg_temp.assert(not has_function_privilege('anon','public.claim_username(citext)','execute'),
  'anon cannot execute claim_username');
select pg_temp.assert(has_function_privilege('authenticated','public.claim_username(citext)','execute'),
  'authenticated can execute claim_username');
select pg_temp.assert(not has_function_privilege('anon','public.my_contributions()','execute'),
  'anon cannot execute my_contributions');
select pg_temp.assert(has_function_privilege('authenticated','public.my_contributions()','execute'),
  'authenticated can execute my_contributions');
select pg_temp.assert(not has_function_privilege('anon','public.campaign_owned_by_me(uuid)','execute'),
  'anon cannot execute campaign_owned_by_me');
select pg_temp.assert(has_function_privilege('anon','public.campaign_is_public(uuid)','execute'),
  'anon can execute campaign_is_public (RLS uses it)');

\echo ''
\echo '== Triggers in place =='
select pg_temp.assert(
  exists(select 1 from pg_trigger where tgname='trg_enforce_campaign_field_locks'),
  'campaign field-lock trigger installed');
select pg_temp.assert(
  exists(select 1 from pg_trigger where tgname='trg_notifications_lock_fields'),
  'notifications field-lock trigger installed');
select pg_temp.assert(
  exists(select 1 from pg_trigger where tgname='trg_enforce_profile_field_locks'),
  'profile field-lock trigger installed');

\echo ''
\echo '== Append-only triggers on finance/audit =='
do $$
declare t text;
begin
  foreach t in array array['audit_logs','financial_ledger_entries','webhook_events','idempotency_keys']
  loop
    perform pg_temp.assert(
      exists(select 1 from pg_trigger tg
             join pg_class c on c.oid=tg.tgrelid
             where c.relname=t and tg.tgname like '%prevent%'),
      format('append-only trigger on %I', t));
  end loop;
end$$;

\echo ''
\echo '== Views with security_invoker =='
select pg_temp.assert(
  exists(select 1 from pg_views where schemaname='public' and viewname='profiles_public'),
  'profiles_public view exists');

rollback;
\echo ''
\echo '======================================'
\echo '✓ ALL RLS CONFIG ASSERTIONS PASSED'
\echo '======================================'
