
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

  SELECT COALESCE(jsonb_object_agg(status_key, cnt), '{}'::jsonb) INTO v_status_dist
  FROM (
    SELECT
      CASE status::text
        WHEN 'under_review' THEN 'pending_review'
        WHEN 'revision_requested' THEN 'changes_requested'
        ELSE status::text
      END AS status_key,
      COUNT(*)::int AS cnt
    FROM public.campaigns
    WHERE creator_id = v_uid
    GROUP BY status_key
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
    AND ca.status IN (
      'live'::campaign_status,
      'under_review'::campaign_status,
      'successful'::campaign_status
    );

  SELECT COUNT(*)::int INTO v_pending_review
  FROM public.campaigns
  WHERE creator_id = v_uid
    AND status = 'revision_requested'::campaign_status;

  SELECT to_jsonb(cpa) INTO v_account
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
