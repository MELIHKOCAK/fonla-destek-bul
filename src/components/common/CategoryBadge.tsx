import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/campaign";

export interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <Badge variant="outline" className={cn("bg-background/80 backdrop-blur", className)}>
      {category.label}
    </Badge>
  );
}
