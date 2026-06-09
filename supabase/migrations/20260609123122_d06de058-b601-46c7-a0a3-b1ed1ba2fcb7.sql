
-- 1) reward_tiers.claimed_count
ALTER TABLE public.reward_tiers
  ADD COLUMN IF NOT EXISTS claimed_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.reward_tiers
  ADD CONSTRAINT reward_tiers_claimed_nonneg CHECK (claimed_count >= 0);

-- 2) contributions shipping/contact fields (plain text + strict RLS; PII)
ALTER TABLE public.contributions
  ADD COLUMN IF NOT EXISTS shipping_recipient_name text,
  ADD COLUMN IF NOT EXISTS shipping_line1 text,
  ADD COLUMN IF NOT EXISTS shipping_line2 text,
  ADD COLUMN IF NOT EXISTS shipping_city text,
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_country text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text;

-- Helpful aggregation index
CREATE INDEX IF NOT EXISTS contributions_campaign_env_status_idx
  ON public.contributions (campaign_id, environment, status);

-- 3) RLS policies for contributions (own + creator + admin)
DROP POLICY IF EXISTS contributions_owner_read ON public.contributions;
CREATE POLICY contributions_owner_read ON public.contributions
  FOR SELECT TO authenticated
  USING (backer_id = auth.uid());

DROP POLICY IF EXISTS contributions_creator_read ON public.contributions;
CREATE POLICY contributions_creator_read ON public.contributions
  FOR SELECT TO authenticated
  USING (public.campaign_owned_by_me(campaign_id));

-- payment_transactions RLS: only via RPCs; restrict direct access
DROP POLICY IF EXISTS payment_transactions_owner_read ON public.payment_transactions;
CREATE POLICY payment_transactions_owner_read ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contributions c
                 WHERE c.id = payment_transactions.contribution_id
                   AND c.backer_id = auth.uid()));

-- 4) Internal finalizer
CREATE OR REPLACE FUNCTION public._finalize_contribution_paid(_contribution_id uuid, _payment_transaction_id uuid)
RETURNS public.contributions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row public.contributions;
BEGIN
  SELECT * INTO _row FROM public.contributions WHERE id = _contribution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _row.status = 'captured' THEN RETURN _row; END IF;
  IF _row.status NOT IN ('pending','failed','authorized') THEN
    RAISE EXCEPTION 'BFL_INVALID_TRANSITION' USING ERRCODE='42501';
  END IF;
  UPDATE public.contributions
     SET status='captured', updated_at=now()
   WHERE id=_contribution_id
   RETURNING * INTO _row;

  INSERT INTO public.audit_logs(entity_type, entity_id, action, actor_user_id, after_data)
  VALUES ('contribution', _contribution_id, 'capture', _row.backer_id,
          jsonb_build_object('status','captured','payment_transaction_id', _payment_transaction_id));
  RETURN _row;
END $$;

-- 5) create_contribution
CREATE OR REPLACE FUNCTION public.create_contribution(
  _campaign_id uuid,
  _reward_tier_id uuid,
  _amount_minor bigint,
  _anonymous boolean,
  _risk_ack boolean,
  _shipping jsonb,
  _idempotency_key text
)
RETURNS public.contributions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _camp public.campaigns;
  _reward public.reward_tiers;
  _row public.contributions;
  _existing public.contributions;
  _claimed int;
  _display text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _risk_ack IS NOT TRUE THEN RAISE EXCEPTION 'BFL_RISK_NOT_ACKNOWLEDGED' USING ERRCODE='22023'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 16 OR length(_idempotency_key) > 100 THEN
    RAISE EXCEPTION 'BFL_INVALID_IDEMPOTENCY' USING ERRCODE='22023';
  END IF;
  IF _amount_minor IS NULL OR _amount_minor < 1000 OR _amount_minor > 500000000 THEN
    RAISE EXCEPTION 'BFL_INVALID_AMOUNT' USING ERRCODE='22023';
  END IF;

  -- Idempotency: return existing if same key
  SELECT * INTO _existing FROM public.contributions
   WHERE backer_id=_uid AND idempotency_key=_idempotency_key;
  IF FOUND THEN RETURN _existing; END IF;

  SELECT * INTO _camp FROM public.campaigns WHERE id=_campaign_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _camp.creator_id = _uid THEN RAISE EXCEPTION 'BFL_OWN_CAMPAIGN' USING ERRCODE='42501'; END IF;
  IF _camp.status <> 'live' THEN RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_LIVE' USING ERRCODE='42501'; END IF;
  IF _camp.start_at IS NULL OR _camp.end_at IS NULL OR now() < _camp.start_at OR now() > _camp.end_at THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_OPEN' USING ERRCODE='42501';
  END IF;

  IF _reward_tier_id IS NOT NULL THEN
    SELECT * INTO _reward FROM public.reward_tiers WHERE id=_reward_tier_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'BFL_REWARD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
    IF _reward.campaign_id <> _campaign_id THEN RAISE EXCEPTION 'BFL_REWARD_MISMATCH' USING ERRCODE='42501'; END IF;
    IF NOT _reward.is_active THEN RAISE EXCEPTION 'BFL_REWARD_INACTIVE' USING ERRCODE='42501'; END IF;
    IF _amount_minor < _reward.amount_minor THEN RAISE EXCEPTION 'BFL_AMOUNT_BELOW_REWARD' USING ERRCODE='22023'; END IF;
    IF _reward.quantity_limit IS NOT NULL AND _reward.claimed_count >= _reward.quantity_limit THEN
      RAISE EXCEPTION 'BFL_REWARD_SOLD_OUT' USING ERRCODE='42901';
    END IF;
    IF _reward.shipping_required THEN
      IF _shipping IS NULL
         OR coalesce(nullif(trim(_shipping->>'recipient_name'),''), '') = ''
         OR coalesce(nullif(trim(_shipping->>'line1'),''), '') = ''
         OR coalesce(nullif(trim(_shipping->>'city'),''), '') = ''
         OR coalesce(nullif(trim(_shipping->>'postal_code'),''), '') = ''
         OR coalesce(nullif(trim(_shipping->>'country'),''), '') = '' THEN
        RAISE EXCEPTION 'BFL_SHIPPING_REQUIRED' USING ERRCODE='22023';
      END IF;
    END IF;
    UPDATE public.reward_tiers SET claimed_count = claimed_count + 1, updated_at=now()
     WHERE id=_reward_tier_id;
  END IF;

  SELECT display_name INTO _display FROM public.profiles WHERE id=_uid;

  INSERT INTO public.contributions(
    campaign_id, backer_id, reward_tier_id, amount_minor, currency, status, environment,
    anonymous, display_name_snapshot, risk_acknowledged_at, idempotency_key,
    shipping_recipient_name, shipping_line1, shipping_line2, shipping_city,
    shipping_postal_code, shipping_country, contact_phone, contact_email
  ) VALUES (
    _campaign_id, _uid, _reward_tier_id, _amount_minor, 'TRY', 'pending', 'test',
    coalesce(_anonymous,false), _display, now(), _idempotency_key,
    nullif(trim(_shipping->>'recipient_name'),''),
    nullif(trim(_shipping->>'line1'),''),
    nullif(trim(_shipping->>'line2'),''),
    nullif(trim(_shipping->>'city'),''),
    nullif(trim(_shipping->>'postal_code'),''),
    nullif(trim(_shipping->>'country'),''),
    nullif(trim(_shipping->>'phone'),''),
    nullif(trim(_shipping->>'email'),'')
  ) RETURNING * INTO _row;

  INSERT INTO public.audit_logs(entity_type, entity_id, action, actor_user_id, after_data)
  VALUES ('contribution', _row.id, 'create', _uid,
          jsonb_build_object('amount_minor', _amount_minor, 'reward_tier_id', _reward_tier_id, 'environment', 'test'));

  RETURN _row;
END $$;

-- 6) simulate_test_payment
CREATE OR REPLACE FUNCTION public.simulate_test_payment(_contribution_id uuid, _scenario text)
RETURNS public.payment_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.contributions;
  _attempt int;
  _next_status public.payment_status;
  _pay public.payment_transactions;
  _app_env text := current_setting('app.environment', true);
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _app_env = 'production' THEN RAISE EXCEPTION 'BFL_SIMULATION_DISABLED' USING ERRCODE='42501'; END IF;
  IF _scenario NOT IN ('succeeded','failed','cancelled') THEN
    RAISE EXCEPTION 'BFL_INVALID_SCENARIO' USING ERRCODE='22023';
  END IF;

  SELECT * INTO _row FROM public.contributions WHERE id=_contribution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _row.backer_id <> _uid THEN RAISE EXCEPTION 'BFL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF _row.environment <> 'test' THEN RAISE EXCEPTION 'BFL_NOT_TEST_ENV' USING ERRCODE='42501'; END IF;
  IF _row.status = 'captured' THEN RAISE EXCEPTION 'BFL_ALREADY_CAPTURED' USING ERRCODE='42501'; END IF;

  SELECT coalesce(max(attempt_number),0) + 1 INTO _attempt
    FROM public.payment_transactions WHERE contribution_id=_contribution_id;

  _next_status := CASE _scenario
    WHEN 'succeeded' THEN 'captured'::public.payment_status
    WHEN 'failed'    THEN 'failed'::public.payment_status
    WHEN 'cancelled' THEN 'cancelled'::public.payment_status
  END;

  INSERT INTO public.payment_transactions(
    contribution_id, provider, attempt_number, amount_minor, currency, status, environment,
    sanitized_metadata, error_code, error_message
  ) VALUES (
    _contribution_id, 'simulator', _attempt, _row.amount_minor, _row.currency, _next_status, 'test',
    jsonb_build_object('scenario', _scenario),
    CASE WHEN _scenario='failed' THEN 'SIM_DECLINED' WHEN _scenario='cancelled' THEN 'SIM_CANCELLED' ELSE NULL END,
    CASE WHEN _scenario='failed' THEN 'Simüle edilmiş başarısız ödeme'
         WHEN _scenario='cancelled' THEN 'Simüle edilmiş iptal' ELSE NULL END
  ) RETURNING * INTO _pay;

  IF _scenario = 'succeeded' THEN
    PERFORM public._finalize_contribution_paid(_contribution_id, _pay.id);
  ELSIF _scenario = 'failed' THEN
    UPDATE public.contributions SET status='failed', updated_at=now() WHERE id=_contribution_id;
  ELSE
    UPDATE public.contributions SET status='cancelled', updated_at=now() WHERE id=_contribution_id;
    -- release reward
    IF _row.reward_tier_id IS NOT NULL THEN
      UPDATE public.reward_tiers SET claimed_count = GREATEST(claimed_count - 1, 0), updated_at=now()
       WHERE id = _row.reward_tier_id;
    END IF;
  END IF;

  RETURN _pay;
END $$;

-- 7) Status / dashboard / progress RPCs
CREATE OR REPLACE FUNCTION public.get_contribution_status(_id uuid)
RETURNS TABLE(
  id uuid, campaign_id uuid, amount_minor bigint, currency char(3),
  status public.contribution_status, environment public.financial_environment,
  reward_tier_id uuid, latest_payment_status public.payment_status,
  latest_attempt_number integer, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.campaign_id, c.amount_minor, c.currency, c.status, c.environment,
         c.reward_tier_id,
         (SELECT pt.status FROM public.payment_transactions pt WHERE pt.contribution_id=c.id ORDER BY pt.attempt_number DESC LIMIT 1),
         (SELECT pt.attempt_number FROM public.payment_transactions pt WHERE pt.contribution_id=c.id ORDER BY pt.attempt_number DESC LIMIT 1),
         c.created_at
    FROM public.contributions c
   WHERE c.id = _id AND c.backer_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_contributions()
RETURNS TABLE(
  id uuid, campaign_id uuid, campaign_slug text, campaign_title text,
  reward_tier_id uuid, reward_title text,
  amount_minor bigint, currency char(3),
  status public.contribution_status, environment public.financial_environment,
  latest_payment_status public.payment_status, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.campaign_id, ca.slug, ca.title,
         c.reward_tier_id, r.title,
         c.amount_minor, c.currency, c.status, c.environment,
         (SELECT pt.status FROM public.payment_transactions pt WHERE pt.contribution_id=c.id ORDER BY pt.attempt_number DESC LIMIT 1),
         c.created_at
    FROM public.contributions c
    JOIN public.campaigns ca ON ca.id = c.campaign_id
    LEFT JOIN public.reward_tiers r ON r.id = c.reward_tier_id
   WHERE c.backer_id = auth.uid()
   ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_campaign_progress(_campaign_id uuid)
RETURNS TABLE(
  raised_amount_minor bigint, backer_count bigint, contribution_count bigint,
  goal_amount_minor bigint, funded_pct numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ca AS (
    SELECT goal_amount_minor FROM public.campaigns WHERE id = _campaign_id
  ),
  ag AS (
    SELECT
      coalesce(sum(amount_minor),0)::bigint AS raised,
      count(distinct backer_id)::bigint AS backers,
      count(*)::bigint AS cnt
      FROM public.contributions
     WHERE campaign_id = _campaign_id AND status='captured'
  )
  SELECT ag.raised, ag.backers, ag.cnt, ca.goal_amount_minor,
         CASE WHEN ca.goal_amount_minor > 0
              THEN LEAST((ag.raised::numeric / ca.goal_amount_minor::numeric) * 100, 999)
              ELSE 0 END
    FROM ag, ca;
$$;

-- 8) Grants
REVOKE ALL ON FUNCTION public._finalize_contribution_paid(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_contribution(uuid, uuid, bigint, boolean, boolean, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_test_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contribution_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_contributions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_progress(uuid) TO authenticated, anon;
