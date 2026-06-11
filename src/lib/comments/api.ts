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
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_path: string | null;
}

export async function listCampaignComments(
  campaignId: string,
  limit = 50,
): Promise<CampaignCommentItem[]> {
  const { data, error } = await supabase
    .from("campaign_comments")
    .select("id, author_id, body, created_at")
    .eq("campaign_id", campaignId)
    .eq("status", "visible")
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new CommentApiError("Yorumlar yüklenemedi.", error);

  const rows = (data ?? []) as CommentRow[];
  if (rows.length === 0) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_path")
    .in("id", authorIds);

  const profileMap = new Map<string, ProfileRow>(
    ((profileRows ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  return rows.map((r) => {
    const p = profileMap.get(r.author_id);
    return {
      id: r.id,
      authorId: r.author_id,
      authorName: p?.display_name ?? p?.username ?? "Kullanıcı",
      authorAvatarUrl: p?.avatar_path ?? null,
      body: r.body,
      createdAt: r.created_at,
    };
  });
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
