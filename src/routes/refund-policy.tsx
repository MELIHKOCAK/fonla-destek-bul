import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "refund-policy";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "İade Politikası — BeniFonla" },
      { name: "description", content: "BeniFonla iade ve geri ödeme politikası." },
      { property: "og:title", content: "İade Politikası — BeniFonla" },
      { property: "og:description", content: "Başarısız ve başarılı kampanyalarda iade kuralları." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
