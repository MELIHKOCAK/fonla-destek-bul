import type { Campaign, CampaignDetail, Category, Creator, RewardTier, CampaignUpdate, CampaignStatus } from "@/types/campaign";

interface PublicCampaignRow {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  cover_storage_path: string | null;
  cover_external_url: string | null;
  creator_username: string | null;
  creator_display_name: string | null;
  creator_avatar_path: string | null;
  category_slug: string;
  category_name: string;
  goal_amount_minor: number | string;
  raised_amount_minor: number | string;
  backer_count: number | string;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  published_at: string | null;
  total_count?: number | string;
}

interface PublicDetailRow extends PublicCampaignRow {
  creator_id: string | null;
  story_content: string | null;
  funds_usage_content: string | null;
  timeline_content: string | null;
  risks_content: string | null;
}

interface PublicRewardRow {
  id: string;
  title: string;
  description: string | null;
  amount_minor: number | string;
  quantity_limit: number | null;
  estimated_delivery_date: string | null;
  shipping_required: boolean;
  sort_order: number;
}

interface PublicUpdateRow {
  id: string;
  title: string;
  body_content: string;
  published_at: string | null;
}

/** Stable, deterministic gradient fallback when no cover image is available. */
function gradientFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = Math.abs(h) % 360;
  const b = (a + 60) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 75%), hsl(${b} 70% 55%))`;
}

export function coverBackground(id: string, coverUrl: string | null): string {
  if (coverUrl) return `url("${coverUrl}") center/cover no-repeat`;
  return gradientFromId(id);
}

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? Number(v) : v;
}

export function toCategory(row: { category_slug: string; category_name: string }): Category {
  return { id: row.category_slug, slug: row.category_slug, label: row.category_name };
}

export function toCreator(row: {
  creator_username: string | null;
  creator_display_name: string | null;
  creator_avatar_path: string | null;
  creator_id?: string | null;
}): Creator {
  return {
    id: row.creator_id ?? row.creator_username ?? "anon",
    username: row.creator_username ?? "anon",
    displayName: row.creator_display_name ?? row.creator_username ?? "Yaratıcı",
    avatarUrl: undefined,
    verified: false,
  };
}

export function toCampaign(row: PublicCampaignRow, coverUrl: string | null): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? "",
    coverImage: coverBackground(row.id, coverUrl),
    creator: toCreator(row),
    category: toCategory(row),
    raisedAmountMinor: toNum(row.raised_amount_minor),
    goalAmountMinor: toNum(row.goal_amount_minor),
    backerCount: toNum(row.backer_count),
    endDate: row.end_at ?? row.start_at ?? new Date().toISOString(),
    createdAt: row.published_at ?? row.start_at ?? new Date().toISOString(),
    status: row.status as CampaignStatus,
  };
}

export function toRewardTier(row: PublicRewardRow): RewardTier {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    priceMinor: toNum(row.amount_minor),
    estimatedDelivery: row.estimated_delivery_date ?? "Yakında",
    limit: row.quantity_limit ?? undefined,
    claimed: 0,
  };
}

export function toCampaignUpdate(row: PublicUpdateRow): CampaignUpdate {
  return {
    id: row.id,
    date: row.published_at ?? new Date().toISOString(),
    title: row.title,
    body: row.body_content,
  };
}

export function toCampaignDetail(
  row: PublicDetailRow,
  coverUrl: string | null,
  rewards: PublicRewardRow[],
  updates: PublicUpdateRow[],
): CampaignDetail {
  const base = toCampaign(row, coverUrl);
  return {
    ...base,
    creator: toCreator(row),
    story: row.story_content ?? "",
    fundsUsage: row.funds_usage_content ?? "",
    timeline: row.timeline_content ?? "",
    risks: row.risks_content ?? "",
    rewardTiers: rewards.map(toRewardTier),
    updates: updates.map(toCampaignUpdate),
    comments: [],
    faq: [],
  };
}

export type {
  PublicCampaignRow,
  PublicDetailRow,
  PublicRewardRow,
  PublicUpdateRow,
};
