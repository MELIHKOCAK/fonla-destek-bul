import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { listReviewQueue, type ReviewQueueItem, type ReviewableStatus } from "@/lib/admin/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoneyMinor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/campaign-reviews/")({
  component: ReviewQueuePage,
});

const PAGE_SIZE = 25;

function ReviewQueuePage() {
  const [status, setStatus] = useState<ReviewableStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listReviewQueue({
      status: status === "all" ? undefined : [status],
      search: search.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Yüklenemedi"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status, search, offset]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">İnceleme kuyruğu</h1>
          <p className="text-sm text-muted-foreground">Beklemede ve incelemede olan kampanyalar.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-3">
        <div className="space-y-1">
          <Label htmlFor="q-status">Durum</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as typeof status);
              setOffset(0);
            }}
          >
            <SelectTrigger id="q-status" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hepsi</SelectItem>
              <SelectItem value="submitted">Beklemede</SelectItem>
              <SelectItem value="under_review">İncelemede</SelectItem>
              <SelectItem value="revision_requested">Düzeltme istendi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-search">Başlıkta ara</Label>
          <Input
            id="q-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-64"
            placeholder="Kampanya başlığı"
          />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}

      {!loading && items.length === 0 && !error && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Bu filtrede kampanya yok.
        </p>
      )}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  to="/admin/campaign-reviews/$campaignId"
                  params={{ campaignId: it.id }}
                  className="block truncate text-base font-medium hover:underline"
                >
                  {it.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={it.status === "under_review" ? "default" : "secondary"}>{it.status}</Badge>
                  {it.category_name && <span>{it.category_name}</span>}
                  <span>
                    Creator:{" "}
                    {it.creator_display_name ?? it.creator_username ?? "—"}
                  </span>
                  <span>Hedef: {formatMoneyMinor(it.goal_amount_minor, { currency: it.currency as "TRY" })}</span>
                  {it.submitted_at && (
                    <time dateTime={it.submitted_at}>
                      Gönderim: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(new Date(it.submitted_at))}
                    </time>
                  )}
                  {!it.has_cover && <Badge variant="destructive">Kapak yok</Badge>}
                  {it.rewards_count === 0 && <Badge variant="destructive">Ödül yok</Badge>}
                </div>
              </div>
              <Button asChild size="sm">
                <Link to="/admin/campaign-reviews/$campaignId" params={{ campaignId: it.id }}>
                  İncele
                </Link>
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Toplam {total} kampanya</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Önceki
            </Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
