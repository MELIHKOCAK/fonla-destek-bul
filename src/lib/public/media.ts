import { supabase } from "@/integrations/supabase/client";

const SIGN_TTL_SECONDS = 60 * 60; // 1h
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Batch-sign campaign-media storage paths. Falls back gracefully when signing fails.
 * Returns a Map(path -> signed URL or null).
 */
export async function signCampaignMediaPaths(
  paths: ReadonlyArray<string>,
): Promise<Map<string, string | null>> {
  const now = Date.now();
  const out = new Map<string, string | null>();
  const toFetch: string[] = [];

  for (const p of paths) {
    const cached = cache.get(p);
    if (cached && cached.expiresAt > now + 60_000) {
      out.set(p, cached.url);
    } else {
      toFetch.push(p);
    }
  }

  if (toFetch.length === 0) return out;

  const { data, error } = await supabase.storage
    .from("campaign-media")
    .createSignedUrls(toFetch, SIGN_TTL_SECONDS);

  if (error || !data) {
    for (const p of toFetch) out.set(p, null);
    return out;
  }

  const expiresAt = now + SIGN_TTL_SECONDS * 1000;
  for (const entry of data) {
    const path = entry.path ?? "";
    const url = entry.signedUrl ?? null;
    if (path && url) cache.set(path, { url, expiresAt });
    out.set(path, url);
  }
  return out;
}

export function resolveCoverUrl(
  storagePath: string | null,
  externalUrl: string | null,
  signed: Map<string, string | null>,
): string | null {
  if (externalUrl) return externalUrl;
  if (storagePath) return signed.get(storagePath) ?? null;
  return null;
}
