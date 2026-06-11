
-- =========================================================
-- Campaign AI Summaries: schema, indexes, triggers, claim fn
-- =========================================================

-- 1. Enum
CREATE TYPE public.campaign_ai_summary_status AS ENUM (
  'generating',
  'completed',
  'failed',
  'stale'
);

-- 2. Campaigns: source version column
ALTER TABLE public.campaigns
  ADD COLUMN ai_summary_source_version bigint NOT NULL DEFAULT 1;

-- 3. campaign_ai_summaries
CREATE TABLE public.campaign_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  source_version bigint NOT NULL,
  source_hash text NOT NULL,
  prompt_version text NOT NULL,
  schema_version integer NOT NULL,
  model_identifier text,
  status public.campaign_ai_summary_status NOT NULL,
  summary_json jsonb,
  word_count integer,
  failure_code text,
  failure_message_masked text,
  generation_started_at timestamptz,
  generated_at timestamptz,
  stale_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_ai_summaries_lang_chk CHECK (language_code ~ '^[a-z]{2}(-[a-zA-Z0-9]{2,8})?$'),
  CONSTRAINT campaign_ai_summaries_word_count_chk
    CHECK (word_count IS NULL OR (word_count >= 0 AND word_count <= 2000))
);

GRANT ALL ON public.campaign_ai_summaries TO service_role;
ALTER TABLE public.campaign_ai_summaries ENABLE ROW LEVEL SECURITY;
-- No client policies: only service_role accesses this table.

CREATE INDEX campaign_ai_summaries_lookup_idx
  ON public.campaign_ai_summaries (campaign_id, language_code, status);

CREATE UNIQUE INDEX campaign_ai_summaries_one_generating_per_lang
  ON public.campaign_ai_summaries (campaign_id, language_code)
  WHERE status = 'generating';

CREATE UNIQUE INDEX campaign_ai_summaries_unique_completed_key
  ON public.campaign_ai_summaries (campaign_id, language_code, source_hash, prompt_version, schema_version)
  WHERE status = 'completed';

-- 4. Rate-limit table
CREATE TABLE public.campaign_ai_summary_rate_limits (
  actor_key_hash text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  last_generation_request_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_key_hash, campaign_id)
);

GRANT ALL ON public.campaign_ai_summary_rate_limits TO service_role;
ALTER TABLE public.campaign_ai_summary_rate_limits ENABLE ROW LEVEL SECURITY;

-- 5. Audit table (minimal)
CREATE TABLE public.campaign_ai_summary_audit (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL,
  language_code text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('guest','user','admin')),
  cache_hit boolean NOT NULL,
  result_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.campaign_ai_summary_audit TO service_role;
ALTER TABLE public.campaign_ai_summary_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX campaign_ai_summary_audit_campaign_idx
  ON public.campaign_ai_summary_audit (campaign_id, created_at DESC);

-- 6. updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_campaign_ai_summary_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_ai_summaries_touch_updated_at
  BEFORE UPDATE ON public.campaign_ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaign_ai_summary_updated_at();

CREATE TRIGGER campaign_ai_summary_rate_limits_touch_updated_at
  BEFORE UPDATE ON public.campaign_ai_summary_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaign_ai_summary_updated_at();

-- 7. Source-version bump on campaign content change
CREATE OR REPLACE FUNCTION public.bump_campaign_ai_summary_source_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.short_description IS DISTINCT FROM OLD.short_description)
     OR (NEW.story_content IS DISTINCT FROM OLD.story_content)
     OR (NEW.funds_usage_content IS DISTINCT FROM OLD.funds_usage_content)
     OR (NEW.timeline_content IS DISTINCT FROM OLD.timeline_content)
     OR (NEW.risks_content IS DISTINCT FROM OLD.risks_content)
     OR (NEW.category_id IS DISTINCT FROM OLD.category_id)
     OR (NEW.goal_amount_minor IS DISTINCT FROM OLD.goal_amount_minor)
     OR (NEW.currency IS DISTINCT FROM OLD.currency)
     OR (NEW.start_at IS DISTINCT FROM OLD.start_at)
     OR (NEW.end_at IS DISTINCT FROM OLD.end_at)
     OR (NEW.status IS DISTINCT FROM OLD.status)
  THEN
    NEW.ai_summary_source_version := COALESCE(OLD.ai_summary_source_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_bump_ai_summary_source_version
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.bump_campaign_ai_summary_source_version();

-- 8. Stale completed summaries when campaign content changes
CREATE OR REPLACE FUNCTION public.stale_campaign_ai_summaries_for_campaign(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.campaign_ai_summaries
     SET status = 'stale', stale_at = now()
   WHERE campaign_id = _campaign_id
     AND status = 'completed';
END;
$$;
REVOKE ALL ON FUNCTION public.stale_campaign_ai_summaries_for_campaign(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.tg_stale_summaries_on_campaign_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ai_summary_source_version IS DISTINCT FROM OLD.ai_summary_source_version THEN
    PERFORM public.stale_campaign_ai_summaries_for_campaign(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_stale_summaries_after_change
  AFTER UPDATE OF ai_summary_source_version ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_stale_summaries_on_campaign_change();

-- 9. Reward-tier changes → bump campaign source version + stale summaries
CREATE OR REPLACE FUNCTION public.tg_reward_tier_bump_campaign_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _campaign_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _campaign_id := OLD.campaign_id;
  ELSE
    _campaign_id := NEW.campaign_id;
  END IF;

  UPDATE public.campaigns
     SET ai_summary_source_version = ai_summary_source_version + 1
   WHERE id = _campaign_id;

  PERFORM public.stale_campaign_ai_summaries_for_campaign(_campaign_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER reward_tiers_bump_campaign_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.reward_tiers
  FOR EACH ROW EXECUTE FUNCTION public.tg_reward_tier_bump_campaign_summary();

-- 10. Atomic claim function
CREATE OR REPLACE FUNCTION public.claim_campaign_ai_summary_generation(
  _campaign_id uuid,
  _language_code text,
  _source_version bigint,
  _source_hash text,
  _prompt_version text,
  _schema_version integer,
  _actor_key_hash text,
  _rate_limit_seconds integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_completed public.campaign_ai_summaries%ROWTYPE;
  _existing_generating public.campaign_ai_summaries%ROWTYPE;
  _last_request timestamptz;
  _retry_after integer;
  _new_id uuid;
BEGIN
  -- 1) cache hit: matching completed
  SELECT * INTO _existing_completed
    FROM public.campaign_ai_summaries
   WHERE campaign_id = _campaign_id
     AND language_code = _language_code
     AND source_hash = _source_hash
     AND prompt_version = _prompt_version
     AND schema_version = _schema_version
     AND status = 'completed'
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'result', 'cache_hit',
      'summary_id', _existing_completed.id
    );
  END IF;

  -- 2) generating in progress for same campaign+language
  SELECT * INTO _existing_generating
    FROM public.campaign_ai_summaries
   WHERE campaign_id = _campaign_id
     AND language_code = _language_code
     AND status = 'generating'
   LIMIT 1;

  IF FOUND THEN
    -- timed out stale generation: > 2 minutes -> mark failed
    IF _existing_generating.generation_started_at IS NULL
       OR _existing_generating.generation_started_at < now() - interval '2 minutes' THEN
      UPDATE public.campaign_ai_summaries
         SET status = 'failed',
             failure_code = 'GENERATION_TIMEOUT'
       WHERE id = _existing_generating.id;
    ELSE
      RETURN jsonb_build_object(
        'result', 'generation_in_progress',
        'summary_id', _existing_generating.id
      );
    END IF;
  END IF;

  -- 3) rate limit
  SELECT last_generation_request_at INTO _last_request
    FROM public.campaign_ai_summary_rate_limits
   WHERE actor_key_hash = _actor_key_hash
     AND campaign_id = _campaign_id
   FOR UPDATE;

  IF FOUND THEN
    _retry_after := GREATEST(
      0,
      _rate_limit_seconds - EXTRACT(EPOCH FROM (now() - _last_request))::int
    );
    IF _retry_after > 0 THEN
      RETURN jsonb_build_object(
        'result', 'rate_limited',
        'retry_after_seconds', _retry_after
      );
    END IF;
  END IF;

  -- 4) start generation (insert + upsert rate-limit)
  INSERT INTO public.campaign_ai_summaries (
    campaign_id, language_code, source_version, source_hash,
    prompt_version, schema_version, status, generation_started_at
  )
  VALUES (
    _campaign_id, _language_code, _source_version, _source_hash,
    _prompt_version, _schema_version, 'generating', now()
  )
  RETURNING id INTO _new_id;

  INSERT INTO public.campaign_ai_summary_rate_limits
    (actor_key_hash, campaign_id, last_generation_request_at)
  VALUES (_actor_key_hash, _campaign_id, now())
  ON CONFLICT (actor_key_hash, campaign_id) DO UPDATE
    SET last_generation_request_at = EXCLUDED.last_generation_request_at;

  RETURN jsonb_build_object(
    'result', 'generation_started',
    'summary_id', _new_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_campaign_ai_summary_generation(
  uuid, text, bigint, text, text, integer, text, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_campaign_ai_summary_generation(
  uuid, text, bigint, text, text, integer, text, integer
) TO service_role;
