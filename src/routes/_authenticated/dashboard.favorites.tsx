import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { listMyFavorites } from "@/lib/dashboard/dashboard.functions";
import type { UserFavoriteRow } from "@/lib/dashboard/types";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  head: () => ({ meta: [{ title: "Favorilerim — BeniFonla" }] }),
  component: FavoritesPage,
  errorComponent: ({ error, reset }) => (
    <DashboardLayout>
      <ErrorState
        title="Favoriler yüklenemedi"
        description={error instanceof Error ? error.message : undefined}
        retry={{ onClick: reset }}
      />
    </DashboardLayout>
  ),
});

function FavoritesPage() {
  const fetchFavorites = useServerFn(listMyFavorites);
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard", "favorites"],
    queryFn: () => fetchFavorites({ data: { limit: 50, offset: 0 } }) as Promise<UserFavoriteRow[]>,
  });

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Favorilerim</h1>
      {data.length === 0 ? (
        <EmptyState
          title="Favori kampanya yok"
          description="Beğendiğin kampanyaları kalp ikonuyla kaydedebilirsin."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((f) => (
            <li key={f.campaign_id} className="rounded-md border bg-card p-4">
              <Link
                to="/campaigns/$slug"
                params={{ slug: f.slug }}
                className="block font-medium hover:underline"
              >
                {f.title}
              </Link>
              {f.short_description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {f.short_description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Eklendi: {new Date(f.favorited_at).toLocaleDateString("tr-TR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardLayout>
  );
}
