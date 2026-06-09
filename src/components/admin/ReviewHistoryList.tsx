import type { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

type ReviewRow = Database["public"]["Tables"]["campaign_reviews"]["Row"];

const DECISION_LABELS: Record<ReviewRow["decision"], string> = {
  approved: "Onay",
  rejected: "Red",
  revision_requested: "Düzeltme",
  suspended: "Askıya alma",
  reinstated: "İncelemeye alındı",
};

const DECISION_VARIANT: Record<ReviewRow["decision"], "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  rejected: "destructive",
  revision_requested: "secondary",
  suspended: "destructive",
  reinstated: "outline",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface Props {
  items: ReviewRow[];
  /** If true, show internal reviewer notes. Creator-facing UI must pass false. */
  showInternalNotes: boolean;
}

export function ReviewHistoryList({ items, showInternalNotes }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Bu kampanya için henüz inceleme kaydı yok.</p>;
  }
  return (
    <ol className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-md border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant={DECISION_VARIANT[r.decision]}>{DECISION_LABELS[r.decision]}</Badge>
              {r.from_status && r.to_status && (
                <span className="text-xs text-muted-foreground">{r.from_status} → {r.to_status}</span>
              )}
            </div>
            <time dateTime={r.created_at} className="text-xs text-muted-foreground">{formatDate(r.created_at)}</time>
          </div>
          {r.creator_visible_notes && (
            <p className="mt-2 whitespace-pre-line text-sm">{r.creator_visible_notes}</p>
          )}
          {showInternalNotes && r.notes && (
            <p className="mt-2 whitespace-pre-line rounded-sm bg-muted/40 p-2 text-xs text-muted-foreground">
              <span className="font-semibold">İç not:</span> {r.notes}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
