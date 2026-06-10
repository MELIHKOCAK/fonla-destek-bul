import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Kullanım Şartları — BeniFonla" },
      { name: "description", content: "BeniFonla kullanım şartları. Taslak sürüm." },
      { property: "og:title", content: "Kullanım Şartları — BeniFonla" },
      { property: "og:description", content: "BeniFonla kullanım şartları." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: TermsPage,
});

function TermsPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
