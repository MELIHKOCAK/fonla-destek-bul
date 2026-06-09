import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listMyCampaigns, type CampaignRow } from "@/lib/campaigns/api";
import { formatMoneyMinor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/creator/campaigns/")({
  component: CreatorCampaignsList,
});

type Bucket = "drafts" | "review" | "live" | "closed";

const BUCKET_LABEL: Record<Bucket, string> = {
  drafts: "Taslak / Düzeltme",
  review: "İncelemede",
  live: "Yayında / Planlı",
  closed: "Tamamlandı",
};

function bucketOf(status: string): Bucket {
  if (status === "draft" || status === "revision_requested") return "drafts";
  if (status === "submitted" || status === "under_review") return "review";
  if (status === "approved" || status === "scheduled" || status === "live") return "live";
  return "closed";
}

function CreatorCampaignsList() {
  const [items, setItems] = useState<CampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Bucket>("drafts");

  useEffect(() => {
    listMyCampaigns()
      .then((rows) => setItems(rows))
      .catch((e) => setError(e?.message ?? "Yüklenemedi"));
  }, []);

  const grouped = useMemo(() => {
    const out: Record<Bucket, CampaignRow[]> = { drafts: [], review: [], live: [], closed: [] };
    (items ?? []).forEach((c) => out[bucketOf(c.status)].push(c));
    return out;
  }, [items]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kampanyalarım</h1>
          <p className="text-sm text-muted-foreground">Taslak, inceleme ve yayında olan kampanyalarınız.</p>
        </div>
        <Button asChild>
          <Link to="/creator/campaigns/new">
            <Plus className="mr-1 h-4 w-4" /> Yeni kampanya
          </Link>
        </Button>
      </header>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {items === null && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}

      {items !== null && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
          <TabsList>
            {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
              <TabsTrigger key={b} value={b}>
                {BUCKET_LABEL[b]} ({grouped[b].length})
              </TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
            <TabsContent key={b} value={b} className="mt-4">
              {grouped[b].length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Bu durumda kampanyanız yok.
                </p>
              ) : (
                <ul className="space-y-2">
                  {grouped[b].map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-4">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Hedef: {formatMoneyMinor(c.goal_amount_minor)} · Durum: {c.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {b === "drafts" || b === "review" ? (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to="/creator/campaigns/$campaignId/edit/$step"
                              params={{ campaignId: c.id, step: "basics" }}
                            >
                              Düzenle
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild variant="outline" size="sm">
                            <Link
                              to="/creator/campaigns/$campaignId/preview"
                              params={{ campaignId: c.id }}
                            >
                              Görüntüle
                            </Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
