import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/social/api";

export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications", "me"],
    queryFn: api.listMyNotifications,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "me"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notifications", "me"] });
      if (n > 0) toast.success(`${n} bildirim okundu olarak işaretlendi.`);
    },
  });
}
