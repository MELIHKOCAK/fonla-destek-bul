
CREATE TABLE public.ai_chat_rate_limits (
  actor_key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ai_chat_rate_limits TO service_role;
ALTER TABLE public.ai_chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_ai_chat_request(
  _actor_key_hash text,
  _window_seconds integer,
  _max_requests integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_chat_rate_limits;
  v_now timestamptz := now();
  v_reset_at timestamptz;
  v_retry_after integer;
BEGIN
  IF _actor_key_hash IS NULL OR length(_actor_key_hash) = 0 THEN
    RAISE EXCEPTION 'actor_key_hash required';
  END IF;
  IF _window_seconds <= 0 OR _max_requests <= 0 THEN
    RAISE EXCEPTION 'invalid limits';
  END IF;

  SELECT * INTO v_row
  FROM public.ai_chat_rate_limits
  WHERE actor_key_hash = _actor_key_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.ai_chat_rate_limits (actor_key_hash, window_started_at, request_count, updated_at)
    VALUES (_actor_key_hash, v_now, 1, v_now);
    RETURN jsonb_build_object('result', 'allowed', 'remaining', _max_requests - 1);
  END IF;

  -- Pencere geçtiyse sıfırla.
  IF v_row.window_started_at + make_interval(secs => _window_seconds) <= v_now THEN
    UPDATE public.ai_chat_rate_limits
    SET window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    WHERE actor_key_hash = _actor_key_hash;
    RETURN jsonb_build_object('result', 'allowed', 'remaining', _max_requests - 1);
  END IF;

  IF v_row.request_count >= _max_requests THEN
    v_reset_at := v_row.window_started_at + make_interval(secs => _window_seconds);
    v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)))::integer);
    RETURN jsonb_build_object('result', 'rate_limited', 'retry_after_seconds', v_retry_after);
  END IF;

  UPDATE public.ai_chat_rate_limits
  SET request_count = v_row.request_count + 1,
      updated_at = v_now
  WHERE actor_key_hash = _actor_key_hash;

  RETURN jsonb_build_object('result', 'allowed', 'remaining', _max_requests - v_row.request_count - 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_chat_request(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_chat_request(text, integer, integer) TO service_role;
