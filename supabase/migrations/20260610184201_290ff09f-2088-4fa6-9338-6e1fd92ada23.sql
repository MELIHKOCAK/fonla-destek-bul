
-- Fix ON CONFLICT to match the partial unique index (WHERE dedupe_key IS NOT NULL)
-- on notifications(user_id, dedupe_key)

DO $$
DECLARE
  r record;
  new_src text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('approve_campaign','reject_campaign','request_campaign_revision','suspend_campaign')
  LOOP
    new_src := replace(r.def,
      'on conflict (user_id, dedupe_key) do nothing',
      'on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing');
    EXECUTE new_src;
  END LOOP;
END $$;

-- Fix get_admin_system_alerts: provider_payouts columns
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
        SELECT id,
               creator_payment_account_id::text AS connected_account_id,
               status, amount_minor, currency,
               failure_message_sanitized AS failure_message,
               updated_at AS observed_at
        FROM public.provider_payouts
        WHERE status = 'failed'
        ORDER BY updated_at DESC
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
