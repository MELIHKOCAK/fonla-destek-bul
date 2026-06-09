import type { AuthError } from "@supabase/supabase-js";

/**
 * Generic, user-safe error messages in Turkish.
 * Avoid leaking technical details or account existence info.
 */
export function mapAuthError(error: unknown, fallback = "Bir hata oluştu. Lütfen tekrar deneyin."): string {
  if (!error) return fallback;
  const e = error as Partial<AuthError> & { message?: string; status?: number; code?: string };
  const msg = (e.message ?? "").toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (msg.includes("email not confirmed")) {
    return "E-posta adresinizi doğrulamanız gerekiyor.";
  }
  if (msg.includes("rate limit") || e.status === 429) {
    return "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    // Don't reveal existence in signup flows; the caller should swallow this.
    return "Bu işlem tamamlanamadı.";
  }
  if (msg.includes("password")) {
    return "Şifre gereksinimleri karşılanmıyor.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Ağ hatası. Bağlantınızı kontrol edin.";
  }
  if (msg.includes("token") && (msg.includes("expired") || msg.includes("invalid"))) {
    return "Bağlantının süresi dolmuş veya geçersiz. Lütfen tekrar deneyin.";
  }
  return fallback;
}
