import { createFileRoute } from "@tanstack/react-router";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Sayfa bulunamadı — BeniFonla" },
      { name: "description", content: "Aradığınız sayfa bulunamadı." },
    ],
  }),
  component: NotFoundPage,
});
