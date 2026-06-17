-- Re-apply the rate-limit RPC; the prior migration created the table+trigger
-- but the function did not land in the database (verified via
-- information_schema.routines query). Table, RLS, and trigger remain untouched.

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

  SELECT * INTO v_row
  FROM public.ai_chat_usage
  WHERE actor_key_hash = _actor_key_hash
  FOR UPDATE;

  v_min_start := v_row.minute_window_started_at;
  v_min_count := v_row.minute_request_count;
  v_day_start := v_row.day_window_started_at;
  v_day_count := v_row.day_request_count;

  IF v_min_start < v_now - interval '60 seconds' THEN
    v_min_start := v_now;
    v_min_count := 0;
  END IF;
  IF v_day_start < v_now - interval '1 day' THEN
    v_day_start := v_now;
    v_day_count := 0;
  END IF;

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

REVOKE ALL ON FUNCTION public.claim_ai_chat_request(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_ai_chat_request(text, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_chat_request(text, uuid) TO service_role;