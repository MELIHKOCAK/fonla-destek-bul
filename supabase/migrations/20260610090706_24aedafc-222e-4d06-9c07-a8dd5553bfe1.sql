REVOKE EXECUTE ON FUNCTION public._assert_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public._finalize_contribution_paid(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auto_follow_on_contribution() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_default_notification_preferences() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.creator_transfers_live_guard() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.contributions_sync_reservations() FROM anon, public;

REVOKE EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, boolean, financial_environment, boolean, text, text, text, timestamptz, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_webhook_event_processed(uuid, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_enqueue(notification_event_type, text, uuid, uuid, jsonb, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_claim_batch(integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_mark_done(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_mark_failed(uuid, text, boolean) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, boolean, financial_environment, boolean, text, text, text, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_webhook_event_processed(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_enqueue(notification_event_type, text, uuid, uuid, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_claim_batch(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_mark_done(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_mark_failed(uuid, text, boolean) TO service_role;