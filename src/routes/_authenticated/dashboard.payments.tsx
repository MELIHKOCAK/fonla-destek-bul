import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatMoneyMinor } from "@/lib/format";
import { listMyPayments } from "@/lib/dashboard/dashboard.functions";
import type { UserPaymentRow } from "@/lib/dashboard/types";

const PAYMENT_LABEL: Record<UserPaymentRow["status"], string> = {
  initiated: "Başlatıldı",
  pending: "Bekliyor",
  authorized: "Yetkilendirildi",
  captured: "Başarılı",
  failed: "Başarısız",
  cancelled: "İptal",
  expired: "Süresi doldu",
  refunded: "İade",
};

export const Route = createFileRoute("/_authenticated/dashboard/payments")({
  head: () => ({ meta: [{ title: "Ödemelerim — BeniFonla" }] }),
  component: PaymentsPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="Ödemeler yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function PaymentsPage() {
  const fetchPayments = useServerFn(listMyPayments);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard", "payments"],
    queryFn: () => fetchPayments({ data: { limit: 50, offset: 0 } }) as Promise<UserPaymentRow[]>,
  });

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Ödemelerim</h1>
      {data.length === 0 ? (
        <EmptyState title="Ödeme kaydı yok" description="Henüz bir ödeme denemesi yapılmadı." />
      ) : (
        <ul className="space-y-2" aria-label="Ödeme geçmişi">
          {data.map((p) => (
            <li key={p.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.campaign_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("tr-TR")}
                    {" · "}Deneme #{p.attempt_number}
                  </p>
                  {p.failure_message_sanitized ? (
                    <p className="mt-1 text-xs text-destructive">{p.failure_message_sanitized}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-semibold">{formatMoneyMinor(p.amount_minor)}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline">{PAYMENT_LABEL[p.status]}</Badge>
                    {p.environment === "test" ? (
                      <Badge variant="secondary">Test</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
