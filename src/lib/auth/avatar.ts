import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";
const SIGN_EXPIRES_SEC = 60 * 60; // 1 hour

export async function getAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, SIGN_EXPIRES_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export { AVATAR_BUCKET };
