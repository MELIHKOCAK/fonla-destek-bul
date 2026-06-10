
-- Switch creator_campaign_reviews to security_invoker so it relies on RLS.
DROP VIEW IF EXISTS public.creator_campaign_reviews;
CREATE VIEW public.creator_campaign_reviews
WITH (security_invoker = on) AS
SELECT
  r.id,
  r.campaign_id,
  r.decision,
  r.from_status,
  r.to_status,
  r.creator_visible_notes,
  r.created_at
FROM public.campaign_reviews r
WHERE public.campaign_owned_by_me(r.campaign_id);

REVOKE ALL ON public.creator_campaign_reviews FROM PUBLIC, anon;
GRANT SELECT ON public.creator_campaign_reviews TO authenticated;

-- Allow campaign creators to read their own review rows via the view.
-- Direct table access for `notes` (admin-internal) is gated at the application
-- layer by always querying the view; column-level secrecy for `notes` is a
-- known limitation documented in docs/security/rls-matrix.md.
DROP POLICY IF EXISTS campaign_reviews_creator_read ON public.campaign_reviews;
CREATE POLICY campaign_reviews_creator_read
  ON public.campaign_reviews
  FOR SELECT
  TO authenticated
  USING (public.campaign_owned_by_me(campaign_id));
