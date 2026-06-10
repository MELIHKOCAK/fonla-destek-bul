import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreatorCampaignTabs } from "@/components/dashboard/CreatorCampaignTabs";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneyMinor } from "@/lib/format";
import { getCreatorCampaignAnalytics } from "@/lib/creator/creator.functions";
import { CreatorCampaignNotFoundError, type CreatorAnalytics } from "@/lib/creator/types";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/analytics",
)({
  head: () => ({ meta: [{ title: "Analitik — BeniFonla" }] }),
  component: AnalyticsPage,
  errorComponent: ({ error, reset }) => {
    if (error instanceof CreatorCampaignNotFoundError) throw notFound();
    return (
      <DashboardLayout>
        <ErrorState
          title="Analitik yüklenemedi"
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

function AnalyticsPage() {
  const { campaignId } = Route.useParams();
  const fetchAnalytics = useServerFn(getCreatorCampaignAnalytics);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "campaign", campaignId, "analytics"],
    queryFn: () =>
      fetchAnalytics({ data: { campaignId } }) as Promise<CreatorAnalytics>,
  });

  const hasFunding = data.series.some((p) => p.funding_minor > 0);
  const hasRewards = data.rewards.some((r) => r.count > 0);

  const seriesForChart = data.series.map((p) => ({
    ...p,
    funding_major: Math.round(p.funding_minor / 100),
  }));

  return (
    <DashboardLayout>
      <CreatorCampaignTabs campaignId={campaignId} />
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Analitik</h1>
        <p className="text-sm text-muted-foreground">
          {data.from} → {data.to} arası (Türkiye saati). Saat dilimi: Europe/Istanbul.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Günlük destek tutarı</CardTitle>
          </CardHeader>
          <CardContent>
            {hasFunding ? (
              <div className="h-64" role="img" aria-label="Günlük destek tutarı grafiği">
                <ResponsiveContainer>
                  <LineChart data={seriesForChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => formatMoneyMinor((v as number) * 100)}
                    />
                    <Line type="monotone" dataKey="funding_major" stroke="#0ea5e9" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Veri yok" description="Bu aralıkta destek alınmamış." />
            )}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Metin özetini göster</summary>
              <table className="mt-2 w-full text-left text-xs">
                <thead><tr><th>Tarih</th><th>Tutar</th><th>Destekçi</th></tr></thead>
                <tbody>
                  {data.series.map((p) => (
                    <tr key={p.date}><td>{p.date}</td><td>{formatMoneyMinor(p.funding_minor)}</td><td>{p.backers}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ödül dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {hasRewards ? (
              <div className="h-64" role="img" aria-label="Ödül dağılımı grafiği">
                <ResponsiveContainer>
                  <BarChart data={data.rewards}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Ödül verisi yok" />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
