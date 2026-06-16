-- Replace prior rate-limit table/RPC with combined minute+day usage tracker.
DROP FUNCTION IF EXISTS public.claim_ai_chat_request(text, integer, integer);
DROP TABLE IF EXISTS public.ai_chat_rate_limits;

CREATE TABLE public.ai_chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key_hash text NOT NULL UNIQUE,
  user_id uuid NULL,
  minute_window_started_at timestamptz NOT NULL DEFAULT now(),
  minute_request_count integer NOT NULL DEFAULT 0,
  day_window_started_at timestamptz NOT NULL DEFAULT now(),
  day_request_count integer NOT NULL DEFAULT 0,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_chat_usage_actor_key_hash_length CHECK (char_length(actor_key_hash) BETWEEN 16 AND 128),
  CONSTRAINT ai_chat_usage_minute_count_nonneg CHECK (minute_request_count >= 0),
  CONSTRAINT ai_chat_usage_day_count_nonneg CHECK (day_request_count >= 0)
);

CREATE INDEX ai_chat_usage_last_request_at_idx ON public.ai_chat_usage (last_request_at);

-- No GRANTs to anon/authenticated: only service_role (via RPC SECURITY DEFINER) writes here.
GRANT ALL ON public.ai_chat_usage TO service_role;

ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated have no direct table access; all writes go through
-- claim_ai_chat_request() which runs as SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- Atomic rate-limit RPC.
-- Authenticated (user_id NOT NULL): 10 req/minute, 100 req/day.
-- Guest        (user_id IS NULL ): 5 req/minute,  25 req/day.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_ai_chat_request(
  _actor_key_hash text,
  _user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_is_auth boolean := _user_id IS NOT NULL;
  v_min_max int := CASE WHEN _user_id IS NOT NULL THEN 10 ELSE 5 END;
  v_day_max int := CASE WHEN _user_id IS NOT NULL THEN 100 ELSE 25 END;
  v_row public.ai_chat_usage;
  v_min_start timestamptz;
  v_min_count int;
  v_day_start timestamptz;
  v_day_count int;
  v_retry int;
BEGIN
  IF _actor_key_hash IS NULL OR char_length(_actor_key_hash) < 16 THEN
    RAISE EXCEPTION 'invalid actor key hash' USING ERRCODE = '22023';
  END IF;

  -- Ensure row exists; idempotent.
  INSERT INTO public.ai_chat_usage (
    actor_key_hash, user_id,
    minute_window_started_at, minute_request_count,
    day_window_started_at, day_request_count,
    last_request_at
  )
  VALUES (
    _actor_key_hash, _user_id,
    v_now, 0,
    v_now, 0,
    v_now
  )
  ON CONFLICT (actor_key_hash) DO NOTHING;

  -- Lock row for atomic read-modify-write.
  SELECT * INTO v_row
  FROM public.ai_chat_usage
  WHERE actor_key_hash = _actor_key_hash
  FOR UPDATE;

  v_min_start := v_row.minute_window_started_at;
  v_min_count := v_row.minute_request_count;
  v_day_start := v_row.day_window_started_at;
  v_day_count := v_row.day_request_count;

  -- Reset expired windows.
  IF v_min_start < v_now - interval '60 seconds' THEN
    v_min_start := v_now;
    v_min_count := 0;
  END IF;
  IF v_day_start < v_now - interval '1 day' THEN
    v_day_start := v_now;
    v_day_count := 0;
  END IF;

  -- Enforce per-minute limit.
  IF v_min_count >= v_min_max THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_min_start + interval '60 seconds') - v_now)))::int
    );
    RETURN jsonb_build_object(
      'result', 'rate_limited',
      'scope', 'minute',
      'retry_after_seconds', v_retry,
      'is_authenticated', v_is_auth
    );
  END IF;

  -- Enforce per-day limit.
  IF v_day_count >= v_day_max THEN
    v_retry := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM ((v_day_start + interval '1 day') - v_now)))::int
    );
    RETURN jsonb_build_object(
      'result', 'rate_limited',
      'scope', 'day',
      'retry_after_seconds', v_retry,
      'is_authenticated', v_is_auth
    );
  END IF;

  -- Allowed: increment counters atomically.
  UPDATE public.ai_chat_usage
  SET
    user_id = COALESCE(_user_id, user_id),
    minute_window_started_at = v_min_start,
    minute_request_count = v_min_count + 1,
    day_window_started_at = v_day_start,
    day_request_count = v_day_count + 1,
    last_request_at = v_now,
    updated_at = v_now
  WHERE actor_key_hash = _actor_key_hash;

  RETURN jsonb_build_object(
    'result', 'allowed',
    'is_authenticated', v_is_auth,
    'minute_remaining', v_min_max - (v_min_count + 1),
    'day_remaining', v_day_max - (v_day_count + 1)
  );
END;
$$;

-- Lock down execution: only trusted server contexts may call it directly.
REVOKE ALL ON FUNCTION public.claim_ai_chat_request(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ai_chat_request(text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_chat_request(text, uuid) TO service_role;

-- updated_at trigger.
CREATE OR REPLACE FUNCTION public.ai_chat_usage_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_chat_usage_set_updated_at
BEFORE UPDATE ON public.ai_chat_usage
FOR EACH ROW EXECUTE FUNCTION public.ai_chat_usage_set_updated_at();
