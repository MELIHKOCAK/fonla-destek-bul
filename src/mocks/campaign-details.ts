import type {
  Campaign,
  CampaignDetail,
  CampaignFaqItem,
  CampaignUpdate,
  Milestone,
  RewardTier,
  FundingPlanItem,
} from "@/types/campaign";

/**
 * Bir Campaign için deterministik detay verisi üretir.
 * Gerçek backend gelince bu repository ilgili tablolarla değiştirilir.
 */

const STORY = (title: string) =>
  `${title} projesi, bir ihtiyaca dürüst bir çözüm üretmek için yola çıktı. ` +
  `Geliştirme süreci boyunca topluluk geri bildirimleriyle iteratif olarak şekillendi; ` +
  `şimdi üretimi ve dağıtımı tamamlamak için topluluk desteğine ihtiyacımız var. ` +
  `Bu sayfada projenin nasıl ortaya çıktığını, neyi nasıl üreteceğimizi ve karşılaştığımız ` +
  `riskleri saydam biçimde paylaşıyoruz.\n\n` +
  `Topladığımız desteğin tamamı belirtilen plan dahilinde kullanılacaktır. ` +
  `Kampanya süresince ilerleyişi düzenli güncellemelerle paylaşacağız.`;

const FUNDING_PLAN: ReadonlyArray<FundingPlanItem> = [
  { label: "Üretim ve malzeme", percent: 55, description: "Kalıp, hammadde ve üretim hizmeti." },
  {
    label: "Lojistik ve kargo",
    percent: 15,
    description: "Destekçilere kargo, ambalaj ve sigorta.",
  },
  { label: "Platform komisyonu ve ödeme", percent: 8, description: "Platform ve ödeme hizmet bedeli." },
  { label: "Vergi ve yasal", percent: 10, description: "KDV ve faturalandırma yükümlülükleri." },
  { label: "Operasyon ve iletişim", percent: 12, description: "Tasarım, içerik ve müşteri destek." },
];

const RISKS =
  "Üretim süreçlerinde gecikme yaşanması, tedarik zincirinde fiyat dalgalanmaları ve " +
  "lojistik kaynaklı sapmalar en bilinen risklerdir. Bu durumda kampanya sayfasından " +
  "açık güncellemelerle ilerleyişi paylaşacağız. Hedefe ulaşılamazsa BeniFonla kuralları " +
  "uyarınca destek tutarları iade edilir; bu süreçte destekçilerden ek ücret talep edilmez.";

function milestones(start: Date): ReadonlyArray<Milestone> {
  const add = (days: number) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  };
  return [
    {
      id: "m-1",
      date: add(0),
      title: "Kampanya başlangıcı",
      description: "Kampanya yayına alındı, ön kayıt destekçileriyle iletişim kuruldu.",
    },
    {
      id: "m-2",
      date: add(20),
      title: "Üretim hazırlığı",
      description: "Tedarikçi anlaşmaları tamamlanır, üretim siparişi verilir.",
    },
    {
      id: "m-3",
      date: add(60),
      title: "İlk üretim partisi",
      description: "İlk parti üretim tamamlanır, kalite kontrol süreçleri uygulanır.",
    },
    {
      id: "m-4",
      date: add(90),
      title: "Kargo başlangıcı",
      description: "Destekçilere ödüller kargolanmaya başlar.",
    },
  ];
}

function rewardTiers(goalMinor: number): ReadonlyArray<RewardTier> {
  const base = Math.max(10_000, Math.round(goalMinor / 200));
  return [
    {
      id: "rt-1",
      title: "Teşekkür",
      description: "Projeye destek olun; web sitesinde teşekkür duvarında adınız yer alsın.",
      priceMinor: base,
      estimatedDelivery: "Kampanya bitiminden 1 ay sonra",
      claimed: 12,
    },
    {
      id: "rt-2",
      title: "Erken kuş",
      description: "İlk üretim partisinden, %10 indirimli özel destekçi fiyatı.",
      priceMinor: base * 5,
      estimatedDelivery: "Kampanya bitiminden 3 ay sonra",
      limit: 100,
      claimed: 64,
    },
    {
      id: "rt-3",
      title: "Standart paket",
      description: "Ürünün standart sürümünü ve sertifikalı destekçi rozetini içerir.",
      priceMinor: base * 8,
      estimatedDelivery: "Kampanya bitiminden 4 ay sonra",
      claimed: 138,
    },
    {
      id: "rt-4",
      title: "Koleksiyoner",
      description: "Sınırlı sayıda üretilen koleksiyoner sürüm, özel ambalaj ve imzalı sertifika.",
      priceMinor: base * 20,
      estimatedDelivery: "Kampanya bitiminden 5 ay sonra",
      limit: 25,
      claimed: 9,
    },
  ];
}

function updates(start: Date): ReadonlyArray<CampaignUpdate> {
  const add = (days: number) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
  };
  return [
    {
      id: "u-1",
      date: add(2),
      title: "Yayına başladık",
      body: "İlk gün desteklediğiniz için teşekkürler. Hedefimizin %15'ine ulaştık.",
    },
    {
      id: "u-2",
      date: add(7),
      title: "Üretim sürecine dair",
      body: "Tedarikçi görüşmeleri tamamlandı. Üretim planımızı netleştirdik.",
    },
  ];
}

const COMMENTS = [
  {
    id: "c-1",
    authorName: "destekçi-42",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    body: "Projeyi uzun süredir takip ediyordum, çok başarılı olmasını diliyorum.",
  },
  {
    id: "c-2",
    authorName: "merve.k",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    body: "Reward tier seçenekleri çok net, teşekkürler.",
  },
  {
    id: "c-3",
    authorName: "tuna",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    body: "Kargo Türkiye dışına da gönderilecek mi?",
  },
];

const FAQ: ReadonlyArray<CampaignFaqItem> = [
  {
    id: "f-1",
    question: "Hedefe ulaşılmazsa ne olur?",
    answer:
      "Belirlenen hedefe ulaşılmazsa BeniFonla kuralları gereğince destek tutarları iade edilir. " +
      "Bu süreçte destekçilerden ek ücret alınmaz.",
  },
  {
    id: "f-2",
    question: "Ödülleri ne zaman alacağım?",
    answer:
      "Tahmini teslim tarihleri her reward tier altında belirtilmiştir. " +
      "Süreçteki değişiklikler güncellemelerle duyurulur.",
  },
  {
    id: "f-3",
    question: "Kargo Türkiye dışına gönderiliyor mu?",
    answer: "Şimdilik yalnızca Türkiye içine kargo planlıyoruz.",
  },
];

export function buildCampaignDetail(c: Campaign): CampaignDetail {
  const start = new Date(c.createdAt);
  return {
    ...c,
    story: STORY(c.title),
    fundingPlan: FUNDING_PLAN,
    milestones: milestones(start),
    risks: RISKS,
    rewardTiers: rewardTiers(c.goalAmountMinor),
    updates: updates(start),
    comments: COMMENTS,
    faq: FAQ,
  };
}
