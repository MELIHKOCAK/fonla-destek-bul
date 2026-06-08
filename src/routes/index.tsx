import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BeniFonla — Geliştirme aşamasında" },
      {
        name: "description",
        content:
          "BeniFonla; ürün, fikir ve projeler için ödül temelli kitle fonlama platformu. Şu an geliştirme aşamasındadır.",
      },
      { property: "og:title", content: "BeniFonla — Geliştirme aşamasında" },
      {
        property: "og:description",
        content:
          "BeniFonla; ürün, fikir ve projeler için ödül temelli kitle fonlama platformu. Şu an geliştirme aşamasındadır.",
      },
    ],
  }),
  component: HomePage,
});
