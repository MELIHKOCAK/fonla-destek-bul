import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, FileCheck2, Sparkles, ShieldCheck } from "lucide-react";
import { Container } from "@/components/common/Container";
import { CampaignGrid } from "@/components/common/CampaignGrid";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import {
  getFeaturedCampaigns,
  getNewCampaigns,
  getSuccessfulCampaigns,
} from "@/services/campaigns.service";
import { listCategories } from "@/services/categories.service";

const VALUES = [
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
] as const;

const CREATOR_STEPS = [
  "Projenizi anlatın, hedef tutar ve süre belirleyin.",
  "Ekibimiz kampanyanızı topluluk kurallarına göre inceler.",
  "Onay sonrası kampanyanız yayına girer ve destek toplamaya başlar.",
  "Hedefe ulaşılırsa fonlar, kullanım planına göre size aktarılır.",
] as const;

const BACKER_STEPS = [
  "Projeleri kategoriye veya anahtar kelimeye göre keşfedin.",
  "İlginizi çeken projenin detayını, planını ve risklerini inceleyin.",
  "Reward tier seçin ve sandbox ödeme ile destek olun.",
  "Hedef tutturulamazsa desteğiniz iade edilir; ek ücret alınmaz.",
] as const;

export function HomePage() {
  const featured = useQuery({ queryKey: ["campaigns", "featured"], queryFn: () => getFeaturedCampaigns(4) });
  const fresh = useQuery({ queryKey: ["campaigns", "new"], queryFn: () => getNewCampaigns(6) });
  const success = useQuery({ queryKey: ["campaigns", "successful"], queryFn: () => getSuccessfulCampaigns(3) });
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: listCategories });

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
                <Link to="/creator/campaigns/new">
                  Proje Başlat
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/discover">Projeleri Keşfet</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Hesabın yok mu?{" "}
              <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
                Ücretsiz kayıt ol
              </Link>{" "}
              ve birkaç dakikada taslağını oluştur.
            </p>
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

      <section className="py-8 sm:py-12">
        <Container>
          <SectionHeading
            title="Öne çıkan kampanyalar"
            description="Toplulukça desteklenen, ilgi çeken projeler."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/discover">Tümünü gör</Link>
              </Button>
            }
          />
          <CampaignGrid
            campaigns={featured.data ?? []}
            isLoading={featured.isLoading}
            isError={featured.isError}
            onRetry={() => featured.refetch()}
            skeletonCount={3}
            emptyTitle="Şu an öne çıkan kampanya yok"
            emptyDescription="Yakında yeni projeler burada listelenecek."
          />
        </Container>
      </section>

      <section className="py-8 sm:py-12">
        <Container>
          <SectionHeading title="Popüler kategoriler" />
          {categoriesQ.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(categoriesQ.data ?? []).map((c) => (
                <Link
                  key={c.id}
                  to="/categories/$slug"
                  params={{ slug: c.slug }}
                  className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {c.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <section className="py-8 sm:py-12">
        <Container>
          <SectionHeading
            title="Yeni kampanyalar"
            description="Son günlerde yayına alınan projeler."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/discover">Tümü</Link>
              </Button>
            }
          />
          <CampaignGrid
            campaigns={fresh.data ?? []}
            isLoading={fresh.isLoading}
            isError={fresh.isError}
            onRetry={() => fresh.refetch()}
          />
        </Container>
      </section>

      <section className="py-8 sm:py-12">
        <Container>
          <SectionHeading
            title="Başarılı kampanyalar"
            description="Toplulukça hedefine ulaştırılmış projeler."
          />
          <CampaignGrid
            campaigns={success.data ?? []}
            isLoading={success.isLoading}
            isError={success.isError}
            onRetry={() => success.refetch()}
            skeletonCount={3}
            emptyTitle="Henüz başarıyla tamamlanmış kampanya yok"
          />
        </Container>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-12 sm:py-16">
        <Container>
          <SectionHeading
            title="BeniFonla nasıl çalışır?"
            description="Yaratıcılar ve destekçiler için süreç şöyle ilerler."
          />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">Yaratıcılar için</h3>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {CREATOR_STEPS.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <h3 className="text-base font-semibold text-foreground">Destekçiler için</h3>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {BACKER_STEPS.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <FileCheck2 className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">İnceleme süreci</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Yayına alınan her kampanya temel topluluk kurallarına göre incelenir; uygun
                bulunmayanlar yayınlanmaz.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">Açık riskler</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Kitle fonlama bir yatırım değildir. Üretim ve teslimatta gecikme ya da iptal
                olasılığını her kampanya sayfasında açıkça paylaşıyoruz.
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <Sparkles className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">Ödeme güvenliği</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ödemeler lisanslı ödeme altyapısı üzerinden işlenir. Sandbox modda güvenli
                ödeme test edilir; hesap bilgileriniz saklanmaz.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Kendi projeni başlatmaya hazır mısın?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Birkaç dakikada taslak oluştur, hazır olduğunda yayına al.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/creator/campaigns/new">
                  Proje Başlat
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">Nasıl çalışır?</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
