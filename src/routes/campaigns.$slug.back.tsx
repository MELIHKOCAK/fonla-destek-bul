import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getContributionCheckoutContext } from "@/lib/contributions/contributions.functions";
import { contributionsQueryKeys } from "@/lib/contributions/query-keys";
import { TestEnvironmentBadge } from "@/components/back/TestEnvironmentBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { translateContributionError } from "@/lib/contributions/errors";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/campaigns/$slug/back")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Destekle` }] }),
  component: BackLayout,
  errorComponent: Err,
  notFoundComponent: () => <NotFoundPage />,
});

function BackLayout() {
  const { slug } = Route.useParams();
  const fetchContext = useServerFn(getContributionCheckoutContext);
  const { data, isLoading, error } = useQuery({
    queryKey: contributionsQueryKeys.checkout(slug),
    queryFn: () => fetchContext({ data: { slug } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="container py-10" role="status">Yükleniyor…</div>;
  }
  if (error) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-bold">Destek akışı</h1>
        <p className="mt-4 text-destructive">{translateContributionError(error)}</p>
      </main>
    );
  }
  if (!data) return <NotFoundPage />;

  return (
    <main className="container py-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Destekliyorsunuz:</p>
          <h1 className="truncate text-lg font-bold sm:text-xl">{data.campaign.title}</h1>
        </div>
        <div className="shrink-0">
          <TestEnvironmentBadge />
        </div>
      </header>
      {!data.eligibility.canBack && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive bg-destructive/10 p-4 text-sm"
        >
          {translateContributionError(new Error(data.eligibility.reason ?? ""))}
        </div>
      )}
      <Outlet />
    </main>
  );
}

function Err() {
  const router = useRouter();
  return <ErrorState retry={{ onClick: () => router.invalidate() }} />;
}
