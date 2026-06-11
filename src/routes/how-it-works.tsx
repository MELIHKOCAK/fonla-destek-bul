import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "Nasıl Çalışır — BeniFonla" },
      {
        name: "description",
        content:
          "BeniFonla'da kampanya oluşturmanın, destek vermenin ve ödüllerin teslim edilmesinin adım adım açıklaması.",
      },
      { property: "og:title", content: "Nasıl Çalışır — BeniFonla" },
      {
        property: "og:description",
        content: "Yaratıcılar ve destekçiler için BeniFonla'nın çalışma şekli.",
      },
      { property: "og:url", content: "https://benifonla.lovable.app/how-it-works" },
    ],
    links: [
      { rel: "canonical", href: "https://benifonla.lovable.app/how-it-works" },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  const creatorSteps = [
    {
      title: "Kampanyanı hazırla",
      body: "Hikâyeni, fonlama hedefini, süreyi ve ödülleri yaratıcı sihirbazında adım adım gir.",
    },
    {
      title: "İnceleme",
      body: "Ekibimiz kampanyanı politika ve içerik kurallarımıza göre değerlendirir.",
    },
    {
      title: "Yayına al",
      body: "Onay sonrası kampanyan yayına alınır; destekçilerinle paylaşabilirsin.",
    },
    {
      title: "Tamamlanma ve ödüller",
      body: "Hedefe ulaşıldığında ödemeler işlenir, ödüllerini destekçilere ulaştırırsın.",
    },
  ];

  const backerSteps = [
    {
      title: "Keşfet",
      body: "İlgini çeken projeleri kategoriler ve filtrelerle bul.",
    },
    {
      title: "Ödülünü seç",
      body: "Destek seviyene göre uygun ödülü seç veya serbest miktarda katkıda bulun.",
    },
    {
      title: "Güvenli ödeme",
      body: "Ödemen güvenli ödeme altyapısı üzerinden işlenir; bilgilerin korunur.",
    },
    {
      title: "Takip et",
      body: "Yaratıcının güncellemelerini takip et, ödülünü kampanya sonunda al.",
    },
  ];

  return (
    <>
      <article className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Nasıl çalışır?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            BeniFonla'da yaratıcılar ve destekçiler için süreç dört basit adımdan oluşur.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">Yaratıcılar için</h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {creatorSteps.map((step, i) => (
              <li key={step.title} className="rounded-lg border bg-card p-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Adım {i + 1}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-semibold">Destekçiler için</h2>
          <ol className="grid gap-4 sm:grid-cols-2">
            {backerSteps.map((step, i) => (
              <li key={step.title} className="rounded-lg border bg-card p-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  Adım {i + 1}
                </div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border bg-muted/30 p-6 text-sm">
          <h2 className="text-lg font-semibold">Önemli notlar</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              BeniFonla bir yatırım veya getiri vaat eden ürün değildir. Destekler ödül
              temellidir.
            </li>
            <li>
              Ayrıntılı koşullar için{" "}
              <Link to="/terms" className="underline">
                Kullanım Şartları
              </Link>{" "}
              ve{" "}
              <Link to="/refund-policy" className="underline">
                İade Politikası
              </Link>{" "}
              sayfalarımıza göz at.
            </li>
          </ul>
        </section>
      </article>
    </>
  );
}
