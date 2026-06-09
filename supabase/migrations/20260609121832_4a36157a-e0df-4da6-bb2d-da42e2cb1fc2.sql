
DROP VIEW IF EXISTS public.my_reports;
CREATE VIEW public.my_reports
WITH (security_invoker = true)
AS
  SELECT id, reporter_id, campaign_id, comment_id, reason_code, description,
         status, created_at, updated_at
    FROM public.campaign_reports
   WHERE reporter_id = auth.uid();
GRANT SELECT ON public.my_reports TO authenticated;
