import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCreatorPaymentAccount } from "@/lib/payments/payments.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/creator/payment-account")({
  head: () => ({ meta: [{ title: "Ödeme Hesabı — BeniFonla" }] }),
  component: PaymentAccountPage,
});

function PaymentAccountPage() {
  const fetchAccount = useServerFn(getMyCreatorPaymentAccount);
  const { data, isLoading } = useQuery({
    queryKey: ["creator-payment-account", "test"],
    queryFn: () => fetchAccount({ data: { environment: "test" } }),
  });

  return (
    <main className="container max-w-2xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Ödeme hesabı</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stripe sandbox onboarding Faz 12'de açılacak. Live mode yalnızca dış
          uygunluk onayından sonra etkinleşir.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Hazırlık durumu</CardTitle>
          <Badge variant="outline" className="border-amber-500 text-amber-700">
            Test ortamı (sandbox)
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading ? (
            <p role="status">Yükleniyor…</p>
          ) : data ? (
            <>
              <Row label="Hesap" value={data.exists ? "Oluşturuldu" : "Henüz oluşturulmadı"} />
              <Row label="Onboarding" value={data.onboarding_status} />
              <Row label="Ödeme kabulü" value={data.charges_enabled ? "Açık" : "Kapalı"} />
              <Row label="Banka payout" value={data.payouts_enabled ? "Açık" : "Kapalı"} />
              <p className="pt-2 text-xs text-muted-foreground">
                Banka hesabı, kimlik ve KYC bilgileri Stripe-hosted onboarding ile
                toplanır. BeniFonla bu bilgileri kendi veritabanında tutmaz.
              </p>
            </>
          ) : (
            <p className="text-destructive">Hesap bilgisi yüklenemedi.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
