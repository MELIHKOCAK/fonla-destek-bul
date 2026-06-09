import type { Campaign } from "@/types/campaign";
import { categories } from "./categories";
import { creators } from "./creators";

const cat = (slug: string) => {
  const c = categories.find((x) => x.slug === slug);
  if (!c) throw new Error(`Unknown category slug: ${slug}`);
  return c;
};
const cr = (id: string) => {
  const c = creators.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown creator id: ${id}`);
  return c;
};

/**
 * Cover görseli için deterministik CSS gradient.
 * slug'dan üretilen tonla, gerçek fotoğraf kullanmadan
 * görsel çeşitlilik sağlanır.
 */
export function coverGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const h1 = hash % 360;
  const h2 = (h1 + 60 + (hash % 80)) % 360;
  return `linear-gradient(135deg, oklch(0.62 0.14 ${h1}) 0%, oklch(0.48 0.16 ${h2}) 100%)`;
}

const daysFromNow = (days: number): string => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

// 12 kampanya — fonlama oranları, durumlar ve süreler çeşitli.
const seed: Array<
  Omit<Campaign, "coverImage" | "creator" | "category"> & {
    categorySlug: string;
    creatorId: string;
  }
> = [
  {
    id: "cmp-01",
    slug: "akilli-bahce-sulama-cihazi",
    title: "Akıllı Bahçe Sulama Cihazı",
    shortDescription:
      "Toprak nemini ölçüp bitkilerinizi tam ihtiyacı kadar sulayan, düşük güç tüketimli IoT cihazı.",
    categorySlug: "teknoloji",
    creatorId: "cr-1",
    raisedAmountMinor: 4_500_000,
    goalAmountMinor: 10_000_000,
    backerCount: 312,
    endDate: daysFromNow(18),
    status: "live",
    featured: true,
  },
  {
    id: "cmp-02",
    slug: "el-yapimi-seramik-koleksiyonu",
    title: "El Yapımı Seramik Koleksiyonu",
    shortDescription:
      "Anadolu motiflerinden esinlenilmiş, sınırlı sayıda üretilen el yapımı seramik tabak serisi.",
    categorySlug: "tasarim",
    creatorId: "cr-3",
    raisedAmountMinor: 7_800_000,
    goalAmountMinor: 10_000_000,
    backerCount: 524,
    endDate: daysFromNow(7),
    status: "live",
    featured: true,
  },
  {
    id: "cmp-03",
    slug: "bagimsiz-bilim-kurgu-romani",
    title: "Bağımsız Bilim Kurgu Romanı",
    shortDescription:
      "İstanbul'da geçen, alternatif bir 2080 evrenini anlatan 320 sayfalık ilk roman.",
    categorySlug: "yayincilik",
    creatorId: "cr-4",
    raisedAmountMinor: 1_200_000,
    goalAmountMinor: 10_000_000,
    backerCount: 89,
    endDate: daysFromNow(25),
    status: "live",
  },
  {
    id: "cmp-04",
    slug: "yerel-muzik-festivali",
    title: "Yerel Müzik Festivali",
    shortDescription:
      "Şehrin bağımsız müzisyenlerini bir araya getirecek üç günlük açık hava festivali.",
    categorySlug: "muzik",
    creatorId: "cr-5",
    raisedAmountMinor: 22_000_000,
    goalAmountMinor: 10_000_000,
    backerCount: 1843,
    endDate: daysFromNow(3),
    status: "live",
    featured: true,
  },
  {
    id: "cmp-05",
    slug: "cocuklar-icin-kodlama-kiti",
    title: "Çocuklar İçin Kodlama Kiti",
    shortDescription:
      "8-12 yaş arası çocukların kendi kendine elektronik ve kod öğrenebileceği başlangıç seti.",
    categorySlug: "egitim",
    creatorId: "cr-7",
    raisedAmountMinor: 13_400_000,
    goalAmountMinor: 10_000_000,
    backerCount: 967,
    endDate: daysFromNow(14),
    status: "live",
    featured: true,
  },
  {
    id: "cmp-06",
    slug: "bagimsiz-bulmaca-oyunu",
    title: "Bağımsız Bulmaca Oyunu",
    shortDescription:
      "Atmosferik bir hikaye eşliğinde oynanan, üç kişilik bir stüdyonun bağımsız PC oyunu.",
    categorySlug: "oyun",
    creatorId: "cr-2",
    raisedAmountMinor: 4_500_000,
    goalAmountMinor: 10_000_000,
    backerCount: 218,
    endDate: daysFromNow(30),
    status: "live",
  },
  {
    id: "cmp-07",
    slug: "mahalle-kutuphanesi",
    title: "Mahalle Kütüphanesi",
    shortDescription:
      "Apartman girişine herkesin kitap bırakıp alabileceği küçük bir paylaşım kütüphanesi.",
    categorySlug: "topluluk",
    creatorId: "cr-6",
    raisedAmountMinor: 0,
    goalAmountMinor: 500_000,
    backerCount: 0,
    endDate: daysFromNow(45),
    status: "scheduled",
  },
  {
    id: "cmp-08",
    slug: "sokak-hayvanlari-icin-besleme-noktasi",
    title: "Sokak Hayvanları İçin Besleme Noktası",
    shortDescription:
      "Mahalledeki sokak hayvanları için güneş enerjili otomatik mama ve su istasyonu.",
    categorySlug: "topluluk",
    creatorId: "cr-8",
    raisedAmountMinor: 6_000_000,
    goalAmountMinor: 6_000_000,
    backerCount: 412,
    endDate: daysFromNow(-2),
    status: "successful",
  },
  {
    id: "cmp-09",
    slug: "dijital-illustrasyon-kursu",
    title: "Dijital İllüstrasyon Kursu",
    shortDescription:
      "Başlangıçtan ileri seviyeye dijital illüstrasyon öğreten 40 saatlik video eğitim seti.",
    categorySlug: "sanat",
    creatorId: "cr-3",
    raisedAmountMinor: 980_000,
    goalAmountMinor: 8_000_000,
    backerCount: 64,
    endDate: daysFromNow(-5),
    status: "failed",
  },
  {
    id: "cmp-10",
    slug: "modular-calisma-masasi",
    title: "Modüler Çalışma Masası",
    shortDescription:
      "Küçük dairelerde alandan tasarruf eden, parça parça eklenip büyütülebilen modüler masa.",
    categorySlug: "tasarim",
    creatorId: "cr-1",
    raisedAmountMinor: 9_200_000,
    goalAmountMinor: 10_000_000,
    backerCount: 488,
    endDate: daysFromNow(5),
    status: "live",
  },
  {
    id: "cmp-11",
    slug: "dijital-sanat-kitabi",
    title: "Dijital Sanat Kitabı",
    shortDescription:
      "Türkiye'den 24 dijital sanatçının eserlerini bir araya getiren sınırlı sayıda baskı.",
    categorySlug: "sanat",
    creatorId: "cr-7",
    raisedAmountMinor: 2_700_000,
    goalAmountMinor: 6_000_000,
    backerCount: 178,
    endDate: daysFromNow(21),
    status: "live",
  },
  {
    id: "cmp-12",
    slug: "akustik-stuyo-albumu",
    title: "Akustik Stüdyo Albümü",
    shortDescription: "Yedi şarkıdan oluşan, tamamen analog kaydedilmiş akustik bir ilk albüm.",
    categorySlug: "muzik",
    creatorId: "cr-5",
    raisedAmountMinor: 0,
    goalAmountMinor: 4_000_000,
    backerCount: 0,
    endDate: daysFromNow(60),
    status: "draft",
  },
];

export const campaigns: readonly Campaign[] = seed.map((s) => ({
  id: s.id,
  slug: s.slug,
  title: s.title,
  shortDescription: s.shortDescription,
  coverImage: coverGradient(s.slug),
  creator: cr(s.creatorId),
  category: cat(s.categorySlug),
  raisedAmountMinor: s.raisedAmountMinor,
  goalAmountMinor: s.goalAmountMinor,
  backerCount: s.backerCount,
  endDate: s.endDate,
  status: s.status,
  featured: s.featured,
}));
