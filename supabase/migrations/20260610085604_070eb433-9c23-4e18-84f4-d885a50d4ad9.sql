
-- ============================================================
-- Faz 17: Notification + Email Outbox Infrastructure
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.notification_event_type AS ENUM (
    'registration_completed',
    'campaign_submitted',
    'campaign_revision_requested',
    'campaign_approved',
    'campaign_rejected',
    'campaign_published',
    'contribution_created',
    'payment_action_required',
    'payment_succeeded',
    'payment_failed',
    'payment_session_expired',
    'campaign_goal_reached',
    'campaign_failed',
    'refund_started',
    'refund_completed',
    'creator_transfer_started',
    'creator_transfer_completed',
    'creator_transfer_failed',
    'transfer_reversal_started',
    'transfer_reversal_completed',
    'provider_payout_observed',
    'provider_payout_failed',
    'campaign_update_published',
    'creator_comment_reply'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_outbox_status AS ENUM (
    'pending','processing','done','failed','skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_delivery_status AS ENUM (
    'queued','sent','failed','dead_letter','bounced','suppressed','pending_provider','skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. notification_outbox
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.notification_event_type NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  status public.notification_outbox_status NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_outbox_dedupe_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS notification_outbox_claim_idx
  ON public.notification_outbox (status, next_attempt_at)
  WHERE status IN ('pending','failed');

CREATE INDEX IF NOT EXISTS notification_outbox_entity_idx
  ON public.notification_outbox (entity_type, entity_id);

GRANT ALL ON public.notification_outbox TO service_role;
-- authenticated rolüne grant verilmedi; erişim yalnızca SECURITY DEFINER fonksiyonları üzerinden
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outbox_admin_read" ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 3. email_deliveries
CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid REFERENCES public.notification_outbox(id) ON DELETE SET NULL,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  template_name text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  status public.email_delivery_status NOT NULL DEFAULT 'queued',
  attempt_count int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_dedupe_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS email_deliveries_status_idx
  ON public.email_deliveries (status, next_attempt_at);

GRANT ALL ON public.email_deliveries TO service_role;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_deliveries_admin_read" ON public.email_deliveries
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_email boolean NOT NULL DEFAULT true,
  campaign_updates_email boolean NOT NULL DEFAULT true,
  marketing_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_self_select" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notification_preferences_self_upsert" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_preferences_self_update" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_notification_preferences()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_notification_preferences_touch ON public.notification_preferences;
CREATE TRIGGER trg_notification_preferences_touch
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_notification_preferences();

-- Auto-create preferences row on new auth user
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_create_notification_preferences ON auth.users;
CREATE TRIGGER trg_create_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();

-- Backfill existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 5. notify_enqueue
CREATE OR REPLACE FUNCTION public.notify_enqueue(
  p_event_type public.notification_event_type,
  p_entity_type text,
  p_entity_id uuid,
  p_recipient_user_id uuid,
  p_payload jsonb,
  p_dedupe_key text,
  p_correlation_id text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_recipient_user_id IS NULL OR p_dedupe_key IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notification_outbox (
    event_type, entity_type, entity_id, recipient_user_id,
    payload, dedupe_key, correlation_id
  ) VALUES (
    p_event_type, p_entity_type, p_entity_id, p_recipient_user_id,
    COALESCE(p_payload, '{}'::jsonb), p_dedupe_key, p_correlation_id
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.notify_enqueue(public.notification_event_type, text, uuid, uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_enqueue(public.notification_event_type, text, uuid, uuid, jsonb, text, text) TO service_role;

-- 6. notify_claim_batch (service_role only)
CREATE OR REPLACE FUNCTION public.notify_claim_batch(p_limit int DEFAULT 25)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS NOT NULL
     AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  UPDATE public.notification_outbox o
  SET status = 'processing', updated_at = now()
  WHERE o.id IN (
    SELECT id FROM public.notification_outbox
    WHERE status IN ('pending','failed')
      AND next_attempt_at <= now()
      AND attempt_count < 6
    ORDER BY next_attempt_at ASC
    LIMIT GREATEST(1, LEAST(p_limit, 100))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.*;
END $$;

REVOKE ALL ON FUNCTION public.notify_claim_batch(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_claim_batch(int) TO service_role;

-- 7. notify_mark_done / notify_mark_failed
CREATE OR REPLACE FUNCTION public.notify_mark_done(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notification_outbox
  SET status = 'done', updated_at = now(), last_error = NULL
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.notify_mark_failed(
  p_id uuid, p_error text, p_retriable boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attempt int;
BEGIN
  UPDATE public.notification_outbox
  SET attempt_count = attempt_count + 1,
      last_error = left(coalesce(p_error,''), 500),
      status = CASE
        WHEN p_retriable AND attempt_count + 1 < 6 THEN 'failed'::public.notification_outbox_status
        ELSE 'failed'::public.notification_outbox_status
      END,
      next_attempt_at = CASE
        WHEN p_retriable THEN now() + (power((attempt_count + 1)::numeric, 2) * interval '1 minute')
        ELSE now() + interval '100 years'
      END,
      updated_at = now()
  WHERE id = p_id
  RETURNING attempt_count INTO v_attempt;
END $$;

REVOKE ALL ON FUNCTION public.notify_mark_done(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_mark_done(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.notify_mark_failed(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_mark_failed(uuid, text, boolean) TO service_role;

-- 8. Preferences RPCs
CREATE OR REPLACE FUNCTION public.get_notification_preferences()
RETURNS public.notification_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.notification_preferences (user_id) VALUES (v_uid)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_row FROM public.notification_preferences WHERE user_id = v_uid;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.get_notification_preferences() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_notification_preferences(
  p_campaign_updates_email boolean,
  p_marketing_email boolean
) RETURNS public.notification_preferences
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.notification_preferences;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.notification_preferences (user_id, campaign_updates_email, marketing_email)
  VALUES (v_uid, p_campaign_updates_email, p_marketing_email)
  ON CONFLICT (user_id) DO UPDATE
    SET campaign_updates_email = EXCLUDED.campaign_updates_email,
        marketing_email = EXCLUDED.marketing_email,
        updated_at = now();
  SELECT * INTO v_row FROM public.notification_preferences WHERE user_id = v_uid;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.update_notification_preferences(boolean, boolean) TO authenticated;

-- 9. Unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.notifications
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- 10. Triggers for business state changes -> notify_enqueue
-- 10a. payment_transactions
CREATE OR REPLACE FUNCTION public.trg_payment_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.notification_event_type;
  v_backer uuid;
  v_campaign uuid;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  v_event := CASE NEW.status
    WHEN 'captured' THEN 'payment_succeeded'::public.notification_event_type
    WHEN 'paid' THEN 'payment_succeeded'::public.notification_event_type
    WHEN 'failed' THEN 'payment_failed'::public.notification_event_type
    WHEN 'cancelled' THEN 'payment_failed'::public.notification_event_type
    WHEN 'expired' THEN 'payment_session_expired'::public.notification_event_type
    WHEN 'action_required' THEN 'payment_action_required'::public.notification_event_type
    ELSE NULL
  END;
  IF v_event IS NULL THEN RETURN NEW; END IF;

  SELECT c.backer_id, c.campaign_id INTO v_backer, v_campaign
  FROM public.contributions c WHERE c.id = NEW.contribution_id;
  IF v_backer IS NULL THEN RETURN NEW; END IF;

  v_payload := jsonb_build_object(
    'contribution_id', NEW.contribution_id,
    'campaign_id', v_campaign,
    'amount_minor', NEW.amount_minor,
    'currency', NEW.currency,
    'environment', NEW.environment
  );

  PERFORM public.notify_enqueue(
    v_event, 'payment_transaction', NEW.id, v_backer, v_payload,
    v_event::text || ':' || NEW.id::text || ':' || v_backer::text,
    NULL
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payment_notify ON public.payment_transactions;
CREATE TRIGGER trg_payment_notify
  AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_payment_notify();

-- 10b. refunds
CREATE OR REPLACE FUNCTION public.trg_refund_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.notification_event_type;
  v_backer uuid;
  v_campaign uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'refund_started';
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'succeeded' THEN
    v_event := 'refund_completed';
  ELSE
    RETURN NEW;
  END IF;

  SELECT c.backer_id, c.campaign_id INTO v_backer, v_campaign
  FROM public.contributions c WHERE c.id = NEW.contribution_id;
  IF v_backer IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_enqueue(
    v_event, 'refund', NEW.id, v_backer,
    jsonb_build_object(
      'refund_id', NEW.id,
      'campaign_id', v_campaign,
      'amount_minor', NEW.amount_minor,
      'currency', 'TRY'
    ),
    v_event::text || ':' || NEW.id::text || ':' || v_backer::text,
    NULL
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_refund_notify ON public.refunds;
CREATE TRIGGER trg_refund_notify
  AFTER INSERT OR UPDATE OF status ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.trg_refund_notify();

-- 10c. creator_transfers
CREATE OR REPLACE FUNCTION public.trg_transfer_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.notification_event_type;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  v_event := CASE NEW.status
    WHEN 'in_transit' THEN 'creator_transfer_started'::public.notification_event_type
    WHEN 'paid' THEN 'creator_transfer_completed'::public.notification_event_type
    WHEN 'failed' THEN 'creator_transfer_failed'::public.notification_event_type
    ELSE NULL
  END;
  IF v_event IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_enqueue(
    v_event, 'creator_transfer', NEW.id, NEW.creator_id,
    jsonb_build_object(
      'transfer_id', NEW.id,
      'campaign_id', NEW.campaign_id,
      'amount_minor', NEW.amount_minor,
      'currency', NEW.currency,
      'environment', NEW.environment
    ),
    v_event::text || ':' || NEW.id::text || ':' || NEW.creator_id::text,
    NULL
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_transfer_notify ON public.creator_transfers;
CREATE TRIGGER trg_transfer_notify
  AFTER INSERT OR UPDATE OF status ON public.creator_transfers
  FOR EACH ROW EXECUTE FUNCTION public.trg_transfer_notify();

-- 10d. campaigns (status changes)
CREATE OR REPLACE FUNCTION public.trg_campaign_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.notification_event_type;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;
  v_event := CASE NEW.status
    WHEN 'approved' THEN 'campaign_approved'::public.notification_event_type
    WHEN 'rejected' THEN 'campaign_rejected'::public.notification_event_type
    WHEN 'revision_requested' THEN 'campaign_revision_requested'::public.notification_event_type
    WHEN 'live' THEN 'campaign_published'::public.notification_event_type
    WHEN 'successful' THEN 'campaign_goal_reached'::public.notification_event_type
    WHEN 'failed' THEN 'campaign_failed'::public.notification_event_type
    ELSE NULL
  END;
  IF v_event IS NULL THEN RETURN NEW; END IF;

  PERFORM public.notify_enqueue(
    v_event, 'campaign', NEW.id, NEW.creator_id,
    jsonb_build_object(
      'campaign_id', NEW.id,
      'slug', NEW.slug,
      'title', NEW.title
    ),
    v_event::text || ':' || NEW.id::text || ':' || NEW.creator_id::text,
    NULL
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_campaign_notify ON public.campaigns;
CREATE TRIGGER trg_campaign_notify
  AFTER UPDATE OF status ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.trg_campaign_notify();
