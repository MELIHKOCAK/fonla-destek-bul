/**
 * Hukuki belge tanımı — tek-merkezli versiyon kaydı.
 * `status` "draft" iken sayfada uyarı bandı gösterilir ve production yayın
 * kapısı (release_gates.legal_documents_approved) açılmaz.
 */
export type LegalDocStatus = "draft" | "approved" | "published";

export interface LegalDoc {
  slug: string;
  title: string;
  version: string;
  status: LegalDocStatus;
  effectiveAt: string | null; // ISO veya null
  summary: string;
  body: ReadonlyArray<{ heading: string; paragraphs: ReadonlyArray<string> }>;
}

const PLACEHOLDER_NOTE =
  "Bu metin hukukçu onayı bekleyen taslaktır. Yürürlüğe girmeden önce profesyonel inceleme zorunludur.";

export const LEGAL_DOCS: ReadonlyArray<LegalDoc> = [
  {
    slug: "terms",
    title: "Kullanım Şartları",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "BeniFonla'yı kullanırken geçerli kurallar, hesap sorumluluğu, içerik standartları ve uyuşmazlık çözümü.",
    body: [
      {
        heading: "1. Hizmetin Tanımı",
        paragraphs: [
          "BeniFonla; yaratıcıların ürün, fikir ve projeleri için tanımlı hedef ve süre ile destek topladığı, ödül/destek bazlı bir kitle fonlama platformudur.",
          "BeniFonla bir yatırım, hisse, faiz veya kâr payı dağıtım platformu değildir. Backer'lar finansal yatırımcı değildir.",
        ],
      },
      {
        heading: "2. Hesap ve Sorumluluklar",
        paragraphs: [
          "Doğru ve güncel bilgi sağlamakla yükümlüsünüz. Hesabınızdan yapılan tüm işlemlerden siz sorumlusunuz.",
        ],
      },
      {
        heading: "3. Uyuşmazlık Çözümü",
        paragraphs: [PLACEHOLDER_NOTE],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Gizlilik Politikası",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Hangi kişisel verileri hangi amaçla işliyoruz, ne kadar süreyle saklıyoruz ve haklarınızı nasıl kullanabilirsiniz.",
    body: [
      {
        heading: "1. Veri Sorumlusu",
        paragraphs: [PLACEHOLDER_NOTE],
      },
      {
        heading: "2. İşlenen Veriler",
        paragraphs: [
          "Hesap: e-posta, kullanıcı adı, profil bilgileri. Katkı: ad-soyad faturalama için zorunluysa, ödeme sağlayıcıdan dönen kontrol bilgileri (kart bilgisi sistemimizde saklanmaz).",
        ],
      },
      {
        heading: "3. Haklarınız",
        paragraphs: [
          "Erişim, düzeltme, silme, taşınabilirlik talepleri için `/complaints-and-appeals` üzerinden başvurabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Çerez Politikası",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Hangi çerezleri zorunlu, hangilerini opsiyonel olarak kullanıyoruz; rıza nasıl yönetilir.",
    body: [
      {
        heading: "1. Zorunlu Çerezler",
        paragraphs: [
          "Oturum, güvenlik ve tercihiniz için temel çerezler kullanılır. Bu çerezler olmadan platform çalışmaz.",
        ],
      },
      {
        heading: "2. Analitik / Pazarlama",
        paragraphs: [
          "Şu an üçüncü taraf analitik veya pazarlama çerezi kullanılmamaktadır. Eklenmesi halinde önceden açık rızanız alınacaktır.",
        ],
      },
    ],
  },
  {
    slug: "refund-policy",
    title: "İade Politikası",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Başarısız kampanyalarda iade, başarılı kampanyalarda sınırlı iade ve uyuşmazlık süreci.",
    body: [
      {
        heading: "Başarısız Kampanya",
        paragraphs: [
          "Hedefe ulaşılamayan kampanyalarda backer'lara ödedikleri tutarın iadesi başlatılır. İade, ödeme sağlayıcı (Stripe) üzerinden yapılır; banka süreleri saklıdır.",
        ],
      },
      {
        heading: "Başarılı Kampanya",
        paragraphs: [
          "Kampanya hedefine ulaştıktan sonra iade, creator'ın taahhüdünü yerine getirememesi veya tüketici mevzuatı kapsamında değerlendirilir. Detaylar hukukçu onayı sonrası yayımlanır.",
        ],
      },
    ],
  },
  {
    slug: "risk-disclosure",
    title: "Risk Açıklaması",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Bir kampanyaya destek olmak yatırım değildir; ödül teslimi gecikebilir, başarısız olabilir veya değişebilir.",
    body: [
      {
        heading: "Bu bir yatırım değildir",
        paragraphs: [
          "Desteğiniz finansal getiri, faiz veya kâr payı vaat etmez. Hisse veya menkul kıymet satın almıyorsunuz.",
        ],
      },
      {
        heading: "Ödül teslim riski",
        paragraphs: [
          "Creator taahhüt ettiği ödülü zamanında veya hiç teslim edemeyebilir. BeniFonla aracıdır; ürünü üretmez, satmaz, garanti vermez.",
        ],
      },
    ],
  },
  {
    slug: "creator-agreement",
    title: "Creator Sözleşmesi",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Creator'ın yükümlülükleri, KYC, ödül teslimi, vergi sorumluluğu, Transfer ve Payout süreci.",
    body: [
      {
        heading: "Creator Yükümlülükleri",
        paragraphs: [
          "Doğru bilgi sunma, ödülleri taahhüt edildiği şekilde teslim etme, geri ödeme ve uyuşmazlık taleplerine zamanında yanıt verme.",
        ],
      },
      {
        heading: "Ödeme Akışı",
        paragraphs: [
          "Backer ödemesi Stripe Checkout ile alınır. Kampanya başarıyla tamamlandıktan sonra platform komisyonu düşülerek creator hesabına Stripe Connect Transfer yapılır. Stripe'ın creator'ın bankasına Payout işlemi ayrı bir aşamadır.",
        ],
      },
      { heading: "Vergi ve Faturalama", paragraphs: [PLACEHOLDER_NOTE] },
    ],
  },
  {
    slug: "prohibited-campaigns",
    title: "Yasaklı Kampanyalar",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "Yasal olmayan, yanıltıcı, hak ihlali içeren veya güvensiz içeriklere ilişkin kategoriler. Nihai kararı admin moderasyonu ve hukukçu inceleme verir.",
    body: [
      {
        heading: "Yasak Örnekleri",
        paragraphs: [
          "Yasadışı ürün ve hizmetler, silah, uyuşturucu, finansal getiri vaat eden kampanyalar, kumar, fikri mülkiyet ihlali içeren içerik, nefret söylemi, doğrulanmamış sağlık iddiaları.",
        ],
      },
      { heading: "İnceleme", paragraphs: [PLACEHOLDER_NOTE] },
    ],
  },
  {
    slug: "complaints-and-appeals",
    title: "Şikayet ve İtiraz",
    version: "0.1.0-draft",
    status: "draft",
    effectiveAt: null,
    summary:
      "İçerik moderasyonu, hesap askıya alma, veri talepleri ve iade uyuşmazlıkları için başvuru kanalı.",
    body: [
      {
        heading: "Nasıl başvurulur",
        paragraphs: [
          "support@benifonla.com adresinden veya admin paneli üzerinden başvurabilirsiniz. Yanıt süresi hedefi: 5 iş günü.",
        ],
      },
    ],
  },
];

export function findLegalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
