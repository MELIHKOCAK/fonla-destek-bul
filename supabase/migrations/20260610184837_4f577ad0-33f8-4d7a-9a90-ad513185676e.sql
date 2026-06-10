CREATE OR REPLACE FUNCTION public.get_public_campaigns(_q text DEFAULT NULL::text, _category_slugs text[] DEFAULT NULL::text[], _funded_min numeric DEFAULT NULL::numeric, _funded_max numeric DEFAULT NULL::numeric, _ending_within_days integer DEFAULT NULL::integer, _statuses text[] DEFAULT NULL::text[], _sort text DEFAULT 'newest'::text, _limit integer DEFAULT 12, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, slug text, title text, short_description text, cover_storage_path text, cover_external_url text, creator_username text, creator_display_name text, creator_avatar_path text, category_slug text, category_name text, goal_amount_minor bigint, raised_amount_minor bigint, backer_count bigint, currency character, start_at timestamp with time zone, end_at timestamp with time zone, status campaign_status, published_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
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
    SELECT b.* FROM base b
     WHERE (_funded_min IS NULL OR b.funded_pct >= _funded_min)
       AND (_funded_max IS NULL OR b.funded_pct <= _funded_max)
       AND (
         _ending_within_days IS NULL
         OR _ending_within_days <= 0
         OR (b.end_at IS NOT NULL
             AND b.end_at >= now()
             AND b.end_at <= now() + (_ending_within_days || ' days')::interval)
       )
  ),
  counted AS (
    SELECT f.*, count(*) OVER ()::bigint AS total_count FROM filtered f
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
$function$;