import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getCampaignForReview, startCampaignReview, type ReviewDetail } from "@/lib/admin/api";
import { mapAdminError } from "@/lib/admin/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidationSummary } from "@/components/admin/ValidationSummary";
import { ReviewHistoryList } from "@/components/admin/ReviewHistoryList";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { RequestRevisionDialog } from "@/components/admin/dialogs/RequestRevisionDialog";
import { ApproveDialog } from "@/components/admin/dialogs/ApproveDialog";
import { RejectDialog } from "@/components/admin/dialogs/RejectDialog";
import { SuspendDialog } from "@/components/admin/dialogs/SuspendDialog";
import { formatMoneyMinor } from "@/lib/format";
import { RichTextViewer } from "@/components/common/RichTextViewer";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/campaign-reviews/$campaignId")({
  component: ReviewDetailPage,
});

function ReviewDetailPage() {
  const { campaignId } = Route.useParams();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRevision, setShowRevision] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getCampaignForReview(campaignId);
      setDetail(d);
    } catch (e) {
      setError((e as Error)?.message ?? "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleStartReview() {
    if (!detail) return;
    try {
      await startCampaignReview({ campaignId, lockVersion: detail.campaign.lock_version });
      toast.success("İncelemeye alındı");
      await reload();
    } catch (e) {
      toast.error(mapAdminError(e).message);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!detail) return <p className="text-sm text-muted-foreground">Kampanya bulunamadı.</p>;

  const c = detail.campaign;
  const cover = detail.media.find((m) => m.is_cover) ?? detail.media[0] ?? null;
  const canApprove = detail.validation.ok;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/admin/campaign-reviews" className="hover:underline">İnceleme kuyruğu</Link>
          <span>/</span>
          <span>İnceleme</span>
        </div>
        <h1 className="text-2xl font-semibold">{c.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>{c.status}</Badge>
          {detail.category && <span className="text-muted-foreground">{detail.category.name}</span>}
          <span className="text-muted-foreground">Hedef: {formatMoneyMinor(c.goal_amount_minor)}</span>
          {c.submitted_at && (
            <span className="text-muted-foreground">
              Gönderim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(c.submitted_at))}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">İçerik</TabsTrigger>
              <TabsTrigger value="media">Medya ({detail.media.length})</TabsTrigger>
              <TabsTrigger value="rewards">Ödüller ({detail.rewardTiers.length})</TabsTrigger>
              <TabsTrigger value="creator">Creator</TabsTrigger>
              <TabsTrigger value="history">Geçmiş</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-3">
              <Card className="p-4">
                <h3 className="font-medium">Kısa açıklama</h3>
                <p className="mt-1 whitespace-pre-line text-sm">{c.short_description ?? "—"}</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-medium">Hikâye</h3>
                {c.story_content ? <RichTextViewer html={c.story_content} className="mt-1" /> : <p className="mt-1 text-sm">—</p>}
              </Card>
              <Card className="p-4">
                <h3 className="font-medium">Fon kullanım planı</h3>
                {c.funds_usage_content ? <RichTextViewer html={c.funds_usage_content} className="mt-1" /> : <p className="mt-1 text-sm">—</p>}
              </Card>
              <Card className="p-4">
                <h3 className="font-medium">Takvim</h3>
                {c.timeline_content ? <RichTextViewer html={c.timeline_content} className="mt-1" /> : <p className="mt-1 text-sm">—</p>}
              </Card>
              <Card className="p-4">
                <h3 className="font-medium">Riskler</h3>
                {c.risks_content ? <RichTextViewer html={c.risks_content} className="mt-1" /> : <p className="mt-1 text-sm">—</p>}
              </Card>
            </TabsContent>
            <TabsContent value="media" className="space-y-2">
              {cover && (
                <Card className="p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Kapak</p>
                  <code className="text-xs">{cover.storage_path ?? cover.external_url ?? "—"}</code>
                </Card>
              )}
              {detail.media.filter((m) => !m.is_cover).map((m) => (
                <Card key={m.id} className="p-3 text-xs">
                  <code>{m.storage_path ?? m.external_url ?? "—"}</code>
                </Card>
              ))}
              {detail.media.length === 0 && <p className="text-sm text-muted-foreground">Medya yok.</p>}
            </TabsContent>
            <TabsContent value="rewards" className="space-y-2">
              {detail.rewardTiers.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-sm">{formatMoneyMinor(r.amount_minor)}</span>
                  </div>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                  {!r.is_active && <Badge variant="outline" className="mt-1">Pasif</Badge>}
                </Card>
              ))}
              {detail.rewardTiers.length === 0 && <p className="text-sm text-muted-foreground">Ödül tanımlı değil.</p>}
            </TabsContent>
            <TabsContent value="creator">
              <Card className="p-4 text-sm">
                <p><span className="font-medium">İsim:</span> {detail.creator?.display_name ?? "—"}</p>
                <p><span className="font-medium">Kullanıcı adı:</span> {detail.creator?.username ?? "—"}</p>
                {detail.creator?.bio && <p className="mt-2 whitespace-pre-line">{detail.creator.bio}</p>}
              </Card>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <section>
                <h3 className="mb-2 text-sm font-semibold">İnceleme kararları</h3>
                <ReviewHistoryList items={detail.reviewHistory} showInternalNotes />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Denetim olayları</h3>
                <AuditTimeline items={detail.auditHistory} />
              </section>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          <ValidationSummary missing={detail.validation.missing} />

          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">İşlemler</h3>
            {c.status === "submitted" && (
              <Button className="w-full" onClick={handleStartReview}>İncelemeye al</Button>
            )}
            {c.status === "under_review" && (
              <>
                <Button className="w-full" onClick={() => setShowApprove(true)}>Onayla</Button>
                <Button className="w-full" variant="secondary" onClick={() => setShowRevision(true)}>Düzeltme iste</Button>
                <Button className="w-full" variant="destructive" onClick={() => setShowReject(true)}>Reddet</Button>
              </>
            )}
            {c.status === "live" && (
              <Button className="w-full" variant="destructive" onClick={() => setShowSuspend(true)}>Askıya al</Button>
            )}
            {!["submitted", "under_review", "live"].includes(c.status) && (
              <p className="text-xs text-muted-foreground">Bu durumda yapılabilecek admin işlemi yok.</p>
            )}
          </Card>
        </aside>
      </div>

      <RequestRevisionDialog open={showRevision} onOpenChange={setShowRevision} campaignId={c.id} lockVersion={c.lock_version} onDone={reload} />
      <ApproveDialog open={showApprove} onOpenChange={setShowApprove} campaignId={c.id} lockVersion={c.lock_version} canApprove={canApprove} onDone={reload} />
      <RejectDialog open={showReject} onOpenChange={setShowReject} campaignId={c.id} lockVersion={c.lock_version} onDone={reload} />
      <SuspendDialog open={showSuspend} onOpenChange={setShowSuspend} campaignId={c.id} lockVersion={c.lock_version} onDone={reload} />
    </div>
  );
}
