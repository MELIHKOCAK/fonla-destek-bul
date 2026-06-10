import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "prohibited-campaigns";

export const Route = createFileRoute("/prohibited-campaigns")({
  head: () => ({
    meta: [
      { title: "Yasaklı Kampanyalar — BeniFonla" },
      { name: "description", content: "BeniFonla'da yayınlanamayacak kampanya kategorileri." },
      { property: "og:title", content: "Yasaklı Kampanyalar — BeniFonla" },
      { property: "og:description", content: "Yasak içerik politikası." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: ProhibitedCampaignsPage,
});

function ProhibitedCampaignsPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
