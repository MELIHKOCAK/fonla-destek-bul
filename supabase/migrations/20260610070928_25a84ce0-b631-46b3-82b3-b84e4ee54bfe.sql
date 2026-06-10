
-- =============================================================================
-- Faz 11.5 — Stripe Hazırlığı (Sandbox-First)
-- Forward-only, no drops, no renames. New nullable columns; constraints later.
-- =============================================================================

-- 1) ENUM additions
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'action_required';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'chargeback';

ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'creator_transfer_created';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'creator_transfer_completed';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'creator_transfer_reversed';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'provider_payout_observed';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'dispute_opened';
ALTER TYPE public.ledger_entry_type ADD VALUE IF NOT EXISTS 'chargeback_recorded';

-- 2) NEW enum types
DO $$ BEGIN
  CREATE TYPE public.payment_domain_status AS ENUM (
    'created','pending','action_required','processing','paid','failed',
    'cancelled','expired','partially_refunded','refunded','disputed','chargeback'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reward_reservation_status AS ENUM ('reserved','confirmed','released','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.creator_transfer_status AS ENUM (
    'pending','in_transit','paid','failed','reversed','partially_reversed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.creator_transfer_reversal_status AS ENUM ('pending','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_payout_status AS ENUM (
    'pending','in_transit','paid','failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.creator_payment_account_status AS ENUM (
    'not_started','onboarding_pending','pending_verification',
    'enabled','restricted','payouts_disabled','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.production_approval_status AS ENUM ('not_verified','in_review','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 3) payment_provider_configs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  environment public.financial_environment NOT NULL,
  checkout_mode text NOT NULL DEFAULT 'hosted_checkout',
  capture_model text NOT NULL DEFAULT 'immediate_capture',
  failed_campaign_model text NOT NULL DEFAULT 'full_refund',
  connect_flow text NOT NULL DEFAULT 'separate_charges_and_transfers',
  currency character(3) NOT NULL DEFAULT 'TRY',
  payments_enabled boolean NOT NULL DEFAULT false,
  creator_onboarding_enabled boolean NOT NULL DEFAULT false,
  transfers_enabled boolean NOT NULL DEFAULT false,
  refunds_enabled boolean NOT NULL DEFAULT false,
  live_payments_enabled boolean NOT NULL DEFAULT false,
  production_approval_status public.production_approval_status NOT NULL DEFAULT 'not_verified',
  production_approval_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, environment)
);
GRANT SELECT ON public.payment_provider_configs TO authenticated;
GRANT ALL ON public.payment_provider_configs TO service_role;
ALTER TABLE public.payment_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppc_authenticated_read" ON public.payment_provider_configs
  FOR SELECT TO authenticated USING (true);
CREATE TRIGGER payment_provider_configs_set_updated_at
  BEFORE UPDATE ON public.payment_provider_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.payment_provider_configs
  (provider, environment, payments_enabled, creator_onboarding_enabled,
   transfers_enabled, refunds_enabled, live_payments_enabled, production_approval_status)
VALUES
  ('stripe','test', true,  true,  true,  true,  false, 'not_verified'),
  ('stripe','live', false, false, false, false, false, 'not_verified')
ON CONFLICT (provider, environment) DO NOTHING;

-- =============================================================================
-- 4) creator_payment_accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.creator_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  environment public.financial_environment NOT NULL,
  provider_account_id text,
  onboarding_status public.creator_payment_account_status NOT NULL DEFAULT 'not_started',
  details_submitted boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  capabilities_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  requirements_currently_due text[] NOT NULL DEFAULT '{}',
  requirements_eventually_due text[] NOT NULL DEFAULT '{}',
  requirements_past_due text[] NOT NULL DEFAULT '{}',
  requirements_pending_verification text[] NOT NULL DEFAULT '{}',
  disabled_reason text,
  country text,
  default_currency character(3),
  last_provider_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, provider, environment)
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_payment_accounts_provider_account_unique
  ON public.creator_payment_accounts (provider, environment, provider_account_id)
  WHERE provider_account_id IS NOT NULL;
GRANT SELECT ON public.creator_payment_accounts TO authenticated;
GRANT ALL ON public.creator_payment_accounts TO service_role;
ALTER TABLE public.creator_payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpa_owner_read" ON public.creator_payment_accounts
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "cpa_admin_read" ON public.creator_payment_accounts
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.creator_payment_accounts_lock_critical()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $f$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
    IF NEW.provider_account_id IS DISTINCT FROM OLD.provider_account_id
       OR NEW.charges_enabled IS DISTINCT FROM OLD.charges_enabled
       OR NEW.payouts_enabled IS DISTINCT FROM OLD.payouts_enabled
       OR NEW.capabilities_snapshot IS DISTINCT FROM OLD.capabilities_snapshot
       OR NEW.requirements_currently_due IS DISTINCT FROM OLD.requirements_currently_due
       OR NEW.requirements_past_due IS DISTINCT FROM OLD.requirements_past_due
       OR NEW.disabled_reason IS DISTINCT FROM OLD.disabled_reason
       OR NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status THEN
      RAISE EXCEPTION 'BFL_FIELD_LOCKED' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER creator_payment_accounts_set_updated_at
  BEFORE UPDATE ON public.creator_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER creator_payment_accounts_lock_critical_trg
  BEFORE UPDATE ON public.creator_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.creator_payment_accounts_lock_critical();

-- =============================================================================
-- 5) reward_reservations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reward_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  reward_tier_id uuid NOT NULL REFERENCES public.reward_tiers(id) ON DELETE RESTRICT,
  backer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  environment public.financial_environment NOT NULL DEFAULT 'test',
  status public.reward_reservation_status NOT NULL DEFAULT 'reserved',
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reward_reservations_active_unique
  ON public.reward_reservations (contribution_id, reward_tier_id)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS reward_reservations_expiry_idx
  ON public.reward_reservations (status, expires_at)
  WHERE status = 'reserved';
GRANT SELECT ON public.reward_reservations TO authenticated;
GRANT ALL ON public.reward_reservations TO service_role;
ALTER TABLE public.reward_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_owner_read" ON public.reward_reservations
  FOR SELECT TO authenticated USING (backer_id = auth.uid());
CREATE POLICY "rr_admin_read" ON public.reward_reservations
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER reward_reservations_set_updated_at
  BEFORE UPDATE ON public.reward_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 6) campaign_settlements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL UNIQUE REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  gross_amount_minor bigint NOT NULL DEFAULT 0 CHECK (gross_amount_minor >= 0),
  refunded_amount_minor bigint NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0),
  provider_fee_amount_minor bigint NOT NULL DEFAULT 0 CHECK (provider_fee_amount_minor >= 0),
  platform_fee_amount_minor bigint NOT NULL DEFAULT 0 CHECK (platform_fee_amount_minor >= 0),
  other_deduction_amount_minor bigint NOT NULL DEFAULT 0 CHECK (other_deduction_amount_minor >= 0),
  net_amount_minor bigint NOT NULL DEFAULT 0,
  currency character(3) NOT NULL DEFAULT 'TRY',
  environment public.financial_environment NOT NULL DEFAULT 'test',
  status text NOT NULL DEFAULT 'pending',
  computed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_settlements TO authenticated;
GRANT ALL ON public.campaign_settlements TO service_role;
ALTER TABLE public.campaign_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_owner_read" ON public.campaign_settlements
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "cs_admin_read" ON public.campaign_settlements
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER campaign_settlements_set_updated_at
  BEFORE UPDATE ON public.campaign_settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 7) creator_transfers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.creator_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  creator_payment_account_id uuid REFERENCES public.creator_payment_accounts(id) ON DELETE RESTRICT,
  settlement_id uuid REFERENCES public.campaign_settlements(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency character(3) NOT NULL DEFAULT 'TRY',
  environment public.financial_environment NOT NULL DEFAULT 'test',
  status public.creator_transfer_status NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'stripe',
  provider_transfer_id text,
  provider_transfer_group text,
  failure_code text,
  failure_message_sanitized text,
  initiated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_transfers_provider_id_unique
  ON public.creator_transfers (provider, environment, provider_transfer_id)
  WHERE provider_transfer_id IS NOT NULL;
GRANT SELECT ON public.creator_transfers TO authenticated;
GRANT ALL ON public.creator_transfers TO service_role;
ALTER TABLE public.creator_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_owner_read" ON public.creator_transfers
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "ct_admin_read" ON public.creator_transfers
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER creator_transfers_set_updated_at
  BEFORE UPDATE ON public.creator_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 8) creator_transfer_reversals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.creator_transfer_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_transfer_id uuid NOT NULL REFERENCES public.creator_transfers(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency character(3) NOT NULL DEFAULT 'TRY',
  status public.creator_transfer_reversal_status NOT NULL DEFAULT 'pending',
  provider_transfer_reversal_id text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_transfer_reversals_provider_id_unique
  ON public.creator_transfer_reversals (provider_transfer_reversal_id)
  WHERE provider_transfer_reversal_id IS NOT NULL;
GRANT SELECT ON public.creator_transfer_reversals TO authenticated;
GRANT ALL ON public.creator_transfer_reversals TO service_role;
ALTER TABLE public.creator_transfer_reversals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctr_admin_read" ON public.creator_transfer_reversals
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "ctr_owner_read" ON public.creator_transfer_reversals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.creator_transfers t
            WHERE t.id = creator_transfer_reversals.creator_transfer_id
              AND t.creator_id = auth.uid())
  );

-- =============================================================================
-- 9) provider_payouts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.provider_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  creator_payment_account_id uuid REFERENCES public.creator_payment_accounts(id) ON DELETE RESTRICT,
  environment public.financial_environment NOT NULL DEFAULT 'test',
  provider text NOT NULL DEFAULT 'stripe',
  provider_payout_id text,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency character(3) NOT NULL DEFAULT 'TRY',
  status public.provider_payout_status NOT NULL DEFAULT 'pending',
  arrival_date date,
  failure_code text,
  failure_message_sanitized text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_payouts_provider_id_unique
  ON public.provider_payouts (provider, environment, provider_payout_id)
  WHERE provider_payout_id IS NOT NULL;
GRANT SELECT ON public.provider_payouts TO authenticated;
GRANT ALL ON public.provider_payouts TO service_role;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_owner_read" ON public.provider_payouts
  FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "pp_admin_read" ON public.provider_payouts
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER provider_payouts_set_updated_at
  BEFORE UPDATE ON public.provider_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 10) payment_transactions extensions
-- =============================================================================
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS provider_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS provider_charge_id text,
  ADD COLUMN IF NOT EXISTS provider_balance_transaction_id text,
  ADD COLUMN IF NOT EXISTS provider_connected_account_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_provider_event_id text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_message_sanitized text,
  ADD COLUMN IF NOT EXISTS domain_status public.payment_domain_status;

COMMENT ON COLUMN public.payment_transactions.provider_payment_id IS
  'DEPRECATED (Faz 11.5): Replaced by provider_checkout_session_id / provider_payment_intent_id / provider_charge_id. Do not write from new code.';

CREATE UNIQUE INDEX IF NOT EXISTS pt_checkout_session_unique
  ON public.payment_transactions (provider, environment, provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL AND provider <> 'simulation';
CREATE UNIQUE INDEX IF NOT EXISTS pt_payment_intent_unique
  ON public.payment_transactions (provider, environment, provider_payment_intent_id)
  WHERE provider_payment_intent_id IS NOT NULL AND provider <> 'simulation';
CREATE UNIQUE INDEX IF NOT EXISTS pt_charge_unique
  ON public.payment_transactions (provider, environment, provider_charge_id)
  WHERE provider_charge_id IS NOT NULL AND provider <> 'simulation';
CREATE UNIQUE INDEX IF NOT EXISTS pt_balance_tx_unique
  ON public.payment_transactions (provider, environment, provider_balance_transaction_id)
  WHERE provider_balance_transaction_id IS NOT NULL AND provider <> 'simulation';
CREATE UNIQUE INDEX IF NOT EXISTS pt_contribution_attempt_unique
  ON public.payment_transactions (contribution_id, attempt_number);

CREATE OR REPLACE FUNCTION public.payment_transactions_simulation_namespace()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $f$
BEGIN
  IF NEW.provider = 'simulation' THEN
    IF (NEW.provider_payment_intent_id ~* '^pi_'
        OR NEW.provider_charge_id ~* '^ch_'
        OR NEW.provider_checkout_session_id ~* '^cs_'
        OR NEW.provider_balance_transaction_id ~* '^txn_'
        OR NEW.provider_connected_account_id ~* '^acct_'
        OR NEW.last_provider_event_id ~* '^evt_') THEN
      RAISE EXCEPTION 'BFL_SIMULATION_NAMESPACE_VIOLATION' USING ERRCODE='22023';
    END IF;
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS pt_simulation_namespace_trg ON public.payment_transactions;
CREATE TRIGGER pt_simulation_namespace_trg
  BEFORE INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.payment_transactions_simulation_namespace();

-- =============================================================================
-- 11) webhook_events extensions
-- =============================================================================
ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS livemode boolean,
  ADD COLUMN IF NOT EXISTS api_version text,
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS event_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_object_type text,
  ADD COLUMN IF NOT EXISTS provider_object_id text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;

ALTER TABLE public.webhook_events
  ADD COLUMN IF NOT EXISTS environment public.financial_environment NOT NULL DEFAULT 'test';

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_full_unique
  ON public.webhook_events (
    provider,
    environment,
    COALESCE(provider_account_id, '_'),
    provider_event_id
  );

-- =============================================================================
-- 12) financial_ledger_entries extensions + append-only
-- =============================================================================
ALTER TABLE public.financial_ledger_entries
  ADD COLUMN IF NOT EXISTS creator_transfer_id uuid REFERENCES public.creator_transfers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS creator_transfer_reversal_id uuid REFERENCES public.creator_transfer_reversals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS provider_payout_id uuid REFERENCES public.provider_payouts(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.financial_ledger_entries_append_only()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $f$
BEGIN
  RAISE EXCEPTION 'BFL_LEDGER_APPEND_ONLY' USING ERRCODE='42501';
END $f$;
DROP TRIGGER IF EXISTS fle_append_only_update ON public.financial_ledger_entries;
DROP TRIGGER IF EXISTS fle_append_only_delete ON public.financial_ledger_entries;
CREATE TRIGGER fle_append_only_update
  BEFORE UPDATE ON public.financial_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_ledger_entries_append_only();
CREATE TRIGGER fle_append_only_delete
  BEFORE DELETE ON public.financial_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.financial_ledger_entries_append_only();

-- =============================================================================
-- 13) Deprecate payouts table
-- =============================================================================
COMMENT ON TABLE public.payouts IS
  'DEPRECATED (Faz 11.5): Replaced by campaign_settlements + creator_transfers + provider_payouts. Will be removed in a later cleanup phase.';

-- =============================================================================
-- 14) RPCs: reward reservations
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reserve_reward(
  _contribution_id uuid,
  _reward_tier_id uuid,
  _quantity integer DEFAULT 1,
  _ttl_seconds integer DEFAULT 1800
) RETURNS public.reward_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE
  _row public.reward_reservations;
  _contrib public.contributions;
  _tier public.reward_tiers;
  _existing public.reward_reservations;
  _outstanding integer;
  _expires timestamptz := now() + make_interval(secs => GREATEST(60, _ttl_seconds));
BEGIN
  IF _quantity IS NULL OR _quantity < 1 THEN
    RAISE EXCEPTION 'BFL_INVALID_QUANTITY' USING ERRCODE='22023';
  END IF;
  SELECT * INTO _contrib FROM public.contributions WHERE id=_contribution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_CONTRIBUTION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO _existing FROM public.reward_reservations
   WHERE contribution_id=_contribution_id AND reward_tier_id=_reward_tier_id AND status='reserved'
   FOR UPDATE;
  IF FOUND THEN RETURN _existing; END IF;
  SELECT * INTO _tier FROM public.reward_tiers WHERE id=_reward_tier_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_REWARD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _tier.campaign_id <> _contrib.campaign_id THEN
    RAISE EXCEPTION 'BFL_REWARD_MISMATCH' USING ERRCODE='22023';
  END IF;
  IF NOT _tier.is_active THEN
    RAISE EXCEPTION 'BFL_REWARD_INACTIVE' USING ERRCODE='22023';
  END IF;
  IF _tier.quantity_limit IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity),0) INTO _outstanding
      FROM public.reward_reservations
     WHERE reward_tier_id=_reward_tier_id AND status='reserved';
    IF COALESCE(_tier.claimed_count,0) + _outstanding + _quantity > _tier.quantity_limit THEN
      RAISE EXCEPTION 'BFL_REWARD_SOLD_OUT' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO public.reward_reservations
    (contribution_id, reward_tier_id, backer_id, quantity, environment, status, expires_at)
  VALUES
    (_contribution_id, _reward_tier_id, _contrib.backer_id, _quantity,
     _contrib.environment, 'reserved', _expires)
  RETURNING * INTO _row;
  RETURN _row;
END $f$;
REVOKE EXECUTE ON FUNCTION public.reserve_reward(uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_reward(uuid, uuid, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_reward_reservation(_contribution_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE _r public.reward_reservations; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT * FROM public.reward_reservations
     WHERE contribution_id=_contribution_id AND status='reserved' FOR UPDATE
  LOOP
    UPDATE public.reward_reservations SET status='confirmed', confirmed_at=now() WHERE id=_r.id;
    UPDATE public.reward_tiers SET claimed_count = COALESCE(claimed_count,0) + _r.quantity WHERE id=_r.reward_tier_id;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $f$;
REVOKE EXECUTE ON FUNCTION public.confirm_reward_reservation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_reward_reservation(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.release_reward_reservation(_contribution_id uuid, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE _r public.reward_reservations; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT * FROM public.reward_reservations
     WHERE contribution_id=_contribution_id AND status='reserved' FOR UPDATE
  LOOP
    UPDATE public.reward_reservations
       SET status='released', released_at=now(), release_reason=_reason
     WHERE id=_r.id;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $f$;
REVOKE EXECUTE ON FUNCTION public.release_reward_reservation(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_reward_reservation(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.release_expired_reward_reservations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
DECLARE _r public.reward_reservations; _contrib public.contributions; _n integer := 0;
BEGIN
  FOR _r IN
    SELECT * FROM public.reward_reservations
     WHERE status='reserved' AND expires_at < now()
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT * INTO _contrib FROM public.contributions WHERE id=_r.contribution_id;
    IF _contrib.status = 'captured' THEN
      UPDATE public.reward_reservations SET status='confirmed', confirmed_at=now() WHERE id=_r.id;
      UPDATE public.reward_tiers SET claimed_count = COALESCE(claimed_count,0) + _r.quantity WHERE id=_r.reward_tier_id;
    ELSE
      UPDATE public.reward_reservations
         SET status='expired', released_at=now(), release_reason='ttl_expired'
       WHERE id=_r.id;
    END IF;
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $f$;
REVOKE EXECUTE ON FUNCTION public.release_expired_reward_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_reward_reservations() TO service_role;

-- =============================================================================
-- 15) Payment readiness
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_campaign_payment_readiness(_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $f$
DECLARE
  _c public.campaigns;
  _cfg public.payment_provider_configs;
  _env public.financial_environment;
  _account public.creator_payment_accounts;
  _reasons text[] := '{}';
  _ready boolean := false;
BEGIN
  SELECT * INTO _c FROM public.campaigns WHERE id=_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ready', false, 'reasons', jsonb_build_array('CAMPAIGN_NOT_FOUND'));
  END IF;
  SELECT * INTO _cfg FROM public.payment_provider_configs
   WHERE provider='stripe' AND environment='live';
  IF FOUND AND _cfg.live_payments_enabled AND _cfg.payments_enabled
     AND _cfg.production_approval_status='verified' THEN
    _env := 'live';
  ELSE
    _env := 'test';
    SELECT * INTO _cfg FROM public.payment_provider_configs
     WHERE provider='stripe' AND environment='test';
  END IF;
  IF NOT FOUND OR NOT _cfg.payments_enabled THEN
    _reasons := array_append(_reasons, 'PAYMENT_PROVIDER_DISABLED');
  END IF;
  IF _c.status NOT IN ('live') THEN
    _reasons := array_append(_reasons, 'CAMPAIGN_NOT_LIVE');
  END IF;
  SELECT * INTO _account FROM public.creator_payment_accounts
   WHERE creator_id=_c.creator_id AND provider='stripe' AND environment=_env;
  IF NOT FOUND THEN
    _reasons := array_append(_reasons, 'CREATOR_PAYMENT_ACCOUNT_MISSING');
  ELSE
    IF _account.onboarding_status NOT IN ('enabled') THEN
      _reasons := array_append(_reasons, 'CREATOR_PAYMENT_ACCOUNT_NOT_ENABLED');
    END IF;
    IF NOT _account.charges_enabled THEN
      _reasons := array_append(_reasons, 'CREATOR_CHARGES_DISABLED');
    END IF;
    IF array_length(_account.requirements_past_due, 1) > 0 THEN
      _reasons := array_append(_reasons, 'CREATOR_REQUIREMENTS_PAST_DUE');
    END IF;
    IF _account.disabled_reason IS NOT NULL THEN
      _reasons := array_append(_reasons, 'CREATOR_PAYMENT_ACCOUNT_RESTRICTED');
    END IF;
  END IF;
  _ready := array_length(_reasons, 1) IS NULL;
  RETURN jsonb_build_object(
    'ready', _ready,
    'environment', _env,
    'sandbox_mode', (_env = 'test'),
    'live_payments_enabled', COALESCE(_cfg.live_payments_enabled, false),
    'production_approval_status', COALESCE(_cfg.production_approval_status::text, 'not_verified'),
    'reasons', COALESCE(to_jsonb(_reasons), '[]'::jsonb)
  );
END $f$;
REVOKE EXECUTE ON FUNCTION public.get_campaign_payment_readiness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campaign_payment_readiness(uuid) TO authenticated, service_role;

-- =============================================================================
-- 16) Creator account masked summary
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_my_creator_payment_account(_environment public.financial_environment DEFAULT 'test')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $f$
DECLARE _uid uuid := auth.uid(); _a public.creator_payment_accounts;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  SELECT * INTO _a FROM public.creator_payment_accounts
   WHERE creator_id=_uid AND provider='stripe' AND environment=_environment;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', false,
      'environment', _environment,
      'onboarding_status', 'not_started',
      'charges_enabled', false,
      'payouts_enabled', false,
      'details_submitted', false
    );
  END IF;
  RETURN jsonb_build_object(
    'exists', true,
    'environment', _a.environment,
    'onboarding_status', _a.onboarding_status,
    'charges_enabled', _a.charges_enabled,
    'payouts_enabled', _a.payouts_enabled,
    'details_submitted', _a.details_submitted,
    'requirements_currently_due_count', COALESCE(array_length(_a.requirements_currently_due,1), 0),
    'requirements_past_due_count', COALESCE(array_length(_a.requirements_past_due,1), 0),
    'requirements_pending_verification_count', COALESCE(array_length(_a.requirements_pending_verification,1), 0),
    'disabled_reason', _a.disabled_reason,
    'country', _a.country,
    'last_provider_sync_at', _a.last_provider_sync_at
  );
END $f$;
REVOKE EXECUTE ON FUNCTION public.get_my_creator_payment_account(public.financial_environment) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_creator_payment_account(public.financial_environment) TO authenticated, service_role;

-- =============================================================================
-- 17) Wire contributions to reservation lifecycle
-- =============================================================================
CREATE OR REPLACE FUNCTION public.contributions_sync_reservations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'captured' THEN
      PERFORM public.confirm_reward_reservation(NEW.id);
    ELSIF NEW.status IN ('failed','cancelled') THEN
      PERFORM public.release_reward_reservation(NEW.id, NEW.status::text);
    END IF;
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS contributions_sync_reservations_trg ON public.contributions;
CREATE TRIGGER contributions_sync_reservations_trg
  AFTER UPDATE ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.contributions_sync_reservations();

CREATE OR REPLACE FUNCTION public.contributions_create_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $f$
BEGIN
  IF NEW.reward_tier_id IS NOT NULL THEN
    PERFORM public.reserve_reward(NEW.id, NEW.reward_tier_id, 1, 1800);
  END IF;
  RETURN NEW;
END $f$;
DROP TRIGGER IF EXISTS contributions_create_reservation_trg ON public.contributions;
CREATE TRIGGER contributions_create_reservation_trg
  AFTER INSERT ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.contributions_create_reservation();
