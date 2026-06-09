import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CreatorProfilePage } from "@/pages/CreatorProfilePage";
import { ErrorState } from "@/components/common/ErrorState";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const Route = createFileRoute("/creators/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — BeniFonla` }] }),
  component: Comp,
  errorComponent: Err,
  notFoundComponent: () => <NotFoundPage />,
});

function Comp() {
  const { username } = Route.useParams();
  return <CreatorProfilePage username={username} />;
}
function Err() {
  const router = useRouter();
  return <ErrorState retry={{ onClick: () => router.invalidate() }} />;
}
