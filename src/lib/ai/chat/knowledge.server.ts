/**
 * BeniFonla AI sohbet — bilgi tabanı.
 *
 * Server-only. Sistem promptuna gömülen, küçük ve kontrollü bir özet.
 *
 * Kaynaklar:
 *  - docs/project-knowledge.md
 *  - docs/product-scope.md
 *  - docs/domain-glossary.md
 *  - docs/roles-and-permissions.md
 *  - docs/campaign-state-machine.md
 *  - docs/contribution-payment-state-machine.md
 *  - docs/money-flow.md
 *  - src/routes/faq.tsx, src/routes/how-it-works.tsx
 *  - Güncel TanStack route ağacı (src/routes/**)
 *
 * Kurallar:
 *  - Yalnızca **doğrulanmış ve güncel** platform bilgisi içerir.
 *  - Eski/güncelliğini kaybetmiş ifadeler (örn. "backend yok") **dahil
 *    edilmez**.
 *  - RAG veya embedding kullanılmaz; içerik tek dosyada okunabilir
 *    biçimde tutulur ve `AI_CHAT_KNOWLEDGE_VERSION` ile versiyonlanır.
 *  - Değişiklik yapıldığında sürüm artırılmalı ve `prompt.server.ts`
 *    tarafından tekrar derlenmelidir.
 */

export const AI_CHAT_KNOWLEDGE_VERSION = "kb-2026-06-15" as const;

/** Bilgi tabanının tek bir bölümü. */
export interface KnowledgeSection {
  /** Stabil kimlik (versiyonlama / log için). */
  readonly id: string;
  /** Sistem promptunda görünen başlık. */
  readonly title: string;
  /** Markdown gövde (Türkçe). */
  readonly body: string;
}

const SECTIONS: readonly KnowledgeSection[] = [
  {
    id: "platform",
    title: "Platform",
    body: `
- **BeniFonla**, kullanıcıların ürünlerini, yaratıcı fikirlerini ve projelerini, **belirli bir hedef tutar ve süreyle** destek toplayarak hayata geçirebildiği **ödül (reward) temelli kitle fonlama** platformudur.
- BeniFonla **kesinlikle**:
  - bir **yatırım** platformu **değildir**,
  - **hisse / ortaklık / menkul kıymet** satışı **değildir**,
  - **faiz, kâr payı, finansal getiri** vaadi **vermez**,
  - bir **kullanıcı cüzdanı / bakiye / saklama** ürünü **değildir**,
  - **P2P borç verme** değildir.
- Backer'ın bir kampanyaya verdiği destek yalnızca o kampanyanın tanımladığı **reward tier** karşılığında ödül talep hakkı doğurur; finansal getiri talebi doğurmaz.
- MVP'de para birimi yalnızca **TRY**, arayüz dili yalnızca **Türkçe**'dir.
`.trim(),
  },
  {
    id: "roles",
    title: "Roller ve yetkiler",
    body: `
- **Guest**: hesabı yok. \`live\` ve \`successful\` kampanyaları görüntüler, arar, filtreler, herkese açık creator profilini görür. Destek veremez, yorum/favori/şikâyet oluşturamaz, kampanya açamaz.
- **User**: kayıtlı kullanıcı. Profilini yönetir, favori ekler, takip eder, yorum yapar, şikâyet oluşturur.
- **Backer**: bir kampanyaya destek (contribution) gönderen User. Kalıcı bir rol değil, **eylem bazlı** bir ilişkidir.
- **Creator**: bir kampanyayı açıp yürüten User. Kalıcı bir kullanıcı tipi değil, **kampanya bazlı sahiplik** ilişkisidir. Aynı kişi başka bir kampanyada Backer olabilir.
- **Moderator**: kampanya başvurularını ve içerik şikâyetlerini inceler.
- **Admin**: platform yapılandırması, finans gözetimi ve kullanıcı yönetimi yapar. Finans kaydını **doğrudan değiştiremez**; yalnızca izin verilen durum geçişlerini tetikler.
`.trim(),
  },
  {
    id: "auth",
    title: "Kayıt, giriş ve şifre sıfırlama",
    body: `
- E-posta + parola ile **kayıt**, **giriş**, **çıkış** desteklenir.
- Kayıt sonrası **e-posta doğrulama** akışı çalışır.
- Parolasını unutan kullanıcı **şifre sıfırlama** akışını e-posta üzerinden tetikler: \`/forgot-password\` adresinden istek gönderilir, e-postadaki bağlantı ile \`/reset-password\` sayfasında yeni parola belirlenir.
- Oturum güvenli biçimde yenilenir ve sonlandırılır.
- Kullanıcı ilk girişte gerekirse \`/onboarding\` adımını tamamlar.
`.trim(),
  },
  {
    id: "campaign-create",
    title: "Kampanya oluşturma ve çok adımlı sihirbaz",
    body: `
- Creator, \`/creator/campaigns\` panelinden **yeni kampanya** başlatır (\`/creator/campaigns/new\`).
- Kampanya, **çok adımlı sihirbaz** ile hazırlanır: temel bilgi, hikâye, görseller, hedef tutar, süre, kategori, reward tier'lar.
- Her adım otomatik olarak **taslak** (\`draft\`) durumunda kaydedilir; Creator daha sonra \`/creator/campaigns/:id/edit/:step\` üzerinden düzenlemeye devam edebilir.
- Önizleme \`/creator/campaigns/:id/preview\` adresinde yayın öncesi görünümü gösterir.
- Hazır olduğunda Creator kampanyayı **incelemeye gönderir** ve durum \`submitted\` olur.
`.trim(),
  },
  {
    id: "campaign-lifecycle",
    title: "Kampanya yaşam döngüsü",
    body: `
- Durumlar: \`draft\` → \`submitted\` → \`under_review\` → \`revision_requested\` / \`approved\` / \`rejected\` → \`scheduled\` → \`live\` → \`successful\` / \`failed\` / \`suspended\` / \`cancelled\`.
- \`revision_requested\`: Moderator/Admin düzeltme ister; Creator düzenleyip yeniden gönderir.
- \`approved\`: onaylanmış, başlangıç tarihi bekleniyor.
- \`scheduled\`: başlangıç tarihi gelecekte; sistem otomatik olarak \`live\`'a alır.
- \`live\`: yayında; destek kabul ediyor.
- Süre bitiminde hedef tutmuşsa \`successful\`, tutmamışsa \`failed\` olur. Model **all-or-nothing**'tır.
- \`successful\` → \`payout_pending\` → \`paid_out\` (terminal başarı).
- \`failed\` veya \`cancelled\` → \`refunding\` → \`refunded\` (terminal iade).
- Durum geçişleri **yalnızca sunucuda** ve uygun yetkiyle yapılır; istemciden gelen \`status\` değeri dikkate alınmaz. Her geçiş audit log ve bildirim üretir.
`.trim(),
  },
  {
    id: "contribution",
    title: "Destek (contribution) akışı",
    body: `
- Backer, kampanya detayında bir **reward tier** seçer veya tier'sız serbest tutar belirler (\`/campaigns/:slug/back\` adımları: \`reward\`, \`details\`, \`review\`, \`result\`).
- Ödeme şu an **sandbox** sağlayıcısı üzerinden tamamlanır; gerçek tahsilat hukuki uyum sonrası açılır. Sandbox'ta gerçek para hareketi olmaz.
- \`Contribution\` ve \`Payment\` **ayrı varlıklardır**. Tek bir contribution birden fazla payment attempt'ine sahip olabilir (başarısız → tekrar dene).
- Contribution durumları: \`initiated\`, \`payment_pending\`, \`paid\`, \`failed\`, \`cancelled\`, \`refund_pending\`, \`refunded\`, \`disputed\`, \`chargeback\`.
- Bir payment \`captured\` olduğunda contribution \`paid\` olur ve kampanya toplamına yansır.
- Backer kendi destek geçmişini \`/dashboard/contributions\`, ödemelerini \`/dashboard/payments\`, iadelerini \`/dashboard/refunds\`, ödüllerini \`/dashboard/rewards\` üzerinden görür.
`.trim(),
  },
  {
    id: "money",
    title: "İade ve payout",
    body: `
- Tüm para tutarları **TRY kuruşu cinsinden integer** olarak saklanır; float kullanılmaz.
- Finansal hareketler **append-only ledger** üzerinden izlenir. Hiçbir kayıt silinmez; düzeltme **ters kayıt** ile yapılır.
- **İade (refund)**: Kampanya \`failed\` veya \`cancelled\` olursa, başarılı destekler otomatik olarak iade sürecine alınır. Süreç tamamlandığında ilgili contribution \`refunded\` olur.
- **Payout**: \`successful\` kampanyada toplanan fonlardan **platform komisyonu** ve **provider fee** düşülür, kalan tutar \`payout_pending\` aşamasından geçerek Creator'ın **payment account**'ına aktarılır (\`/creator/payment-account\`).
- BeniFonla bir cüzdan ürünü değildir; kullanıcılar platformda bakiye tutamaz.
`.trim(),
  },
  {
    id: "panels",
    title: "Paneller ve bildirimler",
    body: `
- **Kullanıcı paneli** (\`/dashboard\`): destekler, ödemeler, iadeler, ödüller, favoriler.
- **Creator paneli** (\`/creator\`): kampanyalarım, yeni kampanya, kampanya genel bakış, düzenleme, önizleme, inceleme durumu, güncellemeler, destekçiler, analitik, finans, ödeme hesabı.
- **Admin paneli** (\`/admin\`): kampanya inceleme kuyruğu, kampanya geçmişi, sistem uyarıları, audit log.
- **Bildirim merkezi** (\`/notifications\`): kampanya durum değişiklikleri, destek sonuçları, iade ve payout güncellemeleri kullanıcıya bildirilir.
- **Ayarlar** (\`/settings\`): profil, hesap, bildirim tercihleri, güvenlik.
`.trim(),
  },
  {
    id: "support",
    title: "Yardım, SSS ve iletişim",
    body: `
- **Nasıl çalışır?**: \`/how-it-works\` — kampanya ve destek sürecini özetler.
- **Sık sorulan sorular**: \`/faq\` — kayıt, kampanya, destek, ödeme, iade ve güvenlik konularındaki yaygın soruların yanıtları.
- **İletişim**: \`/contact\` — destek talebi formu.
- **Yasal sayfalar**: \`/terms\`, \`/privacy\`, \`/cookies\`, \`/refund-policy\`, \`/risk-disclosure\`, \`/creator-agreement\`, \`/prohibited-campaigns\`, \`/complaints-and-appeals\`.
`.trim(),
  },
  {
    id: "routes",
    title: "Uygulama içi başlıca route'lar",
    body: `
Herkese açık:
- \`/\` ana sayfa, \`/discover\` keşfet, \`/search\` arama, \`/categories/:slug\` kategori
- \`/campaigns/:slug\` kampanya detayı, \`/campaigns/:slug/back/*\` destek adımları
- \`/creators/:username\` herkese açık creator profili
- \`/how-it-works\`, \`/faq\`, \`/contact\`, \`/about\`
- \`/login\`, \`/register\`, \`/forgot-password\`, \`/reset-password\`, \`/auth/callback\`

Kullanıcı (auth gerekli):
- \`/dashboard\`, \`/dashboard/contributions\`, \`/dashboard/payments\`, \`/dashboard/refunds\`, \`/dashboard/rewards\`, \`/dashboard/favorites\`
- \`/notifications\`, \`/onboarding\`
- \`/settings\`, \`/settings/profile\`, \`/settings/account\`, \`/settings/security\`, \`/settings/notifications\`

Creator:
- \`/creator\`, \`/creator/campaigns\`, \`/creator/campaigns/new\`
- \`/creator/campaigns/:id/overview|edit/:step|preview|review|updates|backers|analytics|finance\`
- \`/creator/payment-account\`

Admin:
- \`/admin\`, \`/admin/campaign-reviews\`, \`/admin/campaign-reviews/:campaignId\`
- \`/admin/campaigns/:campaignId/history\`, \`/admin/system-alerts\`, \`/admin/audit\`
`.trim(),
  },
  {
    id: "boundaries",
    title: "AI sohbet sınırları",
    body: `
- Sohbet yalnızca **genel platform bilgisi** ve **kullanım rehberliği** sunar.
- Kullanıcının kişisel ödeme, destek, iade, bildirim veya hesap verisi sohbete dahil edilmez; gerekli durumlarda ilgili panel sayfasına yönlendirme yapılır.
- Belirli bir kampanyanın başarı tahmini, beklenen gelir veya yatırım değerlendirmesi yapılmaz.
- Finansal, hukuki veya vergi tavsiyesi verilmez.
`.trim(),
  },
] as const;

/** Bilgi tabanı bölümlerini salt-okunur olarak döndürür. */
export function getAiChatKnowledgeSections(): readonly KnowledgeSection[] {
  return SECTIONS;
}

/**
 * Bilgi tabanını sistem promptuna gömülecek tek bir markdown bloğu olarak derler.
 * Çıktı küçük ve deterministiktir; aynı sürüm aynı metni üretir.
 */
export function renderAiChatKnowledge(): string {
  const header = `# BeniFonla — Bilgi tabanı (${AI_CHAT_KNOWLEDGE_VERSION})`;
  const body = SECTIONS.map(
    (section) => `## ${section.title}\n${section.body}`,
  ).join("\n\n");
  return `${header}\n\n${body}`;
}
