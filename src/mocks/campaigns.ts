import type { Campaign, CampaignStatus } from "@/types/campaign";
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

interface CampaignSeed {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  categorySlug: string;
  creatorId: string;
  raisedAmountMinor: number;
  goalAmountMinor: number;
  backerCount: number;
  endInDays: number;
  createdDaysAgo: number;
  status: CampaignStatus;
  featured?: boolean;
}

const seed: ReadonlyArray<CampaignSeed> = [
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
    endInDays: 18,
    createdDaysAgo: 12,
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
    endInDays: 7,
    createdDaysAgo: 23,
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
    endInDays: 25,
    createdDaysAgo: 5,
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
    endInDays: 3,
    createdDaysAgo: 40,
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
    endInDays: 14,
    createdDaysAgo: 30,
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
    endInDays: 30,
    createdDaysAgo: 8,
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
    endInDays: 45,
    createdDaysAgo: 1,
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
    endInDays: -2,
    createdDaysAgo: 35,
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
    endInDays: -5,
    createdDaysAgo: 45,
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
    endInDays: 5,
    createdDaysAgo: 28,
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
    endInDays: 21,
    createdDaysAgo: 10,
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
    endInDays: 60,
    createdDaysAgo: 2,
    status: "draft",
  },
  // Ek 12 kampanya — başarılı, yakın bitiş, yeni dağılımı
  {
    id: "cmp-13",
    slug: "tasiyici-bisiklet-prototipi",
    title: "Taşıyıcı Bisiklet Prototipi",
    shortDescription:
      "Şehir içi yük taşımacılığı için elektrikli destekli taşıyıcı bisiklet prototipi.",
    categorySlug: "teknoloji",
    creatorId: "cr-1",
    raisedAmountMinor: 18_500_000,
    goalAmountMinor: 15_000_000,
    backerCount: 642,
    endInDays: -10,
    createdDaysAgo: 55,
    status: "successful",
  },
  {
    id: "cmp-14",
    slug: "kirsal-okul-bilgisayar-laboratuvari",
    title: "Kırsal Okul Bilgisayar Laboratuvarı",
    shortDescription: "Bir kırsal okula 12 öğrenci kapasiteli ikinci el bilgisayar laboratuvarı.",
    categorySlug: "egitim",
    creatorId: "cr-7",
    raisedAmountMinor: 4_800_000,
    goalAmountMinor: 4_500_000,
    backerCount: 287,
    endInDays: -20,
    createdDaysAgo: 70,
    status: "successful",
  },
  {
    id: "cmp-15",
    slug: "minimal-deri-cuzdan",
    title: "Minimal Deri Cüzdan",
    shortDescription: "Tek parça bitkisel tabaklanmış deriden, üç kart bölmeli minimal cüzdan.",
    categorySlug: "tasarim",
    creatorId: "cr-3",
    raisedAmountMinor: 3_400_000,
    goalAmountMinor: 3_000_000,
    backerCount: 421,
    endInDays: 4,
    createdDaysAgo: 20,
    status: "live",
  },
  {
    id: "cmp-16",
    slug: "podcast-stuyosu-akustik-iyilestirme",
    title: "Podcast Stüdyosu Akustik İyileştirme",
    shortDescription:
      "Bağımsız podcast yapımcıları için ortak kullanıma açılacak akustik stüdyo.",
    categorySlug: "muzik",
    creatorId: "cr-5",
    raisedAmountMinor: 1_650_000,
    goalAmountMinor: 5_000_000,
    backerCount: 102,
    endInDays: 12,
    createdDaysAgo: 6,
    status: "live",
  },
  {
    id: "cmp-17",
    slug: "cocuk-resimli-kitabi",
    title: "Çocuk Resimli Kitabı",
    shortDescription: "5-8 yaş için arkadaşlık temalı, el çizimi resimli çocuk kitabı.",
    categorySlug: "yayincilik",
    creatorId: "cr-7",
    raisedAmountMinor: 9_400_000,
    goalAmountMinor: 4_000_000,
    backerCount: 612,
    endInDays: -30,
    createdDaysAgo: 90,
    status: "paid_out",
  },
  {
    id: "cmp-18",
    slug: "kompost-kovasi-balkon-icin",
    title: "Balkon İçin Kompost Kovası",
    shortDescription: "Apartman balkonlarına uygun, kokusuz tasarlanmış kapalı kompost kovası.",
    categorySlug: "tasarim",
    creatorId: "cr-6",
    raisedAmountMinor: 2_300_000,
    goalAmountMinor: 2_000_000,
    backerCount: 198,
    endInDays: 9,
    createdDaysAgo: 14,
    status: "live",
    featured: true,
  },
  {
    id: "cmp-19",
    slug: "bagimsiz-belgesel-film",
    title: "Bağımsız Belgesel Film",
    shortDescription:
      "Anadolu'da kaybolmakta olan zanaatları kayıt altına alan 70 dakikalık belgesel.",
    categorySlug: "sanat",
    creatorId: "cr-4",
    raisedAmountMinor: 6_700_000,
    goalAmountMinor: 12_000_000,
    backerCount: 245,
    endInDays: 16,
    createdDaysAgo: 18,
    status: "live",
  },
  {
    id: "cmp-20",
    slug: "masa-ustu-strateji-oyunu",
    title: "Masa Üstü Strateji Oyunu",
    shortDescription:
      "2-4 oyunculu, 60-90 dakika oynanış süreli orta zorlukta bir masa üstü strateji oyunu.",
    categorySlug: "oyun",
    creatorId: "cr-2",
    raisedAmountMinor: 11_900_000,
    goalAmountMinor: 8_000_000,
    backerCount: 731,
    endInDays: 2,
    createdDaysAgo: 33,
    status: "live",
  },
  {
    id: "cmp-21",
    slug: "atik-plastikten-mobilya",
    title: "Atık Plastikten Mobilya",
    shortDescription: "Geri dönüştürülmüş plastikten üretilmiş hafif ve modüler dış mekan mobilyası.",
    categorySlug: "tasarim",
    creatorId: "cr-1",
    raisedAmountMinor: 800_000,
    goalAmountMinor: 7_000_000,
    backerCount: 41,
    endInDays: 27,
    createdDaysAgo: 4,
    status: "live",
  },
  {
    id: "cmp-22",
    slug: "yerel-uretici-tarifleri-kitabi",
    title: "Yerel Üretici Tarifleri Kitabı",
    shortDescription:
      "Türkiye'nin farklı bölgelerinden 60 küçük üreticinin geleneksel tariflerini derleyen kitap.",
    categorySlug: "yayincilik",
    creatorId: "cr-4",
    raisedAmountMinor: 5_200_000,
    goalAmountMinor: 5_000_000,
    backerCount: 387,
    endInDays: -8,
    createdDaysAgo: 50,
    status: "successful",
  },
  {
    id: "cmp-23",
    slug: "ogrenci-mentorluk-platformu",
    title: "Öğrenci Mentörlük Platformu",
    shortDescription:
      "Üniversite öğrencilerini sektör profesyonelleriyle eşleştiren ücretsiz mentörlük programı.",
    categorySlug: "egitim",
    creatorId: "cr-6",
    raisedAmountMinor: 1_400_000,
    goalAmountMinor: 6_000_000,
    backerCount: 94,
    endInDays: 22,
    createdDaysAgo: 7,
    status: "live",
  },
  {
    id: "cmp-24",
    slug: "elle-dokunmus-hali-serisi",
    title: "Elle Dokunmuş Halı Serisi",
    shortDescription:
      "Anadolu motifleriyle dokunan, sınırlı sayıda üretilmiş el dokuma halı koleksiyonu.",
    categorySlug: "sanat",
    creatorId: "cr-3",
    raisedAmountMinor: 3_100_000,
    goalAmountMinor: 9_000_000,
    backerCount: 142,
    endInDays: 19,
    createdDaysAgo: 11,
    status: "live",
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
  endDate: daysFromNow(s.endInDays),
  createdAt: daysFromNow(-s.createdDaysAgo),
  status: s.status,
  featured: s.featured,
}));
