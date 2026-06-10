import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreatorCampaignTabs } from "@/components/dashboard/CreatorCampaignTabs";
import { StatCard } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/common/ErrorState";
import { Badge } from "@/components/ui/badge";
import { formatMoneyMinor, calculateProgressPercent, clampProgressPercent } from "@/lib/format";
import { getCreatorCampaignOverview } from "@/lib/creator/creator.functions";
import { CreatorCampaignNotFoundError, type CreatorCampaignOverview } from "@/lib/creator/types";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/overview",
)({
  head: () => ({ meta: [{ title: "Kampanya — BeniFonla" }] }),
  component: CampaignOverviewPage,
  errorComponent: ({ error, reset }) => {
    if (error instanceof CreatorCampaignNotFoundError) throw notFound();
    return (
      <DashboardLayout>
        <ErrorState
          title="Kampanya yüklenemedi"
          description={error instanceof Error ? error.message : undefined}
          retry={{ onClick: reset }}
        />
      </DashboardLayout>
    );
  },
  notFoundComponent: () => (
    <DashboardLayout>
      <ErrorState title="Kampanya bulunamadı" description="Erişim yetkin yok veya kampanya silinmiş." />
    </DashboardLayout>
  ),
});

function CampaignOverviewPage() {
  const { campaignId } = Route.useParams();
  const fetchOverview = useServerFn(getCreatorCampaignOverview);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "campaign", campaignId, "overview"],
    queryFn: () =>
      fetchOverview({ data: { campaignId } }) as Promise<CreatorCampaignOverview>,
  });

  const pct = clampProgressPercent(
    calculateProgressPercent(data.raised_minor, data.goal_amount_minor),
  );

  return (
    <DashboardLayout>
      <CreatorCampaignTabs campaignId={campaignId} />
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.title}</h1>
          <p className="text-sm text-muted-foreground">/{data.slug}</p>
        </div>
        <Badge variant="outline">{data.status}</Badge>
      </header>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Toplanan"
          value={formatMoneyMinor(data.raised_minor)}
          hint={`${pct.toFixed(0)}% hedef`}
        />
        <StatCard label="Hedef" value={formatMoneyMinor(data.goal_amount_minor)} />
        <StatCard label="Destekçi" value={data.backer_count} hint={`${data.contribution_count} destek`} />
      </section>
    </DashboardLayout>
  );
}
