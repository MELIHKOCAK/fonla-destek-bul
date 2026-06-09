/**
 * Admin RPC hatalarını Türkçe kullanıcı mesajlarına çevirir.
 */
export interface MappedAdminError {
  code: string;
  message: string;
  fields?: string[];
}

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
  category_id: "kategori",
  cover_media: "kapak görseli",
  reward_tiers: "en az bir aktif ödül",
};

export function mapAdminError(err: unknown): MappedAdminError {
  const message = (err as { message?: string })?.message ?? "";
  if (message.startsWith("BFL_VALIDATION")) {
    const raw = message.split(":")[1]?.trim() ?? "";
    const fields = raw.split(",").filter(Boolean);
    const labels = fields.map((f) => FIELD_LABELS[f] ?? f).join(", ");
    return {
      code: "BFL_VALIDATION",
      message: `Onay için eksik veya hatalı alanlar: ${labels}`,
      fields,
    };
  }
  if (message.includes("BFL_FORBIDDEN")) {
    return { code: "BFL_FORBIDDEN", message: "Bu işlem için admin yetkiniz yok." };
  }
  if (message.includes("BFL_NOT_AUTHENTICATED")) {
    return { code: "BFL_NOT_AUTHENTICATED", message: "Lütfen giriş yapın." };
  }
  if (message.includes("BFL_NOT_FOUND")) {
    return { code: "BFL_NOT_FOUND", message: "Kampanya bulunamadı." };
  }
  if (message.includes("BFL_CONFLICT")) {
    return { code: "BFL_CONFLICT", message: "Bu kampanya başka bir admin tarafından güncellendi. Sayfayı yenileyin." };
  }
  if (message.includes("BFL_INVALID_STATUS")) {
    return { code: "BFL_INVALID_STATUS", message: "Kampanya durumu bu işleme uygun değil." };
  }
  if (message.includes("BFL_REASON_REQUIRED")) {
    return { code: "BFL_REASON_REQUIRED", message: "Açıklama zorunlu (en az 10 karakter)." };
  }
  if (message.includes("BFL_INVALID_REASON_CODE")) {
    return { code: "BFL_INVALID_REASON_CODE", message: "Geçerli bir reddetme nedeni seçin." };
  }
  return { code: "UNKNOWN", message: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
}

export const REJECT_REASON_CODES = [
  { value: "policy", label: "Politika ihlali" },
  { value: "incomplete", label: "İçerik yetersiz / eksik" },
  { value: "duplicate", label: "Mükerrer kampanya" },
  { value: "risk", label: "Yüksek risk" },
  { value: "other", label: "Diğer" },
] as const;

export type RejectReasonCode = (typeof REJECT_REASON_CODES)[number]["value"];

export const REVISION_ISSUE_OPTIONS = [
  { value: "content", label: "İçerik / metin" },
  { value: "goal", label: "Hedef tutar" },
  { value: "media", label: "Görseller / medya" },
  { value: "rewards", label: "Ödüller" },
  { value: "risks", label: "Riskler" },
  { value: "legal", label: "Hukuki uyum" },
  { value: "other", label: "Diğer" },
] as const;

export type RevisionIssueCode = (typeof REVISION_ISSUE_OPTIONS)[number]["value"];
