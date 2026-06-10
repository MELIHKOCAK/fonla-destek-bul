import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreatorCampaignTabs } from "@/components/dashboard/CreatorCampaignTabs";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoneyMinor } from "@/lib/format";
import { getCreatorCampaignFinance } from "@/lib/creator/creator.functions";
import { CreatorCampaignNotFoundError, type CreatorFinance } from "@/lib/creator/types";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/finance",
)({
  head: () => ({ meta: [{ title: "Finans — BeniFonla" }] }),
  component: FinancePage,
  errorComponent: ({ error, reset }) => {
    if (error instanceof CreatorCampaignNotFoundError) throw notFound();
    return (
      <DashboardLayout>
        <ErrorState
          title="Finans bilgisi yüklenemedi"
          description={error instanceof Error ? error.message : undefined}
          retry={{ onClick: reset }}
        />
      </DashboardLayout>
    );
  },
  notFoundComponent: () => (
    <DashboardLayout>
      <ErrorState title="Kampanya bulunamadı" />
    </DashboardLayout>
  ),
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function FinancePage() {
  const { campaignId } = Route.useParams();
  const fetchFinance = useServerFn(getCreatorCampaignFinance);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "campaign", campaignId, "finance"],
    queryFn: () =>
      fetchFinance({ data: { campaignId } }) as Promise<CreatorFinance>,
  });

  const settlement = data.settlement;
  const transfer = data.latest_transfer;
  const payout = data.latest_provider_payout;

  return (
    <DashboardLayout>
      <CreatorCampaignTabs campaignId={campaignId} />
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Finans özeti</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Aşağıdaki tutarlar Stripe Transfer (creator Stripe hesabına) ve banka Payout
        (Stripe hesabından banka hesabına) işlemlerini ayrı gösterir. Transfer tamamlandı
        olması banka hesabına ulaştığı anlamına gelmez.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Anlık tahmin</CardTitle>
            <CardDescription>Henüz finalize edilmemiş, captured destekler üzerinden hesap.</CardDescription>
          </CardHeader>
          <CardContent>
            <Row label="Brüt onaylı destek" value={formatMoneyMinor(data.estimate.gross_confirmed_minor)} />
            <Row label="İade edilen" value={formatMoneyMinor(data.estimate.refunded_minor)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settlement (finalize)</CardTitle>
            <CardDescription>Kampanya kapanışında hesaplanır.</CardDescription>
          </CardHeader>
          <CardContent>
            {settlement ? (
              <>
                <Row label="Brüt tutar" value={formatMoneyMinor(settlement.gross_amount_minor)} />
                <Row label="İade" value={formatMoneyMinor(settlement.refunded_amount_minor)} />
                <Row label="Stripe ücreti" value={formatMoneyMinor(settlement.provider_fee_amount_minor)} />
                <Row label="Platform ücreti" value={formatMoneyMinor(settlement.platform_fee_amount_minor)} />
                <Row label="Diğer kesintiler" value={formatMoneyMinor(settlement.other_deduction_amount_minor)} />
                <Row label="Creator'a aktarılabilir net tutar" value={formatMoneyMinor(settlement.net_amount_minor)} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Durum: <Badge variant="outline">{settlement.status}</Badge>
                  {settlement.environment === "test" ? " · Test ortamı" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz finalize edilmedi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stripe hesabına Transfer</CardTitle>
            <CardDescription>Platformdan creator Stripe hesabına yapılan aktarım.</CardDescription>
          </CardHeader>
          <CardContent>
            {transfer ? (
              <>
                <Row label="Tutar" value={formatMoneyMinor(transfer.amount_minor)} />
                <Row label="Durum" value={transfer.status} />
                <Row label="Başlatıldı" value={transfer.initiated_at ? new Date(transfer.initiated_at).toLocaleString("tr-TR") : "—"} />
                <Row label="Tamamlandı" value={transfer.completed_at ? new Date(transfer.completed_at).toLocaleString("tr-TR") : "—"} />
                {transfer.failure_message_sanitized ? (
                  <p className="mt-2 text-xs text-destructive">{transfer.failure_message_sanitized}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Henüz Transfer yapılmadı.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banka Payout'u</CardTitle>
            <CardDescription>Stripe hesabından banka hesabına yapılan ödeme. Stripe yönetir.</CardDescription>
          </CardHeader>
          <CardContent>
            {payout ? (
              <>
                <Row label="Tutar" value={formatMoneyMinor(payout.amount_minor)} />
                <Row label="Durum" value={payout.status} />
                <Row label="Hedef tarih" value={payout.arrival_date ?? "—"} />
                {payout.failure_message_sanitized ? (
                  <p className="mt-2 text-xs text-destructive">{payout.failure_message_sanitized}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Henüz banka Payout'u gözlemlenmedi.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
