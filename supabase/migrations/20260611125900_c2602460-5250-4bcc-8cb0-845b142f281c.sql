-- Tighten campaign_comments author UPDATE policy: authors cannot change status away from 'visible'.
DROP POLICY IF EXISTS campaign_comments_author_update ON public.campaign_comments;
CREATE POLICY campaign_comments_author_update
  ON public.campaign_comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() AND status = 'visible'::comment_status)
  WITH CHECK (author_id = auth.uid() AND status = 'visible'::comment_status);