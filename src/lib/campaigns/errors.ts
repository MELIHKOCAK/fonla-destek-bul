/**
 * Backend RPC hata kodlarını kullanıcıya gösterilecek Türkçe mesajlara çevirir.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "başlık",
  short_description: "kısa açıklama",
  story_content: "hikâye",
  funds_usage_content: "fon kullanım planı",
  timeline_content: "takvim",
  risks_content: "riskler",
  goal_amount_minor: "hedef tutar",
  start_at: "başlangıç tarihi",
  end_at: "bitiş tarihi",
  dates_order: "tarih sırası",
  duration_too_short: "kampanya süresi (çok kısa)",
  duration_too_long: "kampanya süresi (çok uzun)",
  category_id: "kategori",
  cover_media: "kapak görseli",
  reward_tiers: "en az bir aktif ödül",
};

export interface MappedError {
  code: string;
  message: string;
  fields?: string[];
}

export function mapCampaignError(err: unknown): MappedError {
  const obj = err as { code?: string; message?: string };
  const message = obj?.message ?? "";
  if (message.startsWith("BFL_VALIDATION")) {
    const raw = message.split(":")[1]?.trim() ?? "";
    const fields = raw.split(",").filter(Boolean);
    const labels = fields.map((f) => FIELD_LABELS[f] ?? f).join(", ");
    return {
      code: "BFL_VALIDATION",
      message: `Eksik veya hatalı alanlar: ${labels}`,
      fields,
    };
  }
  if (message.includes("BFL_CONFLICT")) {
    return { code: "BFL_CONFLICT", message: "Bu kampanya başka bir sekmede güncellenmiş. Sayfayı yenileyin." };
  }
  if (message.includes("BFL_NOT_EDITABLE")) {
    return { code: "BFL_NOT_EDITABLE", message: "Bu kampanya artık düzenlenemiyor." };
  }
  if (message.includes("BFL_NOT_SUBMITTABLE")) {
    return { code: "BFL_NOT_SUBMITTABLE", message: "Bu kampanya incelemeye gönderilemez." };
  }
  if (message.includes("BFL_FORBIDDEN")) {
    return { code: "BFL_FORBIDDEN", message: "Bu işlem için yetkiniz yok." };
  }
  if (message.includes("BFL_NOT_FOUND")) {
    return { code: "BFL_NOT_FOUND", message: "Kampanya bulunamadı." };
  }
  if (message.includes("BFL_INVALID_TITLE")) {
    return { code: "BFL_INVALID_TITLE", message: "Başlık 5-80 karakter arasında olmalı." };
  }
  if (message.includes("BFL_INVALID_CATEGORY")) {
    return { code: "BFL_INVALID_CATEGORY", message: "Geçerli bir kategori seçin." };
  }
  if (message.includes("BFL_INVALID_GOAL")) {
    return { code: "BFL_INVALID_GOAL", message: "Hedef tutar 1.000 - 5.000.000 TL arasında olmalı." };
  }
  if (message.includes("BFL_INVALID_DATES") || message.includes("BFL_DURATION")) {
    return { code: "BFL_INVALID_DATES", message: "Tarih veya kampanya süresi geçersiz." };
  }
  return { code: "UNKNOWN", message: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
}
