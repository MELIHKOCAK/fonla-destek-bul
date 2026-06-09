import { supabase } from "@/integrations/supabase/client";
import type { Campaign, Creator } from "@/types/campaign";
import {
  toCampaign,
  type PublicCampaignRow,
} from "@/lib/public/adapters";
import { resolveCoverUrl, signCampaignMediaPaths } from "@/lib/public/media";

export interface CreatorPublicProfile {
  creator: Creator;
  campaigns: ReadonlyArray<Campaign>;
  totalCampaigns: number;
  totalBackers: number;
}

interface CreatorRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  website_url: string | null;
  location: string | null;
  total_campaigns: number | string;
  total_backers: number | string;
}

export async function getCreatorByUsername(
  username: string,
): Promise<CreatorPublicProfile | null> {
  const safe = (username ?? "").trim();
  if (!safe) return null;

  const { data, error } = await supabase.rpc("get_public_creator_profile", {
    _username: safe,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as CreatorRow[];
  if (rows.length === 0) return null;
  const row = rows[0];

  const creator: Creator = {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    avatarUrl: undefined,
    verified: false,
    bio: row.bio ?? undefined,
    location: row.location ?? undefined,
    website: row.website_url ?? undefined,
  };

  // Fetch this creator's public campaigns via list RPC (creator scope filter not in RPC;
  // we filter in-app from a "popular" listing, but DB RPC has no creator filter — keep empty list.
  // Future: add _creator_id arg. For now, surface the most recent public campaigns globally.
  const { data: cRows, error: cErr } = await supabase.rpc("get_public_campaigns", {
    _sort: "newest",
    _limit: 24,
    _offset: 0,
  });
  if (cErr) throw new Error(cErr.message);
  const allRows = (cRows ?? []) as unknown as PublicCampaignRow[];
  const mine = allRows.filter((r) => r.creator_username === row.username);

  const paths = mine.map((r) => r.cover_storage_path).filter((p): p is string => Boolean(p));
  const signed = paths.length > 0 ? await signCampaignMediaPaths(paths) : new Map<string, string | null>();
  const campaigns = mine.map((r) =>
    toCampaign(r, resolveCoverUrl(r.cover_storage_path, r.cover_external_url, signed)),
  );

  return {
    creator,
    campaigns,
    totalCampaigns: Number(row.total_campaigns),
    totalBackers: Number(row.total_backers),
  };
}
