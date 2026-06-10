
-- ============== Dashboard/Creator projection RPCs ==============

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS contributions_backer_created_idx
  ON public.contributions (backer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creator_transfers_campaign_created_idx
  ON public.creator_transfers (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_payouts_account_created_idx
  ON public.provider_payouts (creator_payment_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS contributions_campaign_captured_created_idx
  ON public.contributions (campaign_id, created_at)
  WHERE status = 'captured'::contribution_status;

-- 1) User dashboard overview
CREATE OR REPLACE FUNCTION public.get_user_dashboard_overview()
RETURNS TABLE (
  total_paid_minor bigint,
  active_supported_count integer,
  pending_refund_minor bigint,
  expected_rewards_count integer,
  unread_notifications integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT SUM(amount_minor) FROM public.contributions
              WHERE backer_id = auth.uid() AND status = 'captured'::contribution_status), 0)::bigint,
    COALESCE((SELECT COUNT(DISTINCT c.campaign_id)::int
              FROM public.contributions c
              JOIN public.campaigns ca ON ca.id = c.campaign_id
              WHERE c.backer_id = auth.uid()
                AND c.status = 'captured'::contribution_status
                AND ca.status = 'live'::campaign_status), 0),
    COALESCE((SELECT SUM(r.amount_minor)
              FROM public.refunds r
              JOIN public.contributions c ON c.id = r.contribution_id
              WHERE c.backer_id = auth.uid()
                AND r.status IN ('requested'::refund_status, 'processing'::refund_status)), 0)::bigint,
    COALESCE((SELECT COUNT(*)::int FROM public.reward_reservations rr
              WHERE rr.backer_id = auth.uid()
                AND rr.status = 'confirmed'::reward_reservation_status), 0),
    COALESCE((SELECT COUNT(*)::int FROM public.notifications
              WHERE user_id = auth.uid() AND read_at IS NULL), 0);
$$;

-- 2) User payments (safe projection, no provider IDs)
CREATE OR REPLACE FUNCTION public.get_user_payments(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  contribution_id uuid,
  campaign_slug text,
  campaign_title text,
  amount_minor bigint,
  currency char(3),
  status payment_status,
  domain_status payment_domain_status,
  environment financial_environment,
  attempt_number int,
  failure_code text,
  failure_message_sanitized text,
  created_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pt.id, pt.contribution_id, ca.slug, ca.title,
    pt.amount_minor, pt.currency, pt.status, pt.domain_status,
    pt.environment, pt.attempt_number, pt.failure_code,
    pt.failure_message_sanitized, pt.created_at, pt.completed_at
  FROM public.payment_transactions pt
  JOIN public.contributions c ON c.id = pt.contribution_id
  JOIN public.campaigns ca ON ca.id = c.campaign_id
  WHERE c.backer_id = auth.uid()
  ORDER BY pt.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit,20), 100), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
$$;

-- 3) User refunds
CREATE OR REPLACE FUNCTION public.get_user_refunds(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (
  id uuid,
  contribution_id uuid,
  campaign_slug text,
  campaign_title text,
  amount_minor bigint,
  status refund_status,
  reason text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.contribution_id, ca.slug, ca.title,
    r.amount_minor, r.status, r.reason, r.created_at, r.updated_at
  FROM public.refunds r
  JOIN public.contributions c ON c.id = r.contribution_id
  JOIN public.campaigns ca ON ca.id = c.campaign_id
  WHERE c.backer_id = auth.uid()
  ORDER BY r.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit,20), 100), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
$$;

-- 4) User rewards
CREATE OR REPLACE FUNCTION public.get_user_rewards()
RETURNS TABLE (
  reservation_id uuid,
  contribution_id uuid,
  campaign_id uuid,
  campaign_slug text,
  campaign_title text,
  reward_tier_id uuid,
  reward_title text,
  reward_description text,
  estimated_delivery_date date,
  shipping_required boolean,
  quantity int,
  reservation_status reward_reservation_status,
  contribution_status contribution_status,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rr.id, rr.contribution_id, ca.id, ca.slug, ca.title,
    rt.id, rt.title, rt.description, rt.estimated_delivery_date,
    rt.shipping_required, rr.quantity, rr.status, c.status, rr.created_at
  FROM public.reward_reservations rr
  JOIN public.reward_tiers rt ON rt.id = rr.reward_tier_id
  JOIN public.contributions c ON c.id = rr.contribution_id
  JOIN public.campaigns ca ON ca.id = c.campaign_id
  WHERE rr.backer_id = auth.uid()
  ORDER BY rr.created_at DESC;
$$;

-- 5) User favorites
CREATE OR REPLACE FUNCTION public.get_user_favorites(p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (
  campaign_id uuid,
  slug text,
  title text,
  short_description text,
  status campaign_status,
  end_at timestamptz,
  favorited_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ca.id, ca.slug, ca.title, ca.short_description,
    ca.status, ca.end_at, f.created_at
  FROM public.favorites f
  JOIN public.campaigns ca ON ca.id = f.campaign_id
  WHERE f.user_id = auth.uid()
  ORDER BY f.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit,20), 100), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
$$;

-- 6) Creator overview (across creator's campaigns)
CREATE OR REPLACE FUNCTION public.get_creator_overview()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status_dist jsonb;
  v_active jsonb;
  v_pending_review int;
  v_account jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'BFL_UNAUTHENTICATED'; END IF;

  SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb) INTO v_status_dist
  FROM (
    SELECT status::text AS status, COUNT(*)::int AS cnt
    FROM public.campaigns WHERE creator_id = v_uid GROUP BY status
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ca.id,
    'slug', ca.slug,
    'title', ca.title,
    'status', ca.status,
    'goal_amount_minor', ca.goal_amount_minor,
    'raised_minor', COALESCE(p.raised_minor, 0),
    'backer_count', COALESCE(p.backer_count, 0),
    'end_at', ca.end_at
  ) ORDER BY ca.created_at DESC), '[]'::jsonb) INTO v_active
  FROM public.campaigns ca
  LEFT JOIN LATERAL (
    SELECT SUM(amount_minor)::bigint AS raised_minor,
           COUNT(DISTINCT backer_id)::int AS backer_count
    FROM public.contributions
    WHERE campaign_id = ca.id AND status = 'captured'::contribution_status
  ) p ON true
  WHERE ca.creator_id = v_uid
    AND ca.status IN ('live'::campaign_status, 'pending_review'::campaign_status, 'successful'::campaign_status);

  SELECT COUNT(*)::int INTO v_pending_review
  FROM public.campaigns
  WHERE creator_id = v_uid AND status = 'changes_requested'::campaign_status;

  SELECT to_jsonb(cpa) - 'capabilities_snapshot' INTO v_account
  FROM (
    SELECT onboarding_status, details_submitted, charges_enabled, payouts_enabled,
           cardinality(requirements_currently_due) AS requirements_currently_due_count,
           cardinality(requirements_past_due) AS requirements_past_due_count,
           disabled_reason, country, default_currency, last_provider_sync_at
    FROM public.creator_payment_accounts
    WHERE creator_id = v_uid
    ORDER BY environment DESC, updated_at DESC
    LIMIT 1
  ) cpa;

  RETURN jsonb_build_object(
    'status_distribution', v_status_dist,
    'campaigns', v_active,
    'pending_revision_count', v_pending_review,
    'payment_account', COALESCE(v_account, 'null'::jsonb)
  );
END $$;

-- 7) Creator campaign overview (single)
CREATE OR REPLACE FUNCTION public.get_creator_campaign_overview(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'BFL_UNAUTHENTICATED'; END IF;
  IF NOT public.campaign_owned_by_me(p_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_FOUND';
  END IF;

  SELECT jsonb_build_object(
    'id', ca.id, 'slug', ca.slug, 'title', ca.title,
    'status', ca.status, 'goal_amount_minor', ca.goal_amount_minor,
    'currency', ca.currency, 'start_at', ca.start_at, 'end_at', ca.end_at,
    'raised_minor', COALESCE(p.raised_minor, 0),
    'backer_count', COALESCE(p.backer_count, 0),
    'contribution_count', COALESCE(p.contribution_count, 0)
  ) INTO v_row
  FROM public.campaigns ca
  LEFT JOIN LATERAL (
    SELECT SUM(amount_minor)::bigint AS raised_minor,
           COUNT(DISTINCT backer_id)::int AS backer_count,
           COUNT(*)::int AS contribution_count
    FROM public.contributions
    WHERE campaign_id = ca.id AND status = 'captured'::contribution_status
  ) p ON true
  WHERE ca.id = p_campaign_id;

  RETURN v_row;
END $$;

-- 8) Creator campaign analytics (date range)
CREATE OR REPLACE FUNCTION public.get_creator_campaign_analytics(
  p_campaign_id uuid,
  p_from date DEFAULT (now() - interval '30 days')::date,
  p_to date DEFAULT now()::date
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_series jsonb;
  v_rewards jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'BFL_UNAUTHENTICATED'; END IF;
  IF NOT public.campaign_owned_by_me(p_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_FOUND';
  END IF;
  IF p_to < p_from OR (p_to - p_from) > 366 THEN
    RAISE EXCEPTION 'BFL_INVALID_RANGE';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d.day, 'funding_minor', COALESCE(c.funding_minor, 0),
    'backers', COALESCE(c.backers, 0)
  ) ORDER BY d.day), '[]'::jsonb) INTO v_series
  FROM generate_series(p_from, p_to, '1 day') d(day)
  LEFT JOIN LATERAL (
    SELECT SUM(amount_minor)::bigint AS funding_minor,
           COUNT(DISTINCT backer_id)::int AS backers
    FROM public.contributions
    WHERE campaign_id = p_campaign_id
      AND status = 'captured'::contribution_status
      AND created_at >= d.day::timestamptz
      AND created_at < (d.day + 1)::timestamptz
  ) c ON true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'reward_tier_id', rt.id, 'title', rt.title,
    'count', COALESCE(x.cnt, 0), 'amount_minor', COALESCE(x.amt, 0)
  ) ORDER BY rt.sort_order), '[]'::jsonb) INTO v_rewards
  FROM public.reward_tiers rt
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt, SUM(amount_minor)::bigint AS amt
    FROM public.contributions
    WHERE reward_tier_id = rt.id AND status = 'captured'::contribution_status
  ) x ON true
  WHERE rt.campaign_id = p_campaign_id;

  RETURN jsonb_build_object('series', v_series, 'rewards', v_rewards,
                            'from', p_from, 'to', p_to);
END $$;

-- 9) Creator campaign backers (privacy-safe)
CREATE OR REPLACE FUNCTION public.get_creator_campaign_backers(
  p_campaign_id uuid, p_limit int DEFAULT 20, p_offset int DEFAULT 0
)
RETURNS TABLE (
  contribution_id uuid,
  amount_minor bigint,
  status contribution_status,
  display_name text,
  is_anonymous boolean,
  reward_title text,
  reward_tier_id uuid,
  shipping_required boolean,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'BFL_UNAUTHENTICATED'; END IF;
  IF NOT public.campaign_owned_by_me(p_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_FOUND';
  END IF;

  RETURN QUERY
  SELECT c.id, c.amount_minor, c.status,
    CASE WHEN c.anonymous THEN 'Anonim Destekçi'
         ELSE COALESCE(c.display_name_snapshot, 'Destekçi') END,
    c.anonymous,
    rt.title, rt.id, COALESCE(rt.shipping_required, false),
    c.created_at
  FROM public.contributions c
  LEFT JOIN public.reward_tiers rt ON rt.id = c.reward_tier_id
  WHERE c.campaign_id = p_campaign_id
    AND c.status IN ('captured'::contribution_status, 'pending'::contribution_status)
  ORDER BY c.created_at DESC
  LIMIT GREATEST(LEAST(COALESCE(p_limit,20), 100), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
END $$;

-- 10) Creator campaign finance
CREATE OR REPLACE FUNCTION public.get_creator_campaign_finance(p_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_settlement jsonb;
  v_transfer jsonb;
  v_payout jsonb;
  v_gross bigint;
  v_refunded bigint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'BFL_UNAUTHENTICATED'; END IF;
  IF NOT public.campaign_owned_by_me(p_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(amount_minor), 0)::bigint INTO v_gross
  FROM public.contributions
  WHERE campaign_id = p_campaign_id AND status = 'captured'::contribution_status;

  SELECT COALESCE(SUM(r.amount_minor), 0)::bigint INTO v_refunded
  FROM public.refunds r
  JOIN public.contributions c ON c.id = r.contribution_id
  WHERE c.campaign_id = p_campaign_id
    AND r.status IN ('succeeded'::refund_status, 'processing'::refund_status);

  SELECT to_jsonb(s) INTO v_settlement FROM (
    SELECT gross_amount_minor, refunded_amount_minor, provider_fee_amount_minor,
           platform_fee_amount_minor, other_deduction_amount_minor,
           net_amount_minor, status, computed_at, environment
    FROM public.campaign_settlements
    WHERE campaign_id = p_campaign_id
    LIMIT 1
  ) s;

  SELECT to_jsonb(t) INTO v_transfer FROM (
    SELECT id, amount_minor, status, environment,
           initiated_at, completed_at, failure_code, failure_message_sanitized
    FROM public.creator_transfers
    WHERE campaign_id = p_campaign_id
    ORDER BY created_at DESC LIMIT 1
  ) t;

  SELECT to_jsonb(po) INTO v_payout FROM (
    SELECT pp.id, pp.amount_minor, pp.status, pp.arrival_date,
           pp.environment, pp.failure_code, pp.failure_message_sanitized
    FROM public.provider_payouts pp
    JOIN public.creator_payment_accounts cpa ON cpa.id = pp.creator_payment_account_id
    WHERE cpa.creator_id = v_uid
    ORDER BY pp.created_at DESC LIMIT 1
  ) po;

  RETURN jsonb_build_object(
    'estimate', jsonb_build_object(
      'gross_confirmed_minor', v_gross,
      'refunded_minor', v_refunded
    ),
    'settlement', COALESCE(v_settlement, 'null'::jsonb),
    'latest_transfer', COALESCE(v_transfer, 'null'::jsonb),
    'latest_provider_payout', COALESCE(v_payout, 'null'::jsonb)
  );
END $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_user_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_payments(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_refunds(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_favorites(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_campaign_overview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_campaign_analytics(uuid,date,date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_campaign_backers(uuid,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_campaign_finance(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_dashboard_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_payments(int,int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_refunds(int,int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_rewards() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_favorites(int,int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_campaign_overview(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_campaign_analytics(uuid,date,date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_campaign_backers(uuid,int,int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_campaign_finance(uuid) FROM anon;
