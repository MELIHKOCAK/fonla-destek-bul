import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "risk-disclosure";

export const Route = createFileRoute("/risk-disclosure")({
  head: () => ({
    meta: [
      { title: "Risk Açıklaması — BeniFonla" },
      { name: "description", content: "Destek yatırım değildir; ödül teslim ve değişiklik riski." },
      { property: "og:title", content: "Risk Açıklaması — BeniFonla" },
      { property: "og:description", content: "Backer'lar için risk uyarıları." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: RiskDisclosurePage,
});

function RiskDisclosurePage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
