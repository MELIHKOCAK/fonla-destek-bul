import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ContactForm } from "@/components/forms/ContactForm";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "İletişim — BeniFonla" },
      {
        name: "description",
        content: "BeniFonla destek ekibine sorularınızı, geri bildirimlerinizi iletin.",
      },
      { property: "og:title", content: "İletişim — BeniFonla" },
      {
        property: "og:description",
        content: "Soru, geri bildirim veya destek için BeniFonla ile iletişime geçin.",
      },
      { property: "og:url", content: "https://benifonla.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://benifonla.lovable.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-2xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">İletişim</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sorularınızı, geri bildirimlerinizi ya da destek taleplerinizi aşağıdaki formla
            iletebilirsiniz. Tercih ederseniz doğrudan{" "}
            <a className="underline" href="mailto:destek@benifonla.com">
              destek@benifonla.com
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </header>
        <ContactForm />
      </article>
    </AppShell>
  );
}
