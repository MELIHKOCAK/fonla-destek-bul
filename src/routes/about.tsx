import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Hakkımızda — BeniFonla" },
      {
        name: "description",
        content:
          "BeniFonla, yaratıcı projelerin ve ürünlerin destekçileriyle buluştuğu ödül temelli kitle fonlama platformudur.",
      },
      { property: "og:title", content: "Hakkımızda — BeniFonla" },
      {
        property: "og:description",
        content:
          "BeniFonla'nın misyonu, ekibi ve ödül temelli kitle fonlama yaklaşımı hakkında bilgi.",
      },
      { property: "og:url", content: "https://benifonla.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://benifonla.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Hakkımızda</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            BeniFonla, Türkiye'de ödül ve destek temelli kitle fonlamayı erişilebilir kılmayı
            amaçlayan bir platformdur.
          </p>
        </header>

        <section className="prose prose-sm max-w-none dark:prose-invert">
          <h2>Misyonumuz</h2>
          <p>
            Yaratıcıların ürün fikirlerini, sanat projelerini ve topluluk girişimlerini
            destekçileriyle buluşturmak; şeffaf, güvenli ve kullanıcı dostu bir fonlama
            deneyimi sunmak.
          </p>

          <h2>Nasıl çalışır?</h2>
          <p>
            Yaratıcılar bir fonlama hedefi ve süresi belirler. Destekçiler ödül karşılığında
            katkıda bulunur. Kampanya hedefine ulaştığında ödemeler işlenir ve ödüller
            gönderilir.
          </p>

          <h2>Ne değiliz?</h2>
          <p>
            BeniFonla bir yatırım platformu, hisse satışı aracı veya getiri vaat eden bir
            finansal ürün değildir. Tüm destekler ödül veya hediye temellidir.
          </p>

          <h2>İletişim</h2>
          <p>
            Sorularınız için{" "}
            <a className="underline" href="mailto:destek@benifonla.com">
              destek@benifonla.com
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
