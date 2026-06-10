CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','archived')),
  effective_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  content_url text,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads published legal docs" ON public.legal_documents
  FOR SELECT USING (status IN ('approved','published'));
CREATE POLICY "Admins read all legal docs" ON public.legal_documents
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins insert legal docs" ON public.legal_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update legal docs" ON public.legal_documents
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER legal_documents_set_updated_at BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.legal_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_slug text NOT NULL,
  document_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_slug, document_version)
);
GRANT SELECT ON public.legal_consents TO authenticated;
GRANT ALL ON public.legal_consents TO service_role;
ALTER TABLE public.legal_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own consents" ON public.legal_consents
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.release_gates (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  evidence_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.release_gates TO anon, authenticated;
GRANT ALL ON public.release_gates TO service_role;
ALTER TABLE public.release_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads release gates" ON public.release_gates
  FOR SELECT USING (true);
CREATE TRIGGER release_gates_set_updated_at BEFORE UPDATE ON public.release_gates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.release_gates (key, description) VALUES
  ('legal_documents_approved',        'Tüm hukuki belgeler hukukçu onayı ile published'),
  ('stripe_business_model_approved',  'Stripe iş modeli (reward-based crowdfunding) yazılı onayı'),
  ('stripe_platform_country_verified','BeniFonla tüzel kişiliği Stripe platform ülkesi uygun'),
  ('stripe_connect_model_verified',   'Stripe Connect separate charges/transfers modeli onayı'),
  ('stripe_live_account_verified',    'Stripe live hesabı doğrulanmış'),
  ('creator_agreement_approved',      'Creator sözleşmesi hukukçu onayı ile published'),
  ('production_payments_enabled',     'Live Stripe Checkout aktivasyonu'),
  ('production_creator_transfers_enabled', 'Live creator Transfer aktivasyonu')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_release_gate_open(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT enabled FROM public.release_gates WHERE key = p_key), false);
$$;
REVOKE EXECUTE ON FUNCTION public.is_release_gate_open(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_release_gate_open(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_legal_consent(
  p_document_slug text,
  p_document_version text,
  p_ip_hash text DEFAULT NULL,
  p_user_agent_hint text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT status INTO v_status FROM public.legal_documents
    WHERE slug = p_document_slug AND version = p_document_version;
  IF v_status IS NULL OR v_status NOT IN ('approved','published') THEN
    RAISE EXCEPTION 'legal doc % v% not publishable', p_document_slug, p_document_version USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.legal_consents (user_id, document_slug, document_version, ip_hash, user_agent_hint)
  VALUES (auth.uid(), p_document_slug, p_document_version, p_ip_hash, p_user_agent_hint)
  ON CONFLICT (user_id, document_slug, document_version)
  DO UPDATE SET accepted_at = excluded.accepted_at
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_legal_consent(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_legal_consent(text, text, text, text) TO authenticated;