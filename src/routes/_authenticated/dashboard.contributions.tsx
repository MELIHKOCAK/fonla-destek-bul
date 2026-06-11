import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyContributions } from "@/lib/contributions/contributions.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { formatMoneyMinor } from "@/lib/format";
import {
  ContributionStatusBadge,
  PaymentStatusBadge,
} from "@/components/back/ContributionStatusBadge";
import { TestEnvironmentBadge } from "@/components/back/TestEnvironmentBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/_authenticated/dashboard/contributions")({
  head: () => ({ meta: [{ title: "Desteklerim — BeniFonla" }] }),
  component: ContributionsDashboard,
  errorComponent: () => {
    const router = useRouter();
    return (
      <DashboardLayout>
        <ErrorState retry={{ onClick: () => router.invalidate() }} />
      </DashboardLayout>
    );
  },
});

function ContributionsDashboard() {
  const fetchMine = useServerFn(listMyContributions);
  const { data, isLoading, error } = useQuery({
    queryKey: contributionsQueryKeys.mine(),
    queryFn: () => fetchMine(),
  });

  return (
    <DashboardLayout>
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Desteklerim</h1>
      </header>
      {isLoading && <p role="status">Yükleniyor…</p>}
      {error && <p role="alert" className="text-destructive">Kayıtlar yüklenemedi.</p>}
      {data && data.length === 0 && (
        <p className="text-muted-foreground">Henüz bir destek vermediniz.</p>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    to="/campaigns/$slug"
                    params={{ slug: c.campaign_slug }}
                    className="font-semibold hover:underline"
                  >
                    {c.campaign_title}
                  </Link>
                  {c.reward_title && (
                    <p className="text-sm text-muted-foreground">Ödül: {c.reward_title}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-semibold">{formatMoneyMinor(c.amount_minor)}</p>
                  <div className="flex gap-1">
                    <ContributionStatusBadge status={c.status} />
                    {c.latest_payment_status && (
                      <PaymentStatusBadge status={c.latest_payment_status} />
                    )}
                    {c.environment === "test" && <TestEnvironmentBadge />}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
