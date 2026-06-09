import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/social/api";

export function useComments(campaignId: string) {
  return useQuery({
    queryKey: ["comments", campaignId],
    queryFn: () => api.listComments(campaignId),
    staleTime: 15_000,
  });
}

export function useCreateComment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; parentId: string | null }) =>
      api.createComment({ campaignId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaignId] });
      toast.success("Yorumunuz yayınlandı.");
    },
    onError: (err: Error) => toast.error(mapErr(err, "Yorum gönderilemedi.")),
  });
}

export function useEditComment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: string; body: string }) =>
      api.updateComment(input.commentId, input.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaignId] });
      toast.success("Yorum güncellendi.");
    },
    onError: (err: Error) => toast.error(mapErr(err, "Yorum güncellenemedi.")),
  });
}

export function useDeleteComment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.softDeleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaignId] });
      toast.success("Yorum silindi.");
    },
    onError: () => toast.error("Yorum silinemedi."),
  });
}

export function useAdminHideComment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { commentId: string; reason: string }) =>
      api.adminHideComment(input.commentId, input.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", campaignId] });
      toast.success("Yorum gizlendi.");
    },
    onError: () => toast.error("Yorum gizlenemedi."),
  });
}

export function useReportTarget() {
  return useMutation({
    mutationFn: api.reportTarget,
    onSuccess: () => toast.success("Şikâyetiniz alındı."),
    onError: (err: Error) => {
      if (err.message.includes("BFL_DUPLICATE_REPORT")) {
        toast.error("Bu içerik için açık bir şikâyetiniz zaten var.");
      } else {
        toast.error(mapErr(err, "Şikâyet gönderilemedi."));
      }
    },
  });
}

function mapErr(err: Error, fallback: string): string {
  const m = err.message;
  if (m.includes("BFL_RATE_LIMIT")) return "Çok hızlı yorum yapıyorsunuz, biraz bekleyin.";
  if (m.includes("BFL_INVALID_BODY")) return "Yorum 2-2000 karakter olmalı.";
  if (m.includes("BFL_EDIT_WINDOW_EXPIRED")) return "Düzenleme süresi (15 dk) doldu.";
  if (m.includes("BFL_FORBIDDEN")) return "Yetkiniz yok.";
  if (m.includes("BFL_CAMPAIGN_NOT_PUBLIC")) return "Bu kampanyada yorum yapılamaz.";
  if (m.includes("BFL_THREAD_TOO_DEEP")) return "Yanıt seviyesi sınırına ulaştı.";
  return fallback;
}
