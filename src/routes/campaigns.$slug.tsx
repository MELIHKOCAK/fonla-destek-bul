import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CampaignDetailPage } from "@/pages/CampaignDetailPage";
import { ErrorState } from "@/components/common/ErrorState";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const Route = createFileRoute("/campaigns/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — BeniFonla` }] }),
  component: Comp,
  errorComponent: Err,
  notFoundComponent: () => <NotFoundPage />,
});

function Comp() {
  const { slug } = Route.useParams();
  return <CampaignDetailPage slug={slug} />;
}
function Err() {
  const router = useRouter();
  return <ErrorState retry={{ onClick: () => router.invalidate() }} />;
}
