import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { RejectReasonCode, RevisionIssueCode } from "./errors";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignMediaRow = Database["public"]["Tables"]["campaign_media"]["Row"];
export type RewardTierRow = Database["public"]["Tables"]["reward_tiers"]["Row"];
export type CampaignReviewRow = Database["public"]["Tables"]["campaign_reviews"]["Row"];
export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export type ReviewableStatus = "submitted" | "under_review" | "revision_requested";

export interface ReviewQueueItem {
  id: string;
  title: string;
  slug: string;
  status: CampaignRow["status"];
  goal_amount_minor: number;
  currency: string;
  submitted_at: string | null;
  updated_at: string;
  lock_version: number;
  category_id: string;
  creator_id: string;
  category_name: string | null;
  creator_display_name: string | null;
  creator_username: string | null;
  has_cover: boolean;
  rewards_count: number;
}

interface ListReviewQueueParams {
  status?: ReviewableStatus[];
  search?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

export async function listReviewQueue(params: ListReviewQueueParams = {}): Promise<{
  items: ReviewQueueItem[];
  total: number;
}> {
  const status = params.status?.length ? params.status : (["submitted", "under_review"] as ReviewableStatus[]);
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  let q = supabase
    .from("campaigns")
    .select(
      "id, title, slug, status, goal_amount_minor, currency, submitted_at, updated_at, lock_version, category_id, creator_id, categories(name), profiles!campaigns_creator_id_profiles_fkey(display_name, username)",
      { count: "exact" },
    )
    .in("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (params.categoryId) q = q.eq("category_id", params.categoryId);
  if (params.search && params.search.trim().length > 0) {
    q = q.ilike("title", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<
    Omit<ReviewQueueItem, "category_name" | "creator_display_name" | "creator_username" | "has_cover" | "rewards_count"> & {
      categories: { name: string | null } | null;
      profiles: { display_name: string | null; username: string | null } | null;
    }
  >;
  const ids = rows.map((r) => r.id);

  let coverIds = new Set<string>();
  let rewardCounts = new Map<string, number>();
  if (ids.length > 0) {
    const [{ data: mediaRows }, { data: rewardRows }] = await Promise.all([
      supabase.from("campaign_media").select("campaign_id").in("campaign_id", ids).eq("is_cover", true),
      supabase.from("reward_tiers").select("campaign_id, is_active").in("campaign_id", ids),
    ]);
    coverIds = new Set((mediaRows ?? []).map((m) => m.campaign_id));
    for (const r of rewardRows ?? []) {
      if (r.is_active) rewardCounts.set(r.campaign_id, (rewardCounts.get(r.campaign_id) ?? 0) + 1);
    }
  }

  const items: ReviewQueueItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    goal_amount_minor: r.goal_amount_minor,
    currency: r.currency,
    submitted_at: r.submitted_at,
    updated_at: r.updated_at,
    lock_version: r.lock_version,
    category_id: r.category_id,
    creator_id: r.creator_id,
    category_name: r.categories?.name ?? null,
    creator_display_name: r.profiles?.display_name ?? null,
    creator_username: r.profiles?.username ?? null,
    has_cover: coverIds.has(r.id),
    rewards_count: rewardCounts.get(r.id) ?? 0,
  }));

  return { items, total: count ?? items.length };
}

export interface ReviewDetail {
  campaign: CampaignRow;
  media: CampaignMediaRow[];
  rewardTiers: RewardTierRow[];
  creator: { id: string; display_name: string | null; username: string | null; avatar_path: string | null; bio: string | null } | null;
  category: { id: string; name: string; slug: string } | null;
  reviewHistory: CampaignReviewRow[];
  auditHistory: AuditLogRow[];
  validation: { ok: boolean; missing: string[] };
}

export async function getCampaignForReview(campaignId: string): Promise<ReviewDetail | null> {
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!campaign) return null;

  const [
    { data: media, error: mErr },
    { data: rewards, error: rErr },
    { data: profile, error: pErr },
    { data: category, error: cErr },
    { data: reviews, error: revErr },
    { data: audits, error: aErr },
  ] = await Promise.all([
    supabase.from("campaign_media").select("*").eq("campaign_id", campaignId).order("sort_order"),
    supabase.from("reward_tiers").select("*").eq("campaign_id", campaignId).order("sort_order"),
    supabase
      .from("profiles")
      .select("id, display_name, username, avatar_path, bio")
      .eq("id", campaign.creator_id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, slug").eq("id", campaign.category_id).maybeSingle(),
    supabase
      .from("campaign_reviews")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_type", "campaign")
      .eq("entity_id", campaignId)
      .order("created_at", { ascending: false }),
  ]);
  if (mErr) throw mErr;
  if (rErr) throw rErr;
  if (pErr) throw pErr;
  if (cErr) throw cErr;
  if (revErr) throw revErr;
  if (aErr) throw aErr;

  const missing: string[] = [];
  if (!campaign.title || campaign.title.length < 5) missing.push("title");
  if (!campaign.short_description || campaign.short_description.length < 40) missing.push("short_description");
  if (!campaign.story_content || campaign.story_content.length < 300) missing.push("story_content");
  if (!campaign.funds_usage_content || campaign.funds_usage_content.length < 100) missing.push("funds_usage_content");
  if (!campaign.timeline_content || campaign.timeline_content.length < 100) missing.push("timeline_content");
  if (!campaign.risks_content || campaign.risks_content.length < 100) missing.push("risks_content");
  if (!campaign.goal_amount_minor || campaign.goal_amount_minor < 100000 || campaign.goal_amount_minor > 500000000)
    missing.push("goal_amount_minor");
  if (!campaign.start_at) missing.push("start_at");
  if (!campaign.end_at) missing.push("end_at");
  if (!campaign.category_id) missing.push("category_id");
  if (!(media ?? []).some((m) => m.is_cover)) missing.push("cover_media");
  if (!(rewards ?? []).some((r) => r.is_active)) missing.push("reward_tiers");

  return {
    campaign,
    media: media ?? [],
    rewardTiers: rewards ?? [],
    creator: profile ?? null,
    category: category ?? null,
    reviewHistory: reviews ?? [],
    auditHistory: audits ?? [],
    validation: { ok: missing.length === 0, missing },
  };
}

export async function getAdminOverview(): Promise<{ submitted: number; underReview: number; revisionRequested: number; recentAudits: AuditLogRow[] }> {
  const [s, u, rr, recent] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "under_review"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "revision_requested"),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_type", "campaign")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (s.error) throw s.error;
  if (u.error) throw u.error;
  if (rr.error) throw rr.error;
  if (recent.error) throw recent.error;
  return {
    submitted: s.count ?? 0,
    underReview: u.count ?? 0,
    revisionRequested: rr.count ?? 0,
    recentAudits: recent.data ?? [],
  };
}

// ---------- Mutations ----------

export async function startCampaignReview(params: { campaignId: string; lockVersion: number }): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("start_campaign_review", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function requestCampaignRevision(params: {
  campaignId: string;
  lockVersion: number;
  creatorNote: string;
  issues: RevisionIssueCode[];
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("request_campaign_revision", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
    _creator_note: params.creatorNote,
    _issues: params.issues as unknown as Database["public"]["Functions"]["request_campaign_revision"]["Args"]["_issues"],
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function approveCampaign(params: {
  campaignId: string;
  lockVersion: number;
  internalNote?: string;
  creatorNote?: string;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("approve_campaign", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
    _internal_note: params.internalNote ?? undefined,
    _creator_note: params.creatorNote ?? undefined,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function rejectCampaign(params: {
  campaignId: string;
  lockVersion: number;
  reasonCode: RejectReasonCode;
  creatorNote: string;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("reject_campaign", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
    _reason_code: params.reasonCode,
    _creator_note: params.creatorNote,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function suspendCampaign(params: {
  campaignId: string;
  lockVersion: number;
  reason: string;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("suspend_campaign", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
    _reason: params.reason,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

// Creator-facing helpers
export async function getMyCampaignReviewHistory(campaignId: string): Promise<
  Database["public"]["Functions"]["creator_campaign_reviews"]["Returns"]
> {
  const { data, error } = await supabase.rpc("creator_campaign_reviews", { _campaign_id: campaignId });
  if (error) throw error;
  return data ?? [];
}
