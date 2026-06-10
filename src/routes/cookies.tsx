import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "cookies";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Çerez Politikası — BeniFonla" },
      { name: "description", content: "BeniFonla çerez kullanımı. Taslak sürüm." },
      { property: "og:title", content: "Çerez Politikası — BeniFonla" },
      { property: "og:description", content: "Çerez tercihleri ve rıza yönetimi." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: CookiesPage,
});

function CookiesPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
