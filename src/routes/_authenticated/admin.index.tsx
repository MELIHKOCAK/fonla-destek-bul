import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getAdminOverview } from "@/lib/admin/api";
import { getAdminDashboardOverview, type DashboardOverview } from "@/lib/admin/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ListChecks, ScrollText, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndex,
});

interface ReviewSummary {
  submitted: number;
  underReview: number;
  revisionRequested: number;
}

function AdminIndex() {
  const [review, setReview] = useState<ReviewSummary | null>(null);
  const [ops, setOps] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminOverview(), getAdminDashboardOverview()])
      .then(([r, o]) => {
        setReview({ submitted: r.submitted, underReview: r.underReview, revisionRequested: r.revisionRequested });
        setOps(o);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operasyonel özet, sistem sağlığı ve son denetim olayları.
        </p>
      </header>

      <Alert>
        <ShieldAlert className="size-4" aria-hidden />
        <AlertTitle>Yüksek riskli alan</AlertTitle>
        <AlertDescription>
          Bu paneldeki kritik işlemler değişmez denetim günlüğüne yazılır ve geri alınamaz.
          Status alanları doğrudan düzenlenemez; tüm finansal aksiyonlar güvenli komutlar üzerinden yürütülür.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Veri yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="reviews-heading" className="space-y-2">
        <h2 id="reviews-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          İnceleme
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Beklemede" value={review?.submitted} />
          <StatCard label="İncelemede" value={review?.underReview} />
          <StatCard label="Düzeltme istenen" value={review?.revisionRequested} />
        </div>
      </section>

      <section aria-labelledby="ops-heading" className="space-y-2">
        <h2 id="ops-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Operasyon
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Canlı kampanya" value={ops?.live_campaigns} />
          <StatCard label="Açık şikayet" value={ops?.open_reports} />
          <StatCard label="Başarısız ödeme" value={ops?.failed_payments} tone={ops?.failed_payments ? "warn" : undefined} />
          <StatCard label="Başarısız iade" value={ops?.failed_refunds} tone={ops?.failed_refunds ? "warn" : undefined} />
          <StatCard label="Başarısız transfer" value={ops?.failed_transfers} tone={ops?.failed_transfers ? "warn" : undefined} />
          <StatCard label="Başarısız payout" value={ops?.failed_payouts} tone={ops?.failed_payouts ? "warn" : undefined} />
          <StatCard label="İşlenmemiş webhook" value={ops?.unprocessed_webhooks} tone={ops?.unprocessed_webhooks ? "warn" : undefined} />
          <StatCard label="Geçersiz imza webhook" value={ops?.invalid_webhooks} tone={ops?.invalid_webhooks ? "warn" : undefined} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/admin/campaign-reviews"><ListChecks className="mr-2 size-4" aria-hidden />İnceleme kuyruğuna git</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/system-alerts"><AlertTriangle className="mr-2 size-4" aria-hidden />Sistem uyarıları</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/audit"><ScrollText className="mr-2 size-4" aria-hidden />Denetim günlüğü</Link>
        </Button>
      </div>

      <section aria-labelledby="recent-audits">
        <h2 id="recent-audits" className="mb-2 text-lg font-semibold">Son denetim olayları</h2>
        {ops ? (
          ops.recent_audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>
          ) : (
            <AuditTimeline
              items={ops.recent_audits.map((a) => ({
                id: a.id,
                action: a.action,
                entity_type: a.entity_type,
                entity_id: a.entity_id,
                reason: a.reason,
                created_at: a.created_at,
                actor_user_id: a.actor_user_id,
                before_data: null,
                after_data: null,
                correlation_id: null,
              }))}
            />
          )
        ) : (
          <p className="text-sm text-muted-foreground" role="status">Yükleniyor…</p>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: "warn";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className={tone === "warn" ? "text-3xl font-semibold text-destructive" : "text-3xl font-semibold"}>
        {value ?? "—"}
      </CardContent>
    </Card>
  );
}
