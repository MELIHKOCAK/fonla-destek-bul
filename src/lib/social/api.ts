import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CommentRow = Database["public"]["Tables"]["campaign_comments"]["Row"];
export type FollowRow = Database["public"]["Tables"]["campaign_follows"]["Row"];
export type ReportRow = Database["public"]["Tables"]["campaign_reports"]["Row"];
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
export type CampaignUpdateRow = Database["public"]["Tables"]["campaign_updates"]["Row"];

export type ReportReasonCode = "spam" | "inappropriate" | "policy" | "fraud" | "other";

export async function toggleFavorite(campaignId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_favorite", { _campaign_id: campaignId });
  if (error) throw error;
  return Boolean(data);
}

export async function isFavorited(campaignId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function toggleFollow(campaignId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("toggle_follow", { _campaign_id: campaignId });
  if (error) throw error;
  return Boolean(data);
}

export async function isFollowing(campaignId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("campaign_follows")
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listComments(campaignId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("campaign_comments")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createComment(input: {
  campaignId: string;
  parentId: string | null;
  body: string;
}): Promise<CommentRow> {
  const { data, error } = await supabase.rpc("create_comment", {
    _campaign_id: input.campaignId,
    _parent_id: input.parentId as unknown as string,
    _body: input.body,
  });
  if (error) throw error;
  return data as unknown as CommentRow;
}

export async function updateComment(commentId: string, body: string): Promise<CommentRow> {
  const { data, error } = await supabase.rpc("update_comment", {
    _comment_id: commentId,
    _body: body,
  });
  if (error) throw error;
  return data as unknown as CommentRow;
}

export async function softDeleteComment(commentId: string): Promise<CommentRow> {
  const { data, error } = await supabase.rpc("soft_delete_comment", { _comment_id: commentId });
  if (error) throw error;
  return data as unknown as CommentRow;
}

export async function adminHideComment(commentId: string, reason: string): Promise<CommentRow> {
  const { data, error } = await supabase.rpc("admin_hide_comment", {
    _comment_id: commentId,
    _reason: reason,
  });
  if (error) throw error;
  return data as unknown as CommentRow;
}

export async function reportTarget(input: {
  campaignId: string | null;
  commentId: string | null;
  reasonCode: ReportReasonCode;
  description: string | null;
}): Promise<ReportRow> {
  const { data, error } = await supabase.rpc("report_target", {
    _campaign_id: input.campaignId as unknown as string,
    _comment_id: input.commentId as unknown as string,
    _reason_code: input.reasonCode,
    _description: input.description as unknown as string,
  });
  if (error) throw error;
  return data as unknown as ReportRow;
}

export async function publishCampaignUpdate(input: {
  campaignId: string;
  title: string;
  body: string;
}): Promise<CampaignUpdateRow> {
  const { data, error } = await supabase.rpc("publish_campaign_update", {
    _campaign_id: input.campaignId,
    _title: input.title,
    _body: input.body,
  });
  if (error) throw error;
  return data as unknown as CampaignUpdateRow;
}

export async function editCampaignUpdate(input: {
  updateId: string;
  title: string;
  body: string;
}): Promise<CampaignUpdateRow> {
  const { data, error } = await supabase.rpc("creator_edit_update", {
    _update_id: input.updateId,
    _title: input.title,
    _body: input.body,
  });
  if (error) throw error;
  return data as unknown as CampaignUpdateRow;
}

export async function listMyNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_read", { _id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function listCreatorUpdates(campaignId: string): Promise<CampaignUpdateRow[]> {
  const { data, error } = await supabase
    .from("campaign_updates")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
