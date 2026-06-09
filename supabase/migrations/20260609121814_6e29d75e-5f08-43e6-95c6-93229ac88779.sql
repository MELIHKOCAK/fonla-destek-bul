
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.comment_status AS ENUM ('visible','hidden_by_admin','deleted_by_author');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open','reviewing','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profile opt-out
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_follow_on_pledge boolean NOT NULL DEFAULT true;

-- campaign_updates edit history + edited_at
ALTER TABLE public.campaign_updates
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edit_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =========================
-- campaign_follows
-- =========================
CREATE TABLE IF NOT EXISTS public.campaign_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);
CREATE INDEX IF NOT EXISTS campaign_follows_campaign_idx ON public.campaign_follows(campaign_id);

GRANT SELECT, INSERT, DELETE ON public.campaign_follows TO authenticated;
GRANT ALL ON public.campaign_follows TO service_role;
ALTER TABLE public.campaign_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_follows_self_read ON public.campaign_follows;
CREATE POLICY campaign_follows_self_read ON public.campaign_follows
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS campaign_follows_self_insert ON public.campaign_follows;
CREATE POLICY campaign_follows_self_insert ON public.campaign_follows
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS campaign_follows_self_delete ON public.campaign_follows;
CREATE POLICY campaign_follows_self_delete ON public.campaign_follows
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =========================
-- campaign_comments
-- =========================
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.campaign_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  status public.comment_status NOT NULL DEFAULT 'visible',
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_comments_body_length CHECK (char_length(body) BETWEEN 0 AND 2000)
);
CREATE INDEX IF NOT EXISTS campaign_comments_campaign_idx ON public.campaign_comments(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_comments_author_idx ON public.campaign_comments(author_id);
CREATE INDEX IF NOT EXISTS campaign_comments_parent_idx ON public.campaign_comments(parent_id) WHERE parent_id IS NOT NULL;

GRANT SELECT ON public.campaign_comments TO anon, authenticated;
GRANT INSERT, UPDATE ON public.campaign_comments TO authenticated;
GRANT ALL ON public.campaign_comments TO service_role;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaign_comments_public_read ON public.campaign_comments;
CREATE POLICY campaign_comments_public_read ON public.campaign_comments
  FOR SELECT TO anon, authenticated
  USING (status = 'visible' AND public.campaign_is_public(campaign_id));

DROP POLICY IF EXISTS campaign_comments_author_read ON public.campaign_comments;
CREATE POLICY campaign_comments_author_read ON public.campaign_comments
  FOR SELECT TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS campaign_comments_admin_read ON public.campaign_comments;
CREATE POLICY campaign_comments_admin_read ON public.campaign_comments
  FOR SELECT TO authenticated USING (public.is_admin());

-- INSERT/UPDATE only through RPCs; restrict via WITH CHECK = false on direct write
-- We still need INSERT/UPDATE granted so SECURITY DEFINER functions work as caller? They use definer so no need.
-- Revoke direct write paths:
DROP POLICY IF EXISTS campaign_comments_no_direct_write ON public.campaign_comments;
-- Provide closed insert policy that allows author to insert visible comment on public campaign (defensive); RPC is preferred path
CREATE POLICY campaign_comments_author_insert ON public.campaign_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND status = 'visible'
    AND public.campaign_is_public(campaign_id)
  );

CREATE POLICY campaign_comments_author_update ON public.campaign_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND status = 'visible')
  WITH CHECK (author_id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS campaign_comments_set_updated_at ON public.campaign_comments;
CREATE TRIGGER campaign_comments_set_updated_at
  BEFORE UPDATE ON public.campaign_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Thread depth trigger: parent.parent_id must be NULL
CREATE OR REPLACE FUNCTION public.enforce_comment_thread_depth()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE _parent_parent uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT parent_id INTO _parent_parent FROM public.campaign_comments WHERE id = NEW.parent_id;
  IF _parent_parent IS NOT NULL THEN
    RAISE EXCEPTION 'BFL_THREAD_TOO_DEEP' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS campaign_comments_thread_depth ON public.campaign_comments;
CREATE TRIGGER campaign_comments_thread_depth
  BEFORE INSERT ON public.campaign_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_thread_depth();

-- =========================
-- campaign_reports
-- =========================
CREATE TABLE IF NOT EXISTS public.campaign_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.campaign_comments(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  description text,
  status public.report_status NOT NULL DEFAULT 'open',
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_reports_target_required CHECK (campaign_id IS NOT NULL OR comment_id IS NOT NULL),
  CONSTRAINT campaign_reports_reason_code CHECK (reason_code IN ('spam','inappropriate','policy','fraud','other')),
  CONSTRAINT campaign_reports_description_length CHECK (description IS NULL OR char_length(description) BETWEEN 10 AND 500)
);
CREATE INDEX IF NOT EXISTS campaign_reports_status_idx ON public.campaign_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_reports_campaign_idx ON public.campaign_reports(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_reports_comment_idx ON public.campaign_reports(comment_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_reports_open_dedupe_campaign
  ON public.campaign_reports(reporter_id, campaign_id) WHERE status='open' AND campaign_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_reports_open_dedupe_comment
  ON public.campaign_reports(reporter_id, comment_id) WHERE status='open' AND comment_id IS NOT NULL;

GRANT SELECT, INSERT ON public.campaign_reports TO authenticated;
GRANT ALL ON public.campaign_reports TO service_role;
ALTER TABLE public.campaign_reports ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS campaign_reports_set_updated_at ON public.campaign_reports;
CREATE TRIGGER campaign_reports_set_updated_at
  BEFORE UPDATE ON public.campaign_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS campaign_reports_reporter_read ON public.campaign_reports;
CREATE POLICY campaign_reports_reporter_read ON public.campaign_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS campaign_reports_admin_read ON public.campaign_reports;
CREATE POLICY campaign_reports_admin_read ON public.campaign_reports
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS campaign_reports_reporter_insert ON public.campaign_reports;
CREATE POLICY campaign_reports_reporter_insert ON public.campaign_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND (
      (campaign_id IS NOT NULL AND public.campaign_is_public(campaign_id))
      OR (comment_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.campaign_comments c
        WHERE c.id = comment_id AND public.campaign_is_public(c.campaign_id)
      ))
    )
  );

-- View hiding resolution_note for reporters
CREATE OR REPLACE VIEW public.my_reports AS
  SELECT id, reporter_id, campaign_id, comment_id, reason_code, description,
         status, created_at, updated_at
    FROM public.campaign_reports
   WHERE reporter_id = auth.uid();

GRANT SELECT ON public.my_reports TO authenticated;

-- =========================
-- RPCs
-- =========================

-- Favorite toggle
CREATE OR REPLACE FUNCTION public.toggle_favorite(_campaign_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _exists boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF NOT public.campaign_is_public(_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_PUBLIC' USING ERRCODE='42501';
  END IF;
  SELECT true INTO _exists FROM public.favorites WHERE user_id=_uid AND campaign_id=_campaign_id;
  IF _exists THEN
    DELETE FROM public.favorites WHERE user_id=_uid AND campaign_id=_campaign_id;
    RETURN false;
  ELSE
    INSERT INTO public.favorites(user_id, campaign_id) VALUES (_uid, _campaign_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.toggle_favorite(uuid) TO authenticated;

-- Follow toggle
CREATE OR REPLACE FUNCTION public.toggle_follow(_campaign_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _exists boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF NOT public.campaign_is_public(_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_PUBLIC' USING ERRCODE='42501';
  END IF;
  SELECT true INTO _exists FROM public.campaign_follows WHERE user_id=_uid AND campaign_id=_campaign_id;
  IF _exists THEN
    DELETE FROM public.campaign_follows WHERE user_id=_uid AND campaign_id=_campaign_id;
    RETURN false;
  ELSE
    INSERT INTO public.campaign_follows(user_id, campaign_id) VALUES (_uid, _campaign_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid) TO authenticated;

-- Auto follow on contribution captured
CREATE OR REPLACE FUNCTION public.auto_follow_on_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _opt boolean;
BEGIN
  IF NEW.status <> 'captured' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'captured' THEN RETURN NEW; END IF;
  SELECT auto_follow_on_pledge INTO _opt FROM public.profiles WHERE id = NEW.backer_id;
  IF COALESCE(_opt, true) THEN
    INSERT INTO public.campaign_follows(user_id, campaign_id)
    VALUES (NEW.backer_id, NEW.campaign_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS contributions_auto_follow ON public.contributions;
CREATE TRIGGER contributions_auto_follow
  AFTER INSERT OR UPDATE OF status ON public.contributions
  FOR EACH ROW EXECUTE FUNCTION public.auto_follow_on_contribution();

-- Create comment with rate limit
CREATE OR REPLACE FUNCTION public.create_comment(_campaign_id uuid, _parent_id uuid, _body text)
RETURNS public.campaign_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.campaign_comments;
  _b text := nullif(trim(_body),'');
  _recent int;
  _parent public.campaign_comments;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _b IS NULL OR char_length(_b) < 2 OR char_length(_b) > 2000 THEN
    RAISE EXCEPTION 'BFL_INVALID_BODY' USING ERRCODE='22023';
  END IF;
  IF NOT public.campaign_is_public(_campaign_id) THEN
    RAISE EXCEPTION 'BFL_CAMPAIGN_NOT_PUBLIC' USING ERRCODE='42501';
  END IF;
  IF _parent_id IS NOT NULL THEN
    SELECT * INTO _parent FROM public.campaign_comments WHERE id=_parent_id;
    IF NOT FOUND OR _parent.campaign_id <> _campaign_id THEN
      RAISE EXCEPTION 'BFL_PARENT_INVALID' USING ERRCODE='22023';
    END IF;
    IF _parent.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'BFL_THREAD_TOO_DEEP' USING ERRCODE='22023';
    END IF;
  END IF;
  SELECT count(*) INTO _recent FROM public.campaign_comments
    WHERE author_id=_uid AND created_at > now() - interval '60 seconds';
  IF _recent >= 5 THEN
    RAISE EXCEPTION 'BFL_RATE_LIMIT' USING ERRCODE='42901';
  END IF;
  INSERT INTO public.campaign_comments(campaign_id, author_id, parent_id, body)
  VALUES (_campaign_id, _uid, _parent_id, _b)
  RETURNING * INTO _row;
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.create_comment(uuid,uuid,text) TO authenticated;

-- Update (edit) own comment within window
CREATE OR REPLACE FUNCTION public.update_comment(_comment_id uuid, _body text)
RETURNS public.campaign_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _row public.campaign_comments; _b text := nullif(trim(_body),'');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _b IS NULL OR char_length(_b) < 2 OR char_length(_b) > 2000 THEN
    RAISE EXCEPTION 'BFL_INVALID_BODY' USING ERRCODE='22023';
  END IF;
  SELECT * INTO _row FROM public.campaign_comments WHERE id=_comment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _row.author_id <> _uid THEN RAISE EXCEPTION 'BFL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF _row.status <> 'visible' THEN RAISE EXCEPTION 'BFL_NOT_EDITABLE' USING ERRCODE='42501'; END IF;
  IF _row.created_at < now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'BFL_EDIT_WINDOW_EXPIRED' USING ERRCODE='42501';
  END IF;
  UPDATE public.campaign_comments
     SET body=_b, edited_at=now()
   WHERE id=_comment_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.update_comment(uuid,text) TO authenticated;

-- Soft delete own
CREATE OR REPLACE FUNCTION public.soft_delete_comment(_comment_id uuid)
RETURNS public.campaign_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _row public.campaign_comments;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  SELECT * INTO _row FROM public.campaign_comments WHERE id=_comment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _row.author_id <> _uid THEN RAISE EXCEPTION 'BFL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  UPDATE public.campaign_comments
     SET body='', status='deleted_by_author', edited_at=now()
   WHERE id=_comment_id RETURNING * INTO _row;
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_comment(uuid) TO authenticated;

-- Admin hide
CREATE OR REPLACE FUNCTION public.admin_hide_comment(_comment_id uuid, _reason text)
RETURNS public.campaign_comments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _row public.campaign_comments;
BEGIN
  PERFORM public._assert_admin();
  SELECT * INTO _row FROM public.campaign_comments WHERE id=_comment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  UPDATE public.campaign_comments
     SET status='hidden_by_admin', edited_at=now()
   WHERE id=_comment_id RETURNING * INTO _row;
  INSERT INTO public.audit_logs(entity_type, entity_id, action, actor_user_id, reason, after_data)
  VALUES ('comment', _comment_id, 'admin_hide', _uid, _reason, jsonb_build_object('status','hidden_by_admin'));
  -- Notify author
  INSERT INTO public.notifications(user_id, type, title, body, data, dedupe_key)
  VALUES (_row.author_id, 'comment_hidden',
          'Yorumunuz moderatör tarafından gizlendi',
          coalesce(_reason,''),
          jsonb_build_object('comment_id', _comment_id, 'campaign_id', _row.campaign_id),
          'comment_hidden:'||_comment_id::text)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_hide_comment(uuid,text) TO authenticated;

-- Notify on new comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _creator uuid; _parent_author uuid;
BEGIN
  SELECT creator_id INTO _creator FROM public.campaigns WHERE id = NEW.campaign_id;
  IF NEW.parent_id IS NULL THEN
    IF _creator IS NOT NULL AND _creator <> NEW.author_id THEN
      INSERT INTO public.notifications(user_id, type, title, body, data, dedupe_key)
      VALUES (_creator, 'comment_on_campaign',
              'Kampanyanıza yeni yorum',
              left(NEW.body, 140),
              jsonb_build_object('campaign_id', NEW.campaign_id, 'comment_id', NEW.id),
              'comment_on_campaign:'||NEW.id::text)
      ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    END IF;
  ELSE
    SELECT author_id INTO _parent_author FROM public.campaign_comments WHERE id = NEW.parent_id;
    IF _parent_author IS NOT NULL AND _parent_author <> NEW.author_id AND NEW.author_id = _creator THEN
      INSERT INTO public.notifications(user_id, type, title, body, data, dedupe_key)
      VALUES (_parent_author, 'creator_reply',
              'Kampanya sahibi yorumunuza yanıt verdi',
              left(NEW.body, 140),
              jsonb_build_object('campaign_id', NEW.campaign_id, 'comment_id', NEW.id),
              'creator_reply:'||NEW.id::text)
      ON CONFLICT (user_id, dedupe_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS campaign_comments_notify ON public.campaign_comments;
CREATE TRIGGER campaign_comments_notify
  AFTER INSERT ON public.campaign_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Publish campaign update with notification fan-out
CREATE OR REPLACE FUNCTION public.publish_campaign_update(_campaign_id uuid, _title text, _body text)
RETURNS public.campaign_updates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.campaign_updates;
  _t text := nullif(trim(_title),'');
  _b text := nullif(trim(_body),'');
  _camp public.campaigns;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _t IS NULL OR char_length(_t) < 5 OR char_length(_t) > 140 THEN
    RAISE EXCEPTION 'BFL_INVALID_TITLE' USING ERRCODE='22023';
  END IF;
  IF _b IS NULL OR char_length(_b) < 20 OR char_length(_b) > 20000 THEN
    RAISE EXCEPTION 'BFL_INVALID_BODY' USING ERRCODE='22023';
  END IF;
  SELECT * INTO _camp FROM public.campaigns WHERE id=_campaign_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _camp.creator_id <> _uid THEN RAISE EXCEPTION 'BFL_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF _camp.status NOT IN ('live','successful') THEN
    RAISE EXCEPTION 'BFL_INVALID_STATUS' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.campaign_updates(campaign_id, author_id, title, body_content, is_published, published_at)
  VALUES (_campaign_id, _uid, _t, _b, true, now())
  RETURNING * INTO _row;

  INSERT INTO public.notifications(user_id, type, title, body, data, dedupe_key)
  SELECT DISTINCT u, 'campaign_update', _camp.title, _t,
         jsonb_build_object('campaign_id', _campaign_id, 'update_id', _row.id),
         'campaign_update:'||_row.id::text||':'||u::text
    FROM (
      SELECT user_id AS u FROM public.campaign_follows WHERE campaign_id=_campaign_id
      UNION
      SELECT backer_id FROM public.contributions WHERE campaign_id=_campaign_id AND status='captured'
    ) s
   WHERE u <> _uid
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.publish_campaign_update(uuid,text,text) TO authenticated;

-- Edit published update (history append, no silent destructive change)
CREATE OR REPLACE FUNCTION public.creator_edit_update(_update_id uuid, _title text, _body text)
RETURNS public.campaign_updates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.campaign_updates;
  _t text := nullif(trim(_title),'');
  _b text := nullif(trim(_body),'');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _t IS NULL OR char_length(_t) < 5 OR char_length(_t) > 140 THEN
    RAISE EXCEPTION 'BFL_INVALID_TITLE' USING ERRCODE='22023';
  END IF;
  IF _b IS NULL OR char_length(_b) < 20 OR char_length(_b) > 20000 THEN
    RAISE EXCEPTION 'BFL_INVALID_BODY' USING ERRCODE='22023';
  END IF;
  SELECT * INTO _row FROM public.campaign_updates WHERE id=_update_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BFL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF _row.author_id <> _uid THEN RAISE EXCEPTION 'BFL_FORBIDDEN' USING ERRCODE='42501'; END IF;

  UPDATE public.campaign_updates
     SET title=_t, body_content=_b, edited_at=now(),
         edit_history = edit_history || jsonb_build_array(jsonb_build_object(
           'edited_at', now(), 'title', _row.title, 'body_content', _row.body_content
         ))
   WHERE id=_update_id RETURNING * INTO _row;
  INSERT INTO public.audit_logs(entity_type, entity_id, action, actor_user_id, after_data)
  VALUES ('campaign_update', _update_id, 'edit', _uid, jsonb_build_object('title',_t));
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.creator_edit_update(uuid,text,text) TO authenticated;

-- Report target
CREATE OR REPLACE FUNCTION public.report_target(
  _campaign_id uuid, _comment_id uuid, _reason_code text, _description text
) RETURNS public.campaign_reports LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.campaign_reports;
  _desc text := nullif(trim(_description),'');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  IF _reason_code NOT IN ('spam','inappropriate','policy','fraud','other') THEN
    RAISE EXCEPTION 'BFL_INVALID_REASON' USING ERRCODE='22023';
  END IF;
  IF _desc IS NOT NULL AND (char_length(_desc) < 10 OR char_length(_desc) > 500) THEN
    RAISE EXCEPTION 'BFL_INVALID_DESCRIPTION' USING ERRCODE='22023';
  END IF;
  IF _campaign_id IS NULL AND _comment_id IS NULL THEN
    RAISE EXCEPTION 'BFL_TARGET_REQUIRED' USING ERRCODE='22023';
  END IF;
  BEGIN
    INSERT INTO public.campaign_reports(reporter_id, campaign_id, comment_id, reason_code, description)
    VALUES (_uid, _campaign_id, _comment_id, _reason_code, _desc)
    RETURNING * INTO _row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'BFL_DUPLICATE_REPORT' USING ERRCODE='23505';
  END;
  -- Notify admins (best-effort, dedupe per report)
  INSERT INTO public.notifications(user_id, type, title, body, data, dedupe_key)
  SELECT ur.user_id, 'report_received', 'Yeni şikâyet alındı', _reason_code,
         jsonb_build_object('report_id', _row.id, 'campaign_id', _campaign_id, 'comment_id', _comment_id),
         'report_received:'||_row.id::text
    FROM public.user_roles ur WHERE ur.role='admin'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  RETURN _row;
END $$;
GRANT EXECUTE ON FUNCTION public.report_target(uuid,uuid,text,text) TO authenticated;

-- Mark notification read
CREATE OR REPLACE FUNCTION public.mark_notification_read(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  UPDATE public.notifications SET read_at = now()
   WHERE id = _id AND user_id = _uid AND read_at IS NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'BFL_NOT_AUTHENTICATED' USING ERRCODE='28000'; END IF;
  WITH upd AS (
    UPDATE public.notifications SET read_at = now()
     WHERE user_id = _uid AND read_at IS NULL
     RETURNING 1
  ) SELECT count(*) INTO _n FROM upd;
  RETURN COALESCE(_n,0);
END $$;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
