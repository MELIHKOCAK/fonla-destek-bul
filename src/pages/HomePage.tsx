import { Link } from "@tanstack/react-router";
import { ArrowRight, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/common/Container";
import { CampaignCard } from "@/components/common/CampaignCard";
import { Button } from "@/components/ui/button";
import { listFeaturedCampaigns, listLiveCampaigns } from "@/mocks";

const VALUES: ReadonlyArray<{ icon: typeof ShieldCheck; title: string; description: string }> = [
  {
    icon: ShieldCheck,
    title: "Şeffaf ve güvenli",
    description:
      "Her kampanya inceleme sürecinden geçer. Toplanan tutar ve hedef her aşamada açıkça gösterilir.",
  },
  {
    icon: Sparkles,
    title: "Topluluk odaklı",
    description:
      "Ürün, fikir ve projelere destek olun; karşılığında üretici tarafından tanımlanmış ödüller alın.",
  },
  {
    icon: Compass,
    title: "Türkiye için kurgulandı",
    description:
      "Tüm tutarlar TL cinsindendir, Türkçe karakterler ve yerel iletişim biçimi gözetilir.",
  },
];

export function HomePage() {
  const featured = listFeaturedCampaigns();
  const live = listLiveCampaigns().slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-accent/40 to-background">
        <Container className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Ödül temelli kitle fonlama
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Fikrini paylaş, <span className="text-primary">topluluğunla birlikte</span> hayata
              geçir
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              BeniFonla; ürünlerini, yaratıcı fikirlerini ve projelerini tanıtmak isteyen kişilerin
              belirli bir hedef tutar ve süreyle destek toplayabildiği bir platformdur. Yatırım,
              hisse veya faiz ürünü değildir.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/">
                  Kampanyaları keşfet
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" disabled aria-disabled="true" title="Yakında">
                Proje başlat
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-border/60 bg-card p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {featured.length > 0 ? (
        <section className="py-8 sm:py-12">
          <Container>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Öne çıkan kampanyalar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Toplulukça desteklenen, ilgi çeken projeler.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <section className="py-8 sm:py-12">
        <Container>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Şu an yayında olan kampanyalar
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
