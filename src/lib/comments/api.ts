import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const commentBodySchema = z
  .string()
  .trim()
  .min(2, "Yorum en az 2 karakter olmalı.")
  .max(2000, "Yorum en fazla 2000 karakter olabilir.");

export interface CampaignCommentItem {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  body: string;
  createdAt: string;
}

export class CommentApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CommentApiError";
  }
}

interface CommentRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export async function listCampaignComments(
  campaignId: string,
  limit = 50,
): Promise<CampaignCommentItem[]> {
  const { data, error } = await supabase
    .from("campaign_comments")
    .select(
      "id, author_id, body, created_at, author:profiles!campaign_comments_author_id_fkey(display_name, username, avatar_url)",
    )
    .eq("campaign_id", campaignId)
    .eq("status", "visible")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new CommentApiError("Yorumlar yüklenemedi.", error);

  const rows = (data ?? []) as unknown as CommentRow[];
  return rows.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: r.author?.display_name ?? r.author?.username ?? "Kullanıcı",
    authorAvatarUrl: r.author?.avatar_url ?? null,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function addCampaignComment(params: {
  campaignId: string;
  body: string;
}): Promise<void> {
  const body = commentBodySchema.parse(params.body);
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new CommentApiError("Yorum yapmak için giriş yapın.");

  const { error } = await supabase.from("campaign_comments").insert({
    campaign_id: params.campaignId,
    author_id: userId,
    body,
    status: "visible",
  });
  if (error) throw new CommentApiError("Yorum gönderilemedi.", error);
}
