
CREATE INDEX IF NOT EXISTS campaigns_public_status_published_idx
  ON public.campaigns (status, published_at DESC NULLS LAST)
  WHERE status IN ('live','successful','paid_out');

CREATE INDEX IF NOT EXISTS campaigns_public_end_at_idx
  ON public.campaigns (end_at)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS campaigns_title_trgm_idx
  ON public.campaigns USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS campaigns_short_desc_trgm_idx
  ON public.campaigns USING gin (short_description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS contributions_campaign_captured_idx
  ON public.contributions (campaign_id) WHERE status = 'captured';

CREATE OR REPLACE FUNCTION public.get_public_campaigns(
  _q text DEFAULT NULL,
  _category_slugs text[] DEFAULT NULL,
  _funded_min numeric DEFAULT NULL,
  _funded_max numeric DEFAULT NULL,
  _ending_within_days integer DEFAULT NULL,
  _statuses text[] DEFAULT NULL,
  _sort text DEFAULT 'newest',
  _limit integer DEFAULT 12,
  _offset integer DEFAULT 0
) RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  short_description text,
  cover_storage_path text,
  cover_external_url text,
  creator_username text,
  creator_display_name text,
  creator_avatar_path text,
  category_slug text,
  category_name text,
  goal_amount_minor bigint,
  raised_amount_minor bigint,
  backer_count bigint,
  currency character(3),
  start_at timestamptz,
  end_at timestamptz,
  status public.campaign_status,
  published_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _q_norm text := NULLIF(trim(_q), '');
  _allowed_statuses public.campaign_status[];
  _sort_norm text := lower(coalesce(_sort, 'newest'));
  _lim integer := LEAST(GREATEST(coalesce(_limit, 12), 1), 48);
  _off integer := GREATEST(coalesce(_offset, 0), 0);
BEGIN
  IF _q_norm IS NOT NULL AND length(_q_norm) > 80 THEN
    _q_norm := substring(_q_norm from 1 for 80);
  END IF;

  IF _statuses IS NULL OR array_length(_statuses, 1) IS NULL THEN
    _allowed_statuses := ARRAY['live']::public.campaign_status[];
  ELSE
    SELECT array_agg(s::public.campaign_status)
      INTO _allowed_statuses
      FROM unnest(_statuses) AS s
     WHERE s IN ('live','successful');
    IF _allowed_statuses IS NULL OR array_length(_allowed_statuses,1) IS NULL THEN
      _allowed_statuses := ARRAY['live']::public.campaign_status[];
    END IF;
  END IF;

  IF _sort_norm NOT IN ('newest','popular','ending-soon','near-goal') THEN
    _sort_norm := 'newest';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT c.id AS campaign_id,
           COALESCE(SUM(co.amount_minor) FILTER (WHERE co.status = 'captured'), 0)::bigint AS raised,
           COUNT(DISTINCT co.backer_id) FILTER (WHERE co.status = 'captured')::bigint AS backers
      FROM public.campaigns c
      LEFT JOIN public.contributions co ON co.campaign_id = c.id
     WHERE c.status = ANY(_allowed_statuses)
     GROUP BY c.id
  ),
  base AS (
    SELECT c.id, c.slug, c.title, c.short_description,
           cm.storage_path AS cover_storage_path,
           cm.external_url AS cover_external_url,
           p.username::text AS creator_username,
           p.display_name AS creator_display_name,
           p.avatar_path AS creator_avatar_path,
           cat.slug AS category_slug,
           cat.name AS category_name,
           c.goal_amount_minor,
           a.raised AS raised_amount_minor,
           a.backers AS backer_count,
           c.currency,
           c.start_at,
           c.end_at,
           c.status,
           c.published_at,
           CASE WHEN c.goal_amount_minor > 0
                THEN (a.raised::numeric / c.goal_amount_minor::numeric) * 100
                ELSE 0
           END AS funded_pct
      FROM public.campaigns c
      JOIN agg a ON a.campaign_id = c.id
      JOIN public.categories cat ON cat.id = c.category_id
      LEFT JOIN public.profiles p ON p.id = c.creator_id AND p.is_public = true
      LEFT JOIN public.campaign_media cm ON cm.campaign_id = c.id AND cm.is_cover = true
     WHERE c.status = ANY(_allowed_statuses)
       AND (_category_slugs IS NULL OR array_length(_category_slugs,1) IS NULL OR cat.slug = ANY(_category_slugs))
       AND (
         _q_norm IS NULL
         OR c.title ILIKE '%' || _q_norm || '%'
         OR c.short_description ILIKE '%' || _q_norm || '%'
       )
  ),
  filtered AS (
    SELECT * FROM base
     WHERE (_funded_min IS NULL OR funded_pct >= _funded_min)
       AND (_funded_max IS NULL OR funded_pct <= _funded_max)
       AND (
         _ending_within_days IS NULL
         OR _ending_within_days <= 0
         OR (end_at IS NOT NULL
             AND end_at >= now()
             AND end_at <= now() + (_ending_within_days || ' days')::interval)
       )
  ),
  counted AS (
    SELECT *, count(*) OVER ()::bigint AS total_count FROM filtered
  )
  SELECT counted.id, counted.slug, counted.title, counted.short_description,
         counted.cover_storage_path, counted.cover_external_url,
         counted.creator_username, counted.creator_display_name, counted.creator_avatar_path,
         counted.category_slug, counted.category_name,
         counted.goal_amount_minor, counted.raised_amount_minor, counted.backer_count,
         counted.currency, counted.start_at, counted.end_at, counted.status, counted.published_at, counted.total_count
    FROM counted
   ORDER BY
     CASE WHEN _sort_norm = 'newest' THEN extract(epoch from coalesce(counted.published_at, counted.start_at, now())) END DESC NULLS LAST,
     CASE WHEN _sort_norm = 'popular' THEN counted.backer_count END DESC NULLS LAST,
     CASE WHEN _sort_norm = 'ending-soon' THEN extract(epoch from counted.end_at) END ASC NULLS LAST,
     CASE WHEN _sort_norm = 'near-goal' THEN LEAST(counted.funded_pct, 100) END DESC NULLS LAST,
     counted.id ASC
   LIMIT _lim OFFSET _off;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaigns(text, text[], numeric, numeric, integer, text[], text, integer, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_campaign_by_slug(_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  short_description text,
  story_content text,
  funds_usage_content text,
  timeline_content text,
  risks_content text,
  cover_storage_path text,
  cover_external_url text,
  creator_id uuid,
  creator_username text,
  creator_display_name text,
  creator_avatar_path text,
  category_slug text,
  category_name text,
  goal_amount_minor bigint,
  raised_amount_minor bigint,
  backer_count bigint,
  currency character(3),
  start_at timestamptz,
  end_at timestamptz,
  published_at timestamptz,
  status public.campaign_status
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT campaign_id,
           COALESCE(SUM(amount_minor) FILTER (WHERE status='captured'), 0)::bigint AS raised,
           COUNT(DISTINCT backer_id) FILTER (WHERE status='captured')::bigint AS backers
      FROM public.contributions
     WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE slug = _slug)
     GROUP BY campaign_id
  )
  SELECT c.id, c.slug, c.title, c.short_description,
         c.story_content, c.funds_usage_content, c.timeline_content, c.risks_content,
         cm.storage_path, cm.external_url,
         c.creator_id,
         p.username::text, p.display_name, p.avatar_path,
         cat.slug, cat.name,
         c.goal_amount_minor,
         COALESCE(a.raised, 0)::bigint,
         COALESCE(a.backers, 0)::bigint,
         c.currency, c.start_at, c.end_at, c.published_at, c.status
    FROM public.campaigns c
    JOIN public.categories cat ON cat.id = c.category_id
    LEFT JOIN public.profiles p ON p.id = c.creator_id AND p.is_public = true
    LEFT JOIN public.campaign_media cm ON cm.campaign_id = c.id AND cm.is_cover = true
    LEFT JOIN agg a ON a.campaign_id = c.id
   WHERE c.slug = _slug
     AND c.status IN ('live','successful','paid_out');
$$;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_by_slug(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_campaign_rewards(_campaign_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  amount_minor bigint,
  quantity_limit integer,
  estimated_delivery_date date,
  shipping_required boolean,
  sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.title, r.description, r.amount_minor, r.quantity_limit,
         r.estimated_delivery_date, r.shipping_required, r.sort_order
    FROM public.reward_tiers r
    JOIN public.campaigns c ON c.id = r.campaign_id
   WHERE r.campaign_id = _campaign_id
     AND r.is_active = true
     AND c.status IN ('live','successful','paid_out')
   ORDER BY r.sort_order, r.amount_minor;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_rewards(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_campaign_updates(_campaign_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  body_content text,
  published_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.title, u.body_content, u.published_at
    FROM public.campaign_updates u
    JOIN public.campaigns c ON c.id = u.campaign_id
   WHERE u.campaign_id = _campaign_id
     AND u.is_published = true
     AND c.status IN ('live','successful','paid_out')
   ORDER BY u.published_at DESC NULLS LAST;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_updates(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_campaign_media(_campaign_id uuid)
RETURNS TABLE(
  id uuid,
  media_type public.campaign_media_type,
  storage_path text,
  external_url text,
  alt_text text,
  sort_order integer,
  is_cover boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.media_type, m.storage_path, m.external_url, m.alt_text, m.sort_order, m.is_cover
    FROM public.campaign_media m
    JOIN public.campaigns c ON c.id = m.campaign_id
   WHERE m.campaign_id = _campaign_id
     AND c.status IN ('live','successful','paid_out')
   ORDER BY m.is_cover DESC, m.sort_order, m.created_at;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_campaign_media(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_categories()
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  description text,
  icon_name text,
  sort_order integer
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slug, name, description, icon_name, sort_order
    FROM public.categories
   WHERE is_active = true
   ORDER BY sort_order, name;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_categories() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_creator_profile(_username citext)
RETURNS TABLE(
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_path text,
  website_url text,
  location text,
  total_campaigns bigint,
  total_backers bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT id, username, display_name, bio, avatar_path, website_url, location
      FROM public.profiles
     WHERE username = _username AND is_public = true
  ),
  cstats AS (
    SELECT c.creator_id,
           count(*)::bigint AS total_campaigns,
           COALESCE(SUM(b.backers), 0)::bigint AS total_backers
      FROM public.campaigns c
      LEFT JOIN (
        SELECT campaign_id, COUNT(DISTINCT backer_id)::bigint AS backers
          FROM public.contributions WHERE status = 'captured'
         GROUP BY campaign_id
      ) b ON b.campaign_id = c.id
     WHERE c.status IN ('live','successful','paid_out')
       AND c.creator_id IN (SELECT id FROM p)
     GROUP BY c.creator_id
  )
  SELECT p.id, p.username::text, p.display_name, p.bio, p.avatar_path, p.website_url, p.location,
         COALESCE(cstats.total_campaigns, 0)::bigint,
         COALESCE(cstats.total_backers, 0)::bigint
    FROM p
    LEFT JOIN cstats ON cstats.creator_id = p.id;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_creator_profile(citext) TO anon, authenticated;
