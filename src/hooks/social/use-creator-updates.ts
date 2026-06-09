import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/social/api";

export function useCreatorUpdates(campaignId: string) {
  return useQuery({
    queryKey: ["creator-updates", campaignId],
    queryFn: () => api.listCreatorUpdates(campaignId),
    staleTime: 15_000,
  });
}

export function usePublishUpdate(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; body: string }) =>
      api.publishCampaignUpdate({ campaignId, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-updates", campaignId] });
      toast.success("Güncelleme yayınlandı.");
    },
    onError: (err: Error) => {
      if (err.message.includes("BFL_INVALID_TITLE"))
        toast.error("Başlık 5-140 karakter olmalı.");
      else if (err.message.includes("BFL_INVALID_BODY"))
        toast.error("İçerik 20-20000 karakter olmalı.");
      else if (err.message.includes("BFL_INVALID_STATUS"))
        toast.error("Yalnız yayında veya başarılı kampanyada güncelleme yayınlanır.");
      else if (err.message.includes("BFL_FORBIDDEN")) toast.error("Yetkiniz yok.");
      else toast.error("Güncelleme yayınlanamadı.");
    },
  });
}

export function useEditUpdate(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { updateId: string; title: string; body: string }) =>
      api.editCampaignUpdate(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-updates", campaignId] });
      toast.success("Güncelleme düzenlendi.");
    },
    onError: () => toast.error("Güncelleme düzenlenemedi."),
  });
}
