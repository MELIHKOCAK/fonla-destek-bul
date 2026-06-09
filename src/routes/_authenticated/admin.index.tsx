import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getAdminOverview } from "@/lib/admin/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuditTimeline } from "@/components/admin/AuditTimeline";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminOverview>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminOverview()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Yüklenemedi"));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Admin paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kampanya inceleme ve denetim özetiniz.</p>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Beklemede</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{data?.submitted ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">İncelemede</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{data?.underReview ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Düzeltme istenen</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{data?.revisionRequested ?? "—"}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/admin/campaign-reviews">İnceleme kuyruğuna git</Link></Button>
      </div>

      <section aria-labelledby="recent-audits">
        <h2 id="recent-audits" className="mb-2 text-lg font-semibold">Son denetim olayları</h2>
        {data ? <AuditTimeline items={data.recentAudits} /> : <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
      </section>
    </div>
  );
}
