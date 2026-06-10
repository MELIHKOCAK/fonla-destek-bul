import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CreatorCampaignTabs } from "@/components/dashboard/CreatorCampaignTabs";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { getCreatorCampaignReviews } from "@/lib/creator/creator.functions";
import { CreatorCampaignNotFoundError, type CreatorReviewRow } from "@/lib/creator/types";

export const Route = createFileRoute(
  "/_authenticated/creator/campaigns/$campaignId/review",
)({
  head: () => ({ meta: [{ title: "İnceleme — BeniFonla" }] }),
  component: ReviewPage,
  errorComponent: ({ error, reset }) => {
    if (error instanceof CreatorCampaignNotFoundError) throw notFound();
    return (
      <DashboardLayout>
        <ErrorState
          title="İnceleme yüklenemedi"
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

function ReviewPage() {
  const { campaignId } = Route.useParams();
  const fetchReviews = useServerFn(getCreatorCampaignReviews);
  const { data } = useSuspenseQuery({
    queryKey: ["creator", "campaign", campaignId, "reviews"],
    queryFn: () => fetchReviews({ data: { campaignId } }) as Promise<CreatorReviewRow[]>,
  });

  return (
    <DashboardLayout>
      <CreatorCampaignTabs campaignId={campaignId} />
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">İnceleme geçmişi</h1>
      {data.length === 0 ? (
        <EmptyState title="Henüz inceleme kaydı yok" />
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-md border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{r.decision}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.from_status} → {r.to_status}
              </p>
              {r.creator_visible_notes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.creator_visible_notes}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Not paylaşılmadı.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
