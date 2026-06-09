import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getCampaignForReview, type ReviewDetail } from "@/lib/admin/api";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { ReviewHistoryList } from "@/components/admin/ReviewHistoryList";

export const Route = createFileRoute("/_authenticated/admin/campaigns/$campaignId/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { campaignId } = Route.useParams();
  const [data, setData] = useState<ReviewDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCampaignForReview(campaignId).then(setData).catch((e) => setError(e?.message ?? "Yüklenemedi"));
  }, [campaignId]);

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <header>
        <Link to="/admin/campaign-reviews/$campaignId" params={{ campaignId }} className="text-xs text-muted-foreground hover:underline">
          ← İnceleme detayına dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{data.campaign.title} — geçmiş</h1>
      </header>
      <section>
        <h2 className="mb-2 text-sm font-semibold">İnceleme kararları</h2>
        <ReviewHistoryList items={data.reviewHistory} showInternalNotes />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Denetim olayları</h2>
        <AuditTimeline items={data.auditHistory} />
      </section>
    </div>
  );
}
