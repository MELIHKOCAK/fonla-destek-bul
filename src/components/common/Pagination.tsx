import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const canPrev = safePage > 1;
  const canNext = safePage < safePageCount;

  return (
    <nav
      aria-label="Sayfalama"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canPrev}
        onClick={() => onPageChange(safePage - 1)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Önceki
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Sayfa <span className="font-medium text-foreground">{safePage}</span> / {safePageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canNext}
        onClick={() => onPageChange(safePage + 1)}
      >
        Sonraki
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}
