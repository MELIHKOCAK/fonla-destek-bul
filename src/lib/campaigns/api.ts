import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignMediaRow = Database["public"]["Tables"]["campaign_media"]["Row"];
export type RewardTierRow = Database["public"]["Tables"]["reward_tiers"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export interface CampaignFull {
  campaign: CampaignRow;
  media: CampaignMediaRow[];
  rewardTiers: RewardTierRow[];
}

export async function listActiveCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaignDraft(params: {
  categoryId: string;
  title: string;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("create_campaign_draft", {
    _category_id: params.categoryId,
    _title: params.title,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export type CampaignDraftPatch = Partial<{
  title: string;
  short_description: string;
  story_content: string;
  funds_usage_content: string;
  timeline_content: string;
  risks_content: string;
  goal_amount_minor: number;
  start_at: string;
  end_at: string;
  category_id: string;
}>;

export async function updateCampaignDraft(params: {
  campaignId: string;
  lockVersion: number;
  patch: CampaignDraftPatch;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("update_campaign_draft", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
    _patch: params.patch as unknown as Database["public"]["Tables"]["campaigns"]["Row"]["short_description"] extends never
      ? never
      : Record<string, unknown>,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function submitCampaignForReview(params: {
  campaignId: string;
  lockVersion: number;
}): Promise<CampaignRow> {
  const { data, error } = await supabase.rpc("submit_campaign_for_review", {
    _campaign_id: params.campaignId,
    _expected_lock_version: params.lockVersion,
  });
  if (error) throw error;
  return data as unknown as CampaignRow;
}

export async function getCampaignFull(campaignId: string): Promise<CampaignFull | null> {
  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!campaign) return null;

  const [{ data: media, error: mErr }, { data: rewards, error: rErr }] = await Promise.all([
    supabase.from("campaign_media").select("*").eq("campaign_id", campaignId).order("sort_order"),
    supabase.from("reward_tiers").select("*").eq("campaign_id", campaignId).order("sort_order"),
  ]);
  if (mErr) throw mErr;
  if (rErr) throw rErr;

  return { campaign, media: media ?? [], rewardTiers: rewards ?? [] };
}

export async function listMyCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------- Reward tiers ----------

export interface RewardTierInput {
  title: string;
  description?: string | null;
  amount_minor: number;
  quantity_limit?: number | null;
  estimated_delivery_date?: string | null;
  shipping_required: boolean;
}

export async function addRewardTier(
  campaignId: string,
  input: RewardTierInput,
  sortOrder: number,
): Promise<RewardTierRow> {
  const { data, error } = await supabase
    .from("reward_tiers")
    .insert({
      campaign_id: campaignId,
      title: input.title,
      description: input.description ?? null,
      amount_minor: input.amount_minor,
      quantity_limit: input.quantity_limit ?? null,
      estimated_delivery_date: input.estimated_delivery_date ?? null,
      shipping_required: input.shipping_required,
      sort_order: sortOrder,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateRewardTier(
  id: string,
  patch: Partial<RewardTierInput> & { is_active?: boolean; sort_order?: number },
): Promise<RewardTierRow> {
  const { data, error } = await supabase
    .from("reward_tiers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deactivateRewardTier(id: string): Promise<void> {
  const { error } = await supabase.from("reward_tiers").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

// ---------- Media ----------

export async function uploadCampaignImage(params: {
  campaignId: string;
  file: File;
  isCover: boolean;
  sortOrder: number;
}): Promise<CampaignMediaRow> {
  const { campaignId, file, isCover, sortOrder } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("campaign-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  // Eğer cover olarak işaretlenecekse, mevcut cover'ı kaldır.
  if (isCover) {
    await supabase
      .from("campaign_media")
      .update({ is_cover: false })
      .eq("campaign_id", campaignId)
      .eq("is_cover", true);
  }

  const { data, error } = await supabase
    .from("campaign_media")
    .insert({
      campaign_id: campaignId,
      media_type: "image",
      storage_path: path,
      is_cover: isCover,
      sort_order: sortOrder,
      metadata: { original_name: file.name, size: file.size, type: file.type },
    })
    .select("*")
    .single();

  if (error) {
    // Orphan storage objesini temizle
    await supabase.storage.from("campaign-media").remove([path]);
    throw error;
  }
  return data;
}

export async function deleteCampaignMedia(media: CampaignMediaRow): Promise<void> {
  const { error } = await supabase.from("campaign_media").delete().eq("id", media.id);
  if (error) throw error;
  if (media.storage_path) {
    await supabase.storage.from("campaign-media").remove([media.storage_path]);
  }
}

export async function setCoverMedia(campaignId: string, mediaId: string): Promise<void> {
  // Önce mevcut cover'ı kaldır
  await supabase
    .from("campaign_media")
    .update({ is_cover: false })
    .eq("campaign_id", campaignId)
    .eq("is_cover", true);
  const { error } = await supabase
    .from("campaign_media")
    .update({ is_cover: true })
    .eq("id", mediaId);
  if (error) throw error;
}

export async function getMediaSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("campaign-media")
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
