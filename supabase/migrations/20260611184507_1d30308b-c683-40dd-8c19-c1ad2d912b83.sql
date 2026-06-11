CREATE TYPE public.contact_message_status AS ENUM ('new', 'read', 'resolved');

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status public.contact_message_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_messages_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT contact_messages_email_length CHECK (char_length(email) BETWEEN 3 AND 255),
  CONSTRAINT contact_messages_subject_length CHECK (char_length(subject) BETWEEN 3 AND 150),
  CONSTRAINT contact_messages_message_length CHECK (char_length(message) BETWEEN 10 AND 2000)
);

CREATE INDEX contact_messages_status_idx ON public.contact_messages (status, created_at DESC);

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY contact_messages_public_insert ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND auth.uid() IS NULL)
    OR (user_id = auth.uid())
  );

CREATE POLICY contact_messages_admin_read ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY contact_messages_admin_update ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY contact_messages_admin_delete ON public.contact_messages
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER contact_messages_set_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();