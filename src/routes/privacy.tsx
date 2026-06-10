import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "privacy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Gizlilik Politikası — BeniFonla" },
      { name: "description", content: "BeniFonla gizlilik politikası. Taslak sürüm." },
      { property: "og:title", content: "Gizlilik Politikası — BeniFonla" },
      { property: "og:description", content: "Kişisel veri işleme politikamız." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
