import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminSystemAlerts, type SystemAlerts } from "@/lib/admin/operations";
import { formatMoneyMinor } from "@/lib/format";

const formatMoney = (minor: number, currency: string) => formatMoneyMinor(minor, currency);

export const Route = createFileRoute("/_authenticated/admin/system-alerts")({
  head: () => ({ meta: [{ title: "Sistem uyarıları — Admin" }, { name: "robots", content: "noindex" }] }),
  component: SystemAlertsPage,
});

function SystemAlertsPage() {
  const [data, setData] = useState<SystemAlerts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdminSystemAlerts()
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sistem uyarıları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mutabakat uyuşmazlıkları, başarısız webhook/transfer/payout ve iade olayları.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCcw className="mr-2 size-4" aria-hidden /> Yenile
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Yüklenemedi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!data && loading && (
        <p className="text-sm text-muted-foreground" role="status">
          Yükleniyor…
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <AlertSection
            title="Başarısız webhook olayları"
            description="İmza geçersiz veya işlenmemiş Stripe webhook olayları (son 7 gün)."
            empty="Sorunlu webhook yok."
            items={data.failed_webhooks.map((w) => ({
              id: w.id,
              primary: `${w.event_type ?? "(unknown)"} — ${w.provider}`,
              secondary: `İmza: ${w.signature_valid ? "geçerli" : "GEÇERSİZ"} · Deneme: ${w.attempt_count ?? 0}`,
              error: w.last_error,
              at: w.received_at,
            }))}
          />

          <AlertSection
            title="Gecikmiş veya başarısız transferler"
            description="Platformdan kampanya sahibine yapılması bekleyen Stripe Transfer kayıtları."
            empty="Gecikmiş transfer yok."
            items={data.failed_transfers.map((t) => ({
              id: t.id,
              primary: `${formatMoney(t.amount_minor, t.currency)} — ${t.status}`,
              secondary: t.campaign_id ? `Kampanya: ${t.campaign_id.slice(0, 8)}…` : "",
              error: t.last_error,
              at: t.updated_at,
            }))}
          />

          <AlertSection
            title="Başarısız Stripe Payout olayları"
            description="Connected account'tan bankaya yapılan ödemelerin (Payout) başarısız olanları."
            empty="Başarısız payout yok."
            items={data.failed_payouts.map((p) => ({
              id: p.id,
              primary: `${formatMoney(p.amount_minor, p.currency)} — ${p.status}`,
              secondary: p.connected_account_id ? `Connected: ${p.connected_account_id.slice(0, 12)}…` : "",
              error: p.failure_message,
              at: p.observed_at,
            }))}
          />

          <AlertSection
            title="Başarısız iadeler"
            description="Stripe Refund denemesi başarısız olan iade kayıtları."
            empty="Başarısız iade yok."
            items={data.failed_refunds.map((r) => ({
              id: r.id,
              primary: `${formatMoney(r.amount_minor, r.currency)} — ${r.status}`,
              secondary: r.payment_id ? `Ödeme: ${r.payment_id.slice(0, 8)}…` : "",
              error: r.last_error,
              at: r.updated_at,
            }))}
          />
        </div>
      )}
    </div>
  );
}

interface AlertItem {
  id: string;
  primary: string;
  secondary: string;
  error: string | null;
  at: string;
}

function AlertSection({
  title,
  description,
  empty,
  items,
}: {
  title: string;
  description: string;
  empty: string;
  items: AlertItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="py-2 text-sm">
                <div className="font-medium">{it.primary}</div>
                {it.secondary && (
                  <div className="text-xs text-muted-foreground">{it.secondary}</div>
                )}
                {it.error && (
                  <div className="mt-1 text-xs text-destructive line-clamp-2" title={it.error}>
                    {it.error}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(it.at).toLocaleString("tr-TR")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
