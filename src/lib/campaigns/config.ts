/**
 * Kampanya wizard'ı için domain config — tek kaynak.
 * Aynı kurallar backend (RPC) tarafında da uygulanır.
 */
export const CAMPAIGN_LIMITS = {
  TITLE_MIN: 5,
  TITLE_MAX: 80,
  SHORT_DESC_MIN: 40,
  SHORT_DESC_MAX: 200,
  STORY_MIN: 300,
  STORY_MAX: 20_000,
  FUNDS_USAGE_MIN: 100,
  FUNDS_USAGE_MAX: 10_000,
  TIMELINE_MIN: 100,
  TIMELINE_MAX: 10_000,
  RISKS_MIN: 100,
  RISKS_MAX: 10_000,
  GOAL_MINOR_MIN: 100_000, // 1.000 TL
  GOAL_MINOR_MAX: 500_000_000, // 5.000.000 TL
  DURATION_DAYS_MIN: 7,
  DURATION_DAYS_MAX: 60,
  GALLERY_MAX: 10,
  REWARD_TIERS_MAX: 20,
  REWARD_AMOUNT_MIN_MINOR: 100, // 1 TL
  REWARD_TITLE_MAX: 80,
  REWARD_DESC_MAX: 1_000,
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  IMAGE_ACCEPT: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const WIZARD_STEPS = [
  "basics",
  "funding",
  "story",
  "funds-usage",
  "timeline",
  "risks",
  "media",
  "rewards",
  "submit",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const WIZARD_STEP_META: Record<WizardStep, { label: string; description: string }> = {
  basics: { label: "Temel bilgiler", description: "Başlık, kısa açıklama, kategori" },
  funding: { label: "Hedef ve süre", description: "Hedef tutar ve kampanya tarihleri" },
  story: { label: "Hikâye", description: "Kampanyanın detaylı anlatımı" },
  "funds-usage": { label: "Fon kullanımı", description: "Toplanan fonun nasıl kullanılacağı" },
  timeline: { label: "Takvim", description: "Üretim/teslimat planı" },
  risks: { label: "Riskler", description: "Karşılaşabileceğiniz zorluklar" },
  media: { label: "Görseller", description: "Kapak, galeri, video" },
  rewards: { label: "Ödüller", description: "Destekçi ödül paketleri" },
  submit: { label: "Gönder", description: "İncelemeye gönder" },
};

export function isWizardStep(value: string): value is WizardStep {
  return (WIZARD_STEPS as readonly string[]).includes(value);
}
