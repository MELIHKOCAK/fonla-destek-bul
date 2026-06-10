import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "complaints-and-appeals";

export const Route = createFileRoute("/complaints-and-appeals")({
  head: () => ({
    meta: [
      { title: "Şikayet ve İtiraz — BeniFonla" },
      { name: "description", content: "Şikayet, itiraz ve veri talebi başvuru süreci." },
      { property: "og:title", content: "Şikayet ve İtiraz — BeniFonla" },
      { property: "og:description", content: "Başvuru kanalı ve yanıt süresi hedefi." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: ComplaintsPage,
});

function ComplaintsPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
