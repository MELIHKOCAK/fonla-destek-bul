
-- 1) Drop the overly-permissive creator SELECT policy on contributions.
-- Creators must use the campaign_contributions_for_creator(campaign_id) RPC
-- which projects only the fulfillment-safe columns.
DROP POLICY IF EXISTS contributions_creator_read ON public.contributions;

-- 2) Allow backers to read refund rows for their own contributions.
DROP POLICY IF EXISTS refunds_backer_read ON public.refunds;
CREATE POLICY refunds_backer_read
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.contributions c
      WHERE c.id = refunds.contribution_id
        AND c.backer_id = auth.uid()
    )
  );

-- 3) Allow creators to read their own payout rows.
DROP POLICY IF EXISTS payouts_creator_read ON public.payouts;
CREATE POLICY payouts_creator_read
  ON public.payouts
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- 4) Creator-facing review notes via a SECURITY DEFINER view that exposes
-- ONLY the creator-safe columns (no internal admin `notes`).
DROP VIEW IF EXISTS public.creator_campaign_reviews;
CREATE VIEW public.creator_campaign_reviews
WITH (security_invoker = off) AS
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

-- 5) Storage: allow public read of avatar files when the owning profile is public.
-- Path convention: <user_id>/<file>. Match folder against profiles.id AND is_public.
DROP POLICY IF EXISTS "Avatars public profile read" ON storage.objects;
CREATE POLICY "Avatars public profile read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.is_public = true
        AND p.id::text = (storage.foldername(name))[1]
    )
  );
