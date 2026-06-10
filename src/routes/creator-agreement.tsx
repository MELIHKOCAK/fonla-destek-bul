import { createFileRoute, notFound } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { findLegalDoc } from "@/lib/legal/documents";

const SLUG = "creator-agreement";

export const Route = createFileRoute("/creator-agreement")({
  head: () => ({
    meta: [
      { title: "Creator Sözleşmesi — BeniFonla" },
      { name: "description", content: "Creator yükümlülükleri, KYC, transfer ve payout süreci." },
      { property: "og:title", content: "Creator Sözleşmesi — BeniFonla" },
      { property: "og:description", content: "Creator sorumlulukları ve ödeme akışı." },
    ],
  }),
  loader: () => {
    const doc = findLegalDoc(SLUG);
    if (!doc) throw notFound();
    return { doc };
  },
  component: CreatorAgreementPage,
});

function CreatorAgreementPage() {
  const { doc } = Route.useLoaderData();
  return <LegalPage doc={doc} />;
}
