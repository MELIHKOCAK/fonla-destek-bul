CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
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
      ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $function$;