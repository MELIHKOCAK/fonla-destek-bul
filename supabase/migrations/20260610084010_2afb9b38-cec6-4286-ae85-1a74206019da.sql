
-- =========================================================
-- Admin dashboard overview
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'pending_reviews', (
      SELECT COUNT(*) FROM public.campaigns
      WHERE status IN ('submitted', 'under_review')
    ),
    'revision_requested', (
      SELECT COUNT(*) FROM public.campaigns WHERE status = 'revision_requested'
    ),
    'live_campaigns', (
      SELECT COUNT(*) FROM public.campaigns WHERE status = 'active'
    ),
    'open_reports', (
      SELECT COUNT(*) FROM public.campaign_reports
      WHERE status IN ('open', 'reviewing')
    ),
    'failed_payments', (
      SELECT COUNT(*) FROM public.payment_transactions WHERE status = 'failed'
    ),
    'failed_refunds', (
      SELECT COUNT(*) FROM public.refunds WHERE status = 'failed'
    ),
    'failed_transfers', (
      SELECT COUNT(*) FROM public.creator_transfers WHERE status = 'failed'
    ),
    'failed_payouts', (
      SELECT COUNT(*) FROM public.provider_payouts WHERE status = 'failed'
    ),
    'unprocessed_webhooks', (
      SELECT COUNT(*) FROM public.webhook_events
      WHERE processed_at IS NULL
    ),
    'invalid_webhooks', (
      SELECT COUNT(*) FROM public.webhook_events
      WHERE signature_valid = false
    ),
    'recent_audits', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, actor_user_id, action, entity_type, entity_id, reason, created_at
        FROM public.audit_logs
        ORDER BY created_at DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_overview() TO authenticated;

-- =========================================================
-- System alerts
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_admin_system_alerts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'failed_webhooks', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, provider, event_type, signature_valid, attempt_count, last_error, received_at
        FROM public.webhook_events
        WHERE (signature_valid = false OR processed_at IS NULL)
          AND received_at > now() - interval '7 days'
        ORDER BY received_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb),
    'failed_transfers', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, campaign_id, status, amount_minor, currency, last_error, updated_at
        FROM public.creator_transfers
        WHERE status IN ('failed', 'pending')
          AND updated_at < now() - interval '24 hours'
        ORDER BY updated_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb),
    'failed_payouts', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, connected_account_id, status, amount_minor, currency, failure_message, observed_at
        FROM public.provider_payouts
        WHERE status = 'failed'
        ORDER BY observed_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb),
    'failed_refunds', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, payment_id, status, amount_minor, currency, last_error, updated_at
        FROM public.refunds
        WHERE status = 'failed'
        ORDER BY updated_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_system_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_system_alerts() TO authenticated;

-- =========================================================
-- Audit log read with filters
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_admin_audit_log(
  p_actor_user_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  actor_user_id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  reason text,
  correlation_id uuid,
  created_at timestamptz,
  before_data jsonb,
  after_data jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT *
    FROM public.audit_logs a
    WHERE (p_actor_user_id IS NULL OR a.actor_user_id = p_actor_user_id)
      AND (p_action IS NULL OR a.action = p_action)
      AND (p_entity_type IS NULL OR a.entity_type = p_entity_type)
      AND (p_entity_id IS NULL OR a.entity_id = p_entity_id)
      AND (p_from IS NULL OR a.created_at >= p_from)
      AND (p_to IS NULL OR a.created_at < p_to)
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS c FROM filtered
  )
  SELECT
    f.id,
    f.actor_user_id,
    f.action,
    f.entity_type,
    f.entity_id,
    f.reason,
    f.correlation_id,
    f.created_at,
    -- Mask sensitive payload fields
    CASE WHEN f.before_data IS NULL THEN NULL ELSE
      (f.before_data
        - 'password' - 'access_token' - 'refresh_token'
        - 'stripe_secret' - 'api_key' - 'webhook_secret')
    END AS before_data,
    CASE WHEN f.after_data IS NULL THEN NULL ELSE
      (f.after_data
        - 'password' - 'access_token' - 'refresh_token'
        - 'stripe_secret' - 'api_key' - 'webhook_secret')
    END AS after_data,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_audit_log(uuid, text, text, uuid, timestamptz, timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_log(uuid, text, text, uuid, timestamptz, timestamptz, int, int) TO authenticated;
