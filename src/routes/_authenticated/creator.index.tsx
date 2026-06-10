import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoneyMinor } from "@/lib/format";
import { getCreatorOverview } from "@/lib/creator/creator.functions";
import type { CreatorOverview } from "@/lib/creator/types";

export const Route = createFileRoute("/_authenticated/creator/")({
  head: () => ({ meta: [{ title: "Yaratıcı Paneli — BeniFonla" }] }),
  component: CreatorOverviewPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="Yaratıcı paneli yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function CreatorOverviewPage() {
  const fetchOverview = useServerFn(getCreatorOverview);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "overview"],
    queryFn: () => fetchOverview() as Promise<CreatorOverview>,
    staleTime: 60_000,
  });

  const totalCampaigns = Object.values(data.status_distribution).reduce(
    (acc, n) => acc + n,
    0,
  );
  const account = data.payment_account;

  return (
    <DashboardLayout>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Yaratıcı paneli</h1>
          <p className="text-sm text-muted-foreground">Kampanyalarının özet durumu.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/creator/campaigns/new">Yeni kampanya</Link>
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Toplam kampanya" value={totalCampaigns} />
        <StatCard
          label="Aktif (live)"
          value={data.status_distribution.live ?? 0}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <StatCard
          label="İncelemede"
          value={data.status_distribution.pending_review ?? 0}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Revizyon bekliyor"
          value={data.pending_revision_count}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ödeme hesabı hazırlığı</CardTitle>
          <CardDescription>
            Bu özet yalnızca sana özeldir. Detaylı bilgi için ödeme hesabı sayfasına git.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {account ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={account.charges_enabled ? "default" : "secondary"}>
                  Tahsilat: {account.charges_enabled ? "Aktif" : "Pasif"}
                </Badge>
                <Badge variant={account.payouts_enabled ? "default" : "secondary"}>
                  Banka transferi: {account.payouts_enabled ? "Aktif" : "Pasif"}
                </Badge>
                <Badge variant="outline">Durum: {account.onboarding_status}</Badge>
              </div>
              {account.requirements_currently_due_count > 0 ? (
                <p className="text-amber-600">
                  {account.requirements_currently_due_count} gereksinim tamamlanmayı bekliyor.
                </p>
              ) : null}
              {account.disabled_reason ? (
                <p className="text-destructive">Kapatma nedeni: {account.disabled_reason}</p>
              ) : null}
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link to="/creator/payment-account">Ödeme hesabını yönet</Link>
              </Button>
            </>
          ) : (
            <EmptyState
              title="Ödeme hesabı yok"
              description="Bağışları teslim alabilmek için ödeme hesabı oluştur."
              action={{
                label: "Hesap oluştur",
                onClick: () => {
                  window.location.href = "/creator/payment-account";
                },
              }}
            />
          )}
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Aktif kampanyalar</h2>
        {data.campaigns.length === 0 ? (
          <EmptyState title="Aktif kampanya yok" />
        ) : (
          <ul className="space-y-2">
            {data.campaigns.map((c) => (
              <li key={c.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to="/_authenticated/creator/campaigns/$campaignId/overview"
                      params={{ campaignId: c.id }}
                      className="font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.backer_count} destekçi · {formatMoneyMinor(c.raised_minor)} / {formatMoneyMinor(c.goal_amount_minor)}
                    </p>
                  </div>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}
