import { Container } from "@/components/common/Container";
import type { LegalDoc } from "@/lib/legal/documents";

interface LegalPageProps {
  doc: LegalDoc;
}

export function LegalPage({ doc }: LegalPageProps) {
  const formattedDate = doc.effectiveAt
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(doc.effectiveAt))
    : "Henüz yürürlüğe girmedi";

  return (
    <Container className="max-w-3xl py-10">
      <article aria-labelledby="legal-doc-title" className="space-y-6">
        <header className="space-y-2">
          <h1 id="legal-doc-title" className="text-3xl font-semibold tracking-tight">
            {doc.title}
          </h1>
          <p className="text-sm text-muted-foreground">{doc.summary}</p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <dt className="font-medium">Sürüm:</dt>
              <dd>{doc.version}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-medium">Durum:</dt>
              <dd className="capitalize">{doc.status}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-medium">Yürürlük:</dt>
              <dd>{formattedDate}</dd>
            </div>
          </dl>
        </header>

        {doc.status === "draft" ? (
          <div
            role="status"
            className="rounded-md border border-yellow-300/60 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/40 dark:text-yellow-100"
          >
            <strong>Taslak bildirimi:</strong> Bu metin hukuki incelemesi tamamlanmamış bir
            taslaktır. Yürürlük tarihi belirlenmemiştir; bağlayıcı bir yükümlülük doğurmaz.
          </div>
        ) : null}

        {doc.body.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed text-foreground/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Container>
  );
}
