import { createFileRoute, useRouter } from "@tanstack/react-router";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { ErrorState } from "@/components/common/ErrorState";

export const Route = createFileRoute("/discover")({
  head: () => ({ meta: [{ title: "Keşfet — BeniFonla" }] }),
  component: DiscoverPage,
  errorComponent: ErrorBoundary,
});

function ErrorBoundary() {
  const router = useRouter();
  return <ErrorState retry={{ onClick: () => router.invalidate() }} />;
}
