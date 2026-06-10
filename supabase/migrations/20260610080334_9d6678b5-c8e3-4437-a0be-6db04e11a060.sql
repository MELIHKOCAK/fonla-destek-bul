
-- 1. payment_transactions: stripe idempotency + transfer group + livemode
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS stripe_idempotency_key text,
  ADD COLUMN IF NOT EXISTS transfer_group text,
  ADD COLUMN IF NOT EXISTS livemode boolean;

CREATE UNIQUE INDEX IF NOT EXISTS pt_stripe_idempotency_unique
  ON public.payment_transactions (provider, environment, stripe_idempotency_key)
  WHERE stripe_idempotency_key IS NOT NULL AND provider <> 'simulation';

CREATE INDEX IF NOT EXISTS pt_transfer_group_idx
  ON public.payment_transactions (transfer_group)
  WHERE transfer_group IS NOT NULL;

-- 2. Live mode guard for creator_transfers & reversals
CREATE OR REPLACE FUNCTION public.creator_transfers_live_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
BEGIN
  IF NEW.environment = 'live' THEN
    SELECT live_payments_enabled, production_approval_status
      INTO cfg
      FROM public.payment_provider_configs
      WHERE provider = 'stripe' AND environment = 'live'
      LIMIT 1;
    IF cfg IS NULL
       OR cfg.live_payments_enabled IS DISTINCT FROM true
       OR cfg.production_approval_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Live transfers disabled: live_payments_enabled and production_approval_status=verified required'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_transfers_live_guard_trg ON public.creator_transfers;
CREATE TRIGGER creator_transfers_live_guard_trg
  BEFORE INSERT OR UPDATE ON public.creator_transfers
  FOR EACH ROW EXECUTE FUNCTION public.creator_transfers_live_guard();

DROP TRIGGER IF EXISTS creator_transfer_reversals_live_guard_trg ON public.creator_transfer_reversals;
CREATE TRIGGER creator_transfer_reversals_live_guard_trg
  BEFORE INSERT OR UPDATE ON public.creator_transfer_reversals
  FOR EACH ROW EXECUTE FUNCTION public.creator_transfers_live_guard();

-- 3. Idempotent webhook event claim helper (service_role only)
CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  _provider text,
  _provider_event_id text,
  _event_type text,
  _payload_hash text,
  _signature_valid boolean,
  _environment financial_environment,
  _livemode boolean,
  _api_version text,
  _request_id text,
  _provider_account_id text,
  _event_created_at timestamptz,
  _provider_object_type text,
  _provider_object_id text
) RETURNS TABLE (event_id uuid, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_new boolean := false;
BEGIN
  INSERT INTO public.webhook_events (
    provider, provider_event_id, event_type, payload_hash,
    signature_valid, processing_status, attempt_count,
    environment, livemode, api_version, request_id,
    provider_account_id, event_created_at,
    provider_object_type, provider_object_id,
    processing_started_at
  ) VALUES (
    _provider, _provider_event_id, _event_type, _payload_hash,
    _signature_valid, 'processing', 1,
    _environment, _livemode, _api_version, _request_id,
    _provider_account_id, _event_created_at,
    _provider_object_type, _provider_object_id,
    now()
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    v_new := true;
  ELSE
    SELECT id INTO v_id
      FROM public.webhook_events
      WHERE provider = _provider AND provider_event_id = _provider_event_id;
  END IF;

  RETURN QUERY SELECT v_id, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_event(text,text,text,text,boolean,financial_environment,boolean,text,text,text,timestamptz,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text,text,text,text,boolean,financial_environment,boolean,text,text,text,timestamptz,text,text) TO service_role;

-- 4. Mark webhook event processed
CREATE OR REPLACE FUNCTION public.mark_webhook_event_processed(
  _event_id uuid,
  _status text,
  _error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.webhook_events
    SET processing_status = _status,
        processed_at = now(),
        processing_completed_at = now(),
        last_error = _error
    WHERE id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_webhook_event_processed(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_webhook_event_processed(uuid,text,text) TO service_role;

-- 5. Comment payouts table deprecation reminder
COMMENT ON TABLE public.payouts IS 'DEPRECATED — superseded by creator_transfers + provider_payouts (Faz 11.5). Do not write.';
