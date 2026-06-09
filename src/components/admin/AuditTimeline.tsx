import type { Database } from "@/integrations/supabase/types";

type AuditRow = Database["public"]["Tables"]["audit_logs"]["Row"];

const ACTION_LABELS: Record<string, string> = {
  start_review: "İncelemeye alındı",
  request_revision: "Düzeltme istendi",
  approve: "Onaylandı",
  reject: "Reddedildi",
  suspend: "Askıya alındı",
  auto_publish: "Otomatik yayına alındı",
  submit_for_review: "İncelemeye gönderildi",
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AuditTimeline({ items }: { items: AuditRow[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz denetim kaydı yok.</p>;
  }
  return (
    <ol className="space-y-3">
      {items.map((row) => {
        const from = (row.before_data as { status?: string } | null)?.status;
        const to = (row.after_data as { status?: string } | null)?.status;
        return (
          <li key={row.id} className="rounded-md border border-border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{ACTION_LABELS[row.action] ?? row.action}</span>
              <time dateTime={row.created_at} className="text-xs text-muted-foreground">
                {formatDate(row.created_at)}
              </time>
            </div>
            {(from || to) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {from ? <span>{from}</span> : null}
                {from && to ? " → " : null}
                {to ? <span className="font-medium text-foreground">{to}</span> : null}
              </p>
            )}
            {row.reason && <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{row.reason}</p>}
          </li>
        );
      })}
    </ol>
  );
}
