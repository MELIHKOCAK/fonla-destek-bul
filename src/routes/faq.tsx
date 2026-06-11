import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "BeniFonla nedir?",
    a: "BeniFonla, yaratıcı projelerin ödül karşılığında destekçileriyle buluştuğu Türkiye merkezli bir kitle fonlama platformudur.",
  },
  {
    q: "Destek bir yatırım mıdır?",
    a: "Hayır. BeniFonla bir yatırım, hisse satışı veya getiri vaat eden finansal ürün değildir. Verilen destek karşılığında kampanyada belirtilen ödül alınır.",
  },
  {
    q: "Kampanya hedefe ulaşmazsa ne olur?",
    a: "Kampanya hedefe ulaşmazsa, kampanya kurallarına göre destekçilere iade yapılır. Detaylar için İade Politikası sayfasına bakınız.",
  },
  {
    q: "Ödülümü ne zaman alırım?",
    a: "Ödüller, kampanya başarıyla tamamlandıktan sonra yaratıcı tarafından duyurulan takvime göre gönderilir.",
  },
  {
    q: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
    a: "Ödemeler güvenli ödeme altyapımız üzerinden alınır. Desteklenen kart tipleri ödeme sayfasında görüntülenir.",
  },
  {
    q: "Kampanyamı nasıl oluştururum?",
    a: "Hesap oluşturduktan sonra yaratıcı panelinden 'Yeni kampanya' adımıyla sihirbazı başlatabilirsin. Onay süreci sonrası kampanyan yayına alınır.",
  },
  {
    q: "Sorun yaşarsam kime ulaşabilirim?",
    a: "destek@benifonla.com adresine e-posta göndererek destek ekibimize ulaşabilirsin.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Sık Sorulan Sorular — BeniFonla" },
      {
        name: "description",
        content:
          "BeniFonla hakkında sık sorulan sorular: kampanyalar, ödüller, ödemeler ve daha fazlası.",
      },
      { property: "og:title", content: "Sık Sorulan Sorular — BeniFonla" },
      {
        property: "og:description",
        content: "BeniFonla kullanımı hakkında en sık sorulan soruların cevapları.",
      },
      { property: "og:url", content: "https://benifonla.lovable.app/faq" },
    ],
    links: [{ rel: "canonical", href: "https://benifonla.lovable.app/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Sık sorulan sorular</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aradığını bulamadıysan{" "}
            <Link to="/contact" className="underline">
              iletişim
            </Link>{" "}
            sayfasından bize yazabilirsin.
          </p>
        </header>

        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </article>
    </>
  );
}
