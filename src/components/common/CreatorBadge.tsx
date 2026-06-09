import { BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types/campaign";

export interface CreatorBadgeProps {
  creator: Creator;
  size?: "sm" | "md";
  className?: string;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function CreatorBadge({ creator, size = "sm", className }: CreatorBadgeProps) {
  const avatarSize = size === "md" ? "h-8 w-8" : "h-6 w-6";
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Avatar className={avatarSize}>
        {creator.avatarUrl ? <AvatarImage src={creator.avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-xs">{initialsOf(creator.displayName)}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-foreground">{creator.displayName}</span>
      {creator.verified ? (
        <BadgeCheck className="size-4 text-primary" aria-label="Doğrulanmış creator" role="img" />
      ) : null}
    </div>
  );
}
