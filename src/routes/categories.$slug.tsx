import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CategoryDetailPage } from "@/pages/CategoryDetailPage";
import { ErrorState } from "@/components/common/ErrorState";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — BeniFonla` }] }),
  component: Comp,
  errorComponent: Err,
  notFoundComponent: () => <NotFoundPage />,
});

function Comp() {
  const { slug } = Route.useParams();
  return <CategoryDetailPage slug={slug} />;
}
function Err() {
  const router = useRouter();
  return <ErrorState retry={{ onClick: () => router.invalidate() }} />;
}
