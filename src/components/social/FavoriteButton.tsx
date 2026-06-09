import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteStatus, useToggleFavorite } from "@/hooks/social/use-favorite-follow";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  campaignId,
  variant = "outline",
}: {
  campaignId: string;
  variant?: "outline" | "ghost" | "default";
}) {
  const { status } = useAuth();
  const nav = useNavigate();
  const q = useFavoriteStatus(campaignId);
  const m = useToggleFavorite(campaignId);
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
      variant={variant}
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      disabled={m.isPending}
    >
      <Heart
        className={cn("size-4", active && "fill-current text-rose-500")}
        aria-hidden="true"
      />
      {active ? "Favoride" : "Favoriye ekle"}
    </Button>
  );
}
