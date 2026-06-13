import type {
  Campaign,
  CampaignDetail,
  CampaignFaqItem,
  CampaignUpdate,
  RewardTier,
} from "@/types/campaign";

/**
 * Bir Campaign için deterministik detay verisi üretir.
 * Gerçek backend gelince bu repository ilgili tablolarla değiştirilir.
 */

const STORY = (title: string) =>
  `<p>${title} projesi, bir ihtiyaca dürüst bir çözüm üretmek için yola çıktı. ` +
  `Geliştirme süreci boyunca topluluk geri bildirimleriyle iteratif olarak şekillendi; ` +
  `şimdi üretimi ve dağıtımı tamamlamak için topluluk desteğine ihtiyacımız var.</p>` +
  `<p>Topladığımız desteğin tamamı belirtilen plan dahilinde kullanılacaktır. ` +
  `Kampanya süresince ilerleyişi düzenli güncellemelerle paylaşacağız.</p>`;

const FUNDS_USAGE_HTML =
  `<ul>` +
  `<li><strong>Üretim ve malzeme (%55):</strong> Kalıp, hammadde ve üretim hizmeti.</li>` +
  `<li><strong>Lojistik ve kargo (%15):</strong> Destekçilere kargo, ambalaj ve sigorta.</li>` +
  `<li><strong>Platform komisyonu ve ödeme (%8):</strong> Platform ve ödeme hizmet bedeli.</li>` +
  `<li><strong>Vergi ve yasal (%10):</strong> KDV ve faturalandırma yükümlülükleri.</li>` +
  `<li><strong>Operasyon ve iletişim (%12):</strong> Tasarım, içerik ve müşteri destek.</li>` +
  `</ul>`;

const TIMELINE_HTML =
  `<ul>` +
  `<li><strong>Kampanya başlangıcı:</strong> Yayına alma ve ön kayıt destekçileriyle iletişim.</li>` +
  `<li><strong>Üretim hazırlığı (≈3. hafta):</strong> Tedarikçi anlaşmaları ve üretim siparişi.</li>` +
  `<li><strong>İlk üretim partisi (≈2. ay):</strong> Üretim ve kalite kontrol.</li>` +
  `<li><strong>Kargo başlangıcı (≈3. ay):</strong> Destekçilere ödüllerin gönderimi.</li>` +
  `</ul>`;

const RISKS =
  `<p>Üretim süreçlerinde gecikme yaşanması, tedarik zincirinde fiyat dalgalanmaları ve ` +
  `lojistik kaynaklı sapmalar en bilinen risklerdir. Bu durumda kampanya sayfasından ` +
  `açık güncellemelerle ilerleyişi paylaşacağız.</p>` +
  `<p>Hedefe ulaşılamazsa BeniFonla kuralları uyarınca destek tutarları iade edilir; ` +
  `bu süreçte destekçilerden ek ücret talep edilmez.</p>`;

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
    fundsUsage: FUNDS_USAGE_HTML,
    timeline: TIMELINE_HTML,
    risks: RISKS,
    rewardTiers: rewardTiers(c.goalAmountMinor),
    updates: updates(start),
    comments: COMMENTS,
    faq: FAQ,
  };
}
