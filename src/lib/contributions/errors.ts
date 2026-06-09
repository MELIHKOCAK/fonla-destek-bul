export const contributionErrorMessages: Record<string, string> = {
  BFL_NOT_AUTHENTICATED: "Devam etmek için giriş yapın.",
  BFL_RISK_NOT_ACKNOWLEDGED: "Risk bilgilendirmesini kabul etmelisiniz.",
  BFL_INVALID_IDEMPOTENCY: "Oturum anahtarı geçersiz. Sayfayı yenileyin.",
  BFL_INVALID_AMOUNT: "Destek tutarı geçersiz.",
  BFL_CAMPAIGN_NOT_FOUND: "Kampanya bulunamadı.",
  BFL_OWN_CAMPAIGN: "Kendi kampanyanıza destek olamazsınız.",
  BFL_CAMPAIGN_NOT_LIVE: "Bu kampanya şu an destek almıyor.",
  BFL_CAMPAIGN_NOT_OPEN: "Kampanya destek tarih aralığı dışında.",
  BFL_REWARD_NOT_FOUND: "Seçtiğiniz ödül bulunamadı.",
  BFL_REWARD_MISMATCH: "Ödül bu kampanyaya ait değil.",
  BFL_REWARD_INACTIVE: "Bu ödül artık aktif değil.",
  BFL_AMOUNT_BELOW_REWARD: "Tutar, ödül için belirlenen minimumdan düşük.",
  BFL_REWARD_SOLD_OUT: "Bu ödül kotası dolmuş.",
  BFL_SHIPPING_REQUIRED: "Bu ödül için teslimat bilgileri zorunlu.",
  BFL_SIMULATION_DISABLED: "Test ödeme simülasyonu bu ortamda kapalı.",
  BFL_NOT_TEST_ENV: "Bu destek test ortamında değil.",
  BFL_ALREADY_CAPTURED: "Bu destek için ödeme zaten tamamlanmış.",
  BFL_INVALID_SCENARIO: "Geçersiz simülasyon senaryosu.",
  BFL_NOT_FOUND: "Kayıt bulunamadı.",
  BFL_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  BFL_INVALID_TRANSITION: "Geçersiz durum geçişi.",
};

export function translateContributionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/BFL_[A-Z_]+/);
  if (match && contributionErrorMessages[match[0]]) {
    return contributionErrorMessages[match[0]];
  }
  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
}
