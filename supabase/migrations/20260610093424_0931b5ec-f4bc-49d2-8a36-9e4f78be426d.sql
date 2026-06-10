-- Restrict payment_provider_configs to admins only (was: all authenticated)
DROP POLICY IF EXISTS ppc_authenticated_read ON public.payment_provider_configs;
CREATE POLICY ppc_admin_read
  ON public.payment_provider_configs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Restrict release_gates to admins only (was: anyone)
DROP POLICY IF EXISTS "Anyone reads release gates" ON public.release_gates;
CREATE POLICY release_gates_admin_read
  ON public.release_gates
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

REVOKE SELECT ON public.release_gates FROM anon;