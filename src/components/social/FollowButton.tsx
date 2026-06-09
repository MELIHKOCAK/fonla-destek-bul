import { Bell, BellRing } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFollowStatus, useToggleFollow } from "@/hooks/social/use-favorite-follow";

export function FollowButton({ campaignId }: { campaignId: string }) {
  const { status } = useAuth();
  const nav = useNavigate();
  const q = useFollowStatus(campaignId);
  const m = useToggleFollow(campaignId);
  const active = Boolean(q.data);
  const onClick = () => {
    if (status !== "authenticated") {
      nav({ to: "/login" });
      return;
    }
    if (m.isPending) return;
    m.mutate();
  };
  return (
    <Button
      variant={active ? "default" : "outline"}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Takibi bırak" : "Güncellemeleri takip et"}
      disabled={m.isPending}
    >
      {active ? (
        <BellRing className="size-4" aria-hidden="true" />
      ) : (
        <Bell className="size-4" aria-hidden="true" />
      )}
      {active ? "Takip ediliyor" : "Takip et"}
    </Button>
  );
}
