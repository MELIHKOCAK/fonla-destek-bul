import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CreditCard, Heart, RefreshCcw, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { getDashboardOverview } from "@/lib/dashboard/dashboard.functions";
import { formatMoneyMinor } from "@/lib/format";
import type { DashboardOverview } from "@/lib/dashboard/types";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Panel — BeniFonla" }] }),
  component: DashboardPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="Panel yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function DashboardPage() {
  const fetchOverview = useServerFn(getDashboardOverview);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => fetchOverview() as Promise<DashboardOverview>,
    staleTime: 60_000,
  });

  return (
    <DashboardLayout>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Panelim</h1>
        <p className="text-sm text-muted-foreground">Destek geçmişin ve hesap durumun.</p>
      </header>
      <section
        aria-label="Özet"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          label="Toplam ödenen destek"
          value={formatMoneyMinor(data.total_paid_minor)}
          icon={<Heart className="h-4 w-4" />}
        />
        <StatCard
          label="Aktif kampanya desteği"
          value={data.active_supported_count}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="Bekleyen iade"
          value={formatMoneyMinor(data.pending_refund_minor)}
          icon={<RefreshCcw className="h-4 w-4" />}
        />
        <StatCard
          label="Beklenen ödül"
          value={data.expected_rewards_count}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="Okunmamış bildirim"
          value={data.unread_notifications}
          icon={<Bell className="h-4 w-4" />}
        />
        <StatCard
          label="Ödeme geçmişi"
          value={<CreditCard className="h-6 w-6 text-muted-foreground" />}
          hint="Tüm ödeme denemelerini görüntüle"
        />
      </section>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/contributions">Desteklerimi gör</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/rewards">Ödüllerim</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/notifications">Bildirimler</Link>
        </Button>
      </div>
    </DashboardLayout>
  );
}
