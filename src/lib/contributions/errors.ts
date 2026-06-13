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
  BFL_CURRENCY_UNSUPPORTED: "Bu kampanyanın para birimi ödeme sağlayıcısı tarafından desteklenmiyor.",
  BFL_CONTRIBUTION_NOT_FOUND: "Destek kaydı bulunamadı.",
  BFL_CONTRIBUTION_NOT_PAYABLE: "Bu destek için ödeme başlatılamaz.",
  BFL_PT_CREATE_FAILED: "Ödeme kaydı oluşturulamadı. Lütfen tekrar deneyin.",
  BFL_NO_CHECKOUT_URL: "Ödeme sağlayıcısı geçerli bir ödeme bağlantısı döndürmedi.",
};

// Domain ödeme hatalarını (Stripe / sağlayıcı kaynaklı) Türkçeleştirir.
const paymentDomainErrorMessages: Record<string, string> = {
  CAMPAIGN_NOT_PAYMENT_READY: "Bu kampanya henüz ödeme almaya hazır değil.",
  PAYMENT_PROVIDER_DISABLED: "Ödeme sağlayıcısı şu an devre dışı.",
  CREATOR_PAYMENT_ACCOUNT_MISSING: "Kampanya sahibinin ödeme hesabı henüz tanımlı değil.",
  CREATOR_PAYMENT_ACCOUNT_RESTRICTED: "Kampanya sahibinin ödeme hesabı kısıtlı.",
  CHECKOUT_EXPIRED: "Ödeme oturumunun süresi doldu. Lütfen tekrar başlatın.",
  PAYMENT_ACTION_REQUIRED: "Ödeme için ek doğrulama gerekiyor.",
  PAYMENT_FAILED: "Ödeme sağlayıcısı isteği reddetti.",
  DUPLICATE_PAYMENT_ATTEMPT:
    "Bu destek için zaten aktif bir ödeme oturumu var. Lütfen birkaç dakika sonra tekrar deneyin.",
  REWARD_UNAVAILABLE: "Seçilen ödül artık mevcut değil.",
  PAYMENT_ENVIRONMENT_MISMATCH: "Ödeme ortamı uyuşmuyor.",
  NOT_IMPLEMENTED: "Bu özellik henüz aktif değil.",
};

const PAYMENT_DOMAIN_CODE_RE = new RegExp(
  `\\b(${Object.keys(paymentDomainErrorMessages).join("|")})\\b`,
);

export function translateContributionError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // 1) BFL_* domain kodları
  const bflMatch = msg.match(/BFL_[A-Z_]+/);
  if (bflMatch && contributionErrorMessages[bflMatch[0]]) {
    return contributionErrorMessages[bflMatch[0]];
  }

  // 2) Ödeme sağlayıcısı domain hataları (DomainPaymentError)
  const payMatch = msg.match(PAYMENT_DOMAIN_CODE_RE);
  if (payMatch) {
    const base = paymentDomainErrorMessages[payMatch[1]];
    // Stripe message: kod ":" ayırıcısı sonrası ya da düz mesaj olabilir.
    const detail = msg.replace(payMatch[1], "").replace(/^[\s:,-]+/, "").trim();
    if (detail && detail !== payMatch[1]) {
      return `${base} (${detail.slice(0, 200)})`;
    }
    return base;
  }

  // 3) Bilinmeyen Error: kısa mesajı göster, yine de anlaşılır kalsın.
  if (msg && msg.length <= 240 && !/^\[object/.test(msg)) {
    return `Beklenmeyen bir hata oluştu: ${msg}`;
  }

  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
}
