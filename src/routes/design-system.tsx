import { createFileRoute } from "@tanstack/react-router";
import { DesignSystemPage } from "@/pages/DesignSystemPage";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System — BeniFonla" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DesignSystemPage,
});
