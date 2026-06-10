
-- 1) Add FK from campaigns.creator_id -> profiles.id so PostgREST can embed profiles
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_creator_id_profiles_fkey
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- 2) Fix dashboard overview ('active' -> 'live')
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
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
      SELECT COUNT(*) FROM public.campaigns WHERE status = 'live'
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

-- 3) Fix system alerts: creator_transfers and refunds have no last_error column
CREATE OR REPLACE FUNCTION public.get_admin_system_alerts()
RETURNS jsonb
LANGUAGE plpgsql
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
        SELECT id, campaign_id, status, amount_minor, currency,
               failure_message_sanitized AS last_error, updated_at
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
        SELECT id, payment_transaction_id AS payment_id, status, amount_minor,
               'TRY'::text AS currency,
               reason AS last_error, updated_at
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
