import { supabase } from "@/integrations/supabase/client";
import type { Campaign, CampaignDetail } from "@/types/campaign";
import {
  toCampaign,
  toCampaignDetail,
  type PublicCampaignRow,
  type PublicDetailRow,
  type PublicRewardRow,
  type PublicUpdateRow,
} from "@/lib/public/adapters";
import { resolveCoverUrl, signCampaignMediaPaths } from "@/lib/public/media";
import type { PublicCampaignQuery, PublicCampaignSort } from "@/lib/public/types";

export type CampaignSort = PublicCampaignSort;
export type CampaignQuery = PublicCampaignQuery;

export interface PaginatedResult<T> {
  items: ReadonlyArray<T>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 12;

class PublicCampaignServiceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "PublicCampaignServiceError";
  }
}

async function attachCovers(rows: PublicCampaignRow[]): Promise<Campaign[]> {
  const paths = rows
    .map((r) => r.cover_storage_path)
    .filter((p): p is string => Boolean(p));
  const signed = paths.length > 0 ? await signCampaignMediaPaths(paths) : new Map<string, string | null>();
  return rows.map((r) => toCampaign(r, resolveCoverUrl(r.cover_storage_path, r.cover_external_url, signed)));
}

async function callListRpc(query: CampaignQuery, pageSize: number, page: number) {
  const { data, error } = await supabase.rpc("get_public_campaigns", {
    _q: query.q?.trim() || undefined,
    _category_slugs: query.categorySlugs && query.categorySlugs.length > 0 ? [...query.categorySlugs] : undefined,
    _funded_min: typeof query.fundedMin === "number" ? query.fundedMin : undefined,
    _funded_max: typeof query.fundedMax === "number" ? query.fundedMax : undefined,
    _ending_within_days:
      typeof query.endingWithinDays === "number" && query.endingWithinDays > 0
        ? query.endingWithinDays
        : undefined,
    _statuses: query.statuses && query.statuses.length > 0 ? [...query.statuses] : undefined,
    _sort: query.sort ?? "newest",
    _limit: pageSize,
    _offset: (page - 1) * pageSize,
  });
  if (error) throw new PublicCampaignServiceError(error.message, error);
  return (data ?? []) as unknown as PublicCampaignRow[];
}

export async function getCampaigns(query: CampaignQuery = {}): Promise<PaginatedResult<Campaign>> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(48, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const rows = await callListRpc(query, pageSize, page);
  const total = rows.length > 0 ? Number((rows[0] as PublicCampaignRow & { total_count?: number }).total_count ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = await attachCovers(rows);
  return { items, total, page, pageSize, totalPages };
}

export async function getFeaturedCampaigns(limit = 4): Promise<ReadonlyArray<Campaign>> {
  // No featured flag in DB yet — surface "popular live" as featured.
  const rows = await callListRpc({ sort: "popular" }, Math.max(1, Math.min(12, limit)), 1);
  return attachCovers(rows);
}

export async function getNewCampaigns(limit = 6): Promise<ReadonlyArray<Campaign>> {
  const rows = await callListRpc({ sort: "newest" }, Math.max(1, Math.min(12, limit)), 1);
  return attachCovers(rows);
}

export async function getSuccessfulCampaigns(limit = 6): Promise<ReadonlyArray<Campaign>> {
  const rows = await callListRpc(
    { sort: "popular", statuses: ["successful"] },
    Math.max(1, Math.min(12, limit)),
    1,
  );
  return attachCovers(rows);
}

export async function getCampaignBySlug(slug: string): Promise<CampaignDetail | null> {
  const safe = (slug ?? "").trim();
  if (!safe) return null;

  const [detailRes, rewardsRes, updatesRes] = await Promise.all([
    supabase.rpc("get_public_campaign_by_slug", { _slug: safe }),
    // campaign_id is not known yet; fetch after detail
    Promise.resolve({ data: null as PublicRewardRow[] | null, error: null as null | { message: string } }),
    Promise.resolve({ data: null as PublicUpdateRow[] | null, error: null as null | { message: string } }),
  ]);

  if (detailRes.error) throw new PublicCampaignServiceError(detailRes.error.message, detailRes.error);
  const rows = (detailRes.data ?? []) as unknown as PublicDetailRow[];
  if (rows.length === 0) return null;
  const row = rows[0];

  const [rewards, updates] = await Promise.all([
    supabase.rpc("get_public_campaign_rewards", { _campaign_id: row.id }),
    supabase.rpc("get_public_campaign_updates", { _campaign_id: row.id }),
  ]);
  if (rewards.error) throw new PublicCampaignServiceError(rewards.error.message, rewards.error);
  if (updates.error) throw new PublicCampaignServiceError(updates.error.message, updates.error);

  const signed = row.cover_storage_path
    ? await signCampaignMediaPaths([row.cover_storage_path])
    : new Map<string, string | null>();
  const coverUrl = resolveCoverUrl(row.cover_storage_path, row.cover_external_url, signed);

  // Suppress unused destructure warnings
  void rewardsRes;
  void updatesRes;

  return toCampaignDetail(
    row,
    coverUrl,
    (rewards.data ?? []) as unknown as PublicRewardRow[],
    (updates.data ?? []) as unknown as PublicUpdateRow[],
  );
}
