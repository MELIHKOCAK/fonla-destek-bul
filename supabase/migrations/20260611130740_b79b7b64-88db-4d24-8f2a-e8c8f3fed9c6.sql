-- Restrict anon access to profile preference columns. Public reads only expose display-safe columns.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, bio, avatar_path, website_url, location, is_public, created_at, updated_at)
  ON public.profiles TO anon;