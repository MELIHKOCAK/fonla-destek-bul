import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreatorCampaignTabs } from "@/components/dashboard/CreatorCampaignTabs";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { formatMoneyMinor } from "@/lib/format";
import { getCreatorCampaignBackers } from "@/lib/creator/creator.functions";
import { CreatorCampaignNotFoundError, type CreatorBackerRow } from "@/lib/creator/types";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/backers",
)({
  head: () => ({ meta: [{ title: "Destekçiler — BeniFonla" }] }),
  component: BackersPage,
  errorComponent: ({ error, reset }) => {
    if (error instanceof CreatorCampaignNotFoundError) throw notFound();
    return (
      <DashboardLayout>
        <ErrorState
          title="Destekçiler yüklenemedi"
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

function BackersPage() {
  const { campaignId } = Route.useParams();
  const fetchBackers = useServerFn(getCreatorCampaignBackers);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "campaign", campaignId, "backers"],
    queryFn: () =>
      fetchBackers({ data: { campaignId, limit: 100, offset: 0 } }) as Promise<CreatorBackerRow[]>,
  });

  return (
    <DashboardLayout>
      <CreatorCampaignTabs campaignId={campaignId} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Destekçiler</h1>
      <p className="mb-3 text-xs text-muted-foreground">
        Yalnızca kampanyana ait güvenli özet bilgileri görüyorsun. Kart, e-posta veya
        ödeme sağlayıcı bilgisi paylaşılmaz.
      </p>
      {data.length === 0 ? (
        <EmptyState title="Henüz destekçi yok" />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2">Destekçi</th>
              <th>Tutar</th>
              <th>Ödül</th>
              <th>Kargo</th>
              <th>Durum</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={b.contribution_id} className="border-b">
                <td className="py-2">{b.display_name}</td>
                <td>{formatMoneyMinor(b.amount_minor)}</td>
                <td>{b.reward_title ?? "—"}</td>
                <td>{b.shipping_required ? "Evet" : "—"}</td>
                <td><Badge variant="outline">{b.status}</Badge></td>
                <td className="text-xs text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardLayout>
  );
}
