import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatMoneyMinor } from "@/lib/format";
import { listMyRefunds } from "@/lib/dashboard/dashboard.functions";
import type { UserRefundRow } from "@/lib/dashboard/types";

const REFUND_LABEL: Record<UserRefundRow["status"], string> = {
  requested: "Talep edildi",
  processing: "İşleniyor",
  succeeded: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal",
};

export const Route = createFileRoute("/_authenticated/dashboard/refunds")({
  head: () => ({ meta: [{ title: "İadelerim — BeniFonla" }] }),
  component: RefundsPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="İadeler yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function RefundsPage() {
  const fetchRefunds = useServerFn(listMyRefunds);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard", "refunds"],
    queryFn: () => fetchRefunds({ data: { limit: 50, offset: 0 } }) as Promise<UserRefundRow[]>,
  });

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">İadelerim</h1>
      {data.length === 0 ? (
        <EmptyState title="İade yok" description="Henüz bir iade kaydın bulunmuyor." />
      ) : (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to="/campaigns/$slug"
                    params={{ slug: r.campaign_slug }}
                    className="font-medium hover:underline"
                  >
                    {r.campaign_title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Talep: {new Date(r.created_at).toLocaleString("tr-TR")}
                  </p>
                  {r.reason ? <p className="mt-1 text-xs">{r.reason}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-semibold">{formatMoneyMinor(r.amount_minor)}</p>
                  <Badge variant="outline">{REFUND_LABEL[r.status]}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
