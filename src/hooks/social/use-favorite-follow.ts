import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/social/api";

const favKey = (cid: string, uid: string | null) => ["favorite", cid, uid] as const;
const followKey = (cid: string, uid: string | null) => ["follow", cid, uid] as const;

export function useFavoriteStatus(campaignId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: favKey(campaignId, user?.id ?? null),
    enabled: !!user,
    queryFn: () => api.isFavorited(campaignId, user!.id),
    staleTime: 30_000,
  });
}

export function useToggleFavorite(campaignId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = favKey(campaignId, user?.id ?? null);
  return useMutation({
    mutationFn: () => api.toggleFavorite(campaignId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, !prev);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
      toast.error("Favori güncellenemedi.");
    },
    onSuccess: (next) => qc.setQueryData(key, next),
  });
}

export function useFollowStatus(campaignId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: followKey(campaignId, user?.id ?? null),
    enabled: !!user,
    queryFn: () => api.isFollowing(campaignId, user!.id),
    staleTime: 30_000,
  });
}

export function useToggleFollow(campaignId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = followKey(campaignId, user?.id ?? null);
  return useMutation({
    mutationFn: () => api.toggleFollow(campaignId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, !prev);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
      toast.error("Takip durumu güncellenemedi.");
    },
    onSuccess: (next) => qc.setQueryData(key, next),
  });
}
