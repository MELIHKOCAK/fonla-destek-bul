import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { listMyRewards } from "@/lib/dashboard/dashboard.functions";
import type { UserRewardRow } from "@/lib/dashboard/types";

const STATUS_LABEL: Record<UserRewardRow["reservation_status"], string> = {
  reserved: "Rezerve",
  confirmed: "Onaylandı",
  released: "Serbest bırakıldı",
  expired: "Süresi doldu",
};

export const Route = createFileRoute("/_authenticated/dashboard/rewards")({
  head: () => ({ meta: [{ title: "Ödüllerim — BeniFonla" }] }),
  component: RewardsPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="Ödüller yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function RewardsPage() {
  const fetchRewards = useServerFn(listMyRewards);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard", "rewards"],
    queryFn: () => fetchRewards() as Promise<UserRewardRow[]>,
  });

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Ödüllerim</h1>
      {data.length === 0 ? (
        <EmptyState
          title="Henüz ödül yok"
          description="Bir kampanyayı ödülle desteklediğinde burada görünecek."
        />
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.reservation_id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/campaigns/$slug"
                    params={{ slug: r.campaign_slug }}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {r.campaign_title}
                  </Link>
                  <p className="font-medium">{r.reward_title}</p>
                  {r.reward_description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.reward_description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.estimated_delivery_date
                      ? `Tahmini teslim: ${new Date(r.estimated_delivery_date).toLocaleDateString("tr-TR")}`
                      : "Teslim tarihi belirsiz"}
                    {r.shipping_required ? " · Kargo gerekli" : ""}
                  </p>
                </div>
                <Badge variant="secondary">{STATUS_LABEL[r.reservation_status]}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
