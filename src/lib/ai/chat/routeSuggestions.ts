/**
 * AI Chat — sayfaya özgü hızlı soru haritası.
 *
 * ### Kullanım
 * ```ts
 * const suggestions = getRouteSuggestions("/creator/campaigns/new");
 * // → ["Yeni kampanya nasıl oluşturulur?", "Kampanyamı incelemeye nasıl gönderirim?"]
 * ```
 *
 * ### Prefix eşleştirme kuralları
 * - Haritadaki anahtar tam prefix olmalıdır.
 * - Eşleşme ancak sonraki karakter "/" veya string sonu ise geçerlidir.
 *   Örnek: "/creator/campaigns" → "/creator/campaigns/new" ✓
 *                                 "/creator/campaignsNew" ✗
 * - En uzun (en spesifik) prefix kazanır.
 * - Eşleşme yoksa `null` döner; caller rol tabanlı önerilere düşer.
 *
 * ### Güvenlik
 * - Haritada yalnızca UI önerileri (string[]) bulunur; kişisel veri yok.
 * - Dinamik segmentler (/campaigns/:id) prefix olarak filtrelenir;
 *   o route'a özgü öneriler parent prefix altına yazılır.
 */

// ---------------------------------------------------------------------------
// Route → öneri haritası
// ---------------------------------------------------------------------------

/**
 * Anahtarlar: route prefix (başında "/" ile, sonda "/" olmadan).
 * Değerler: en fazla 4 öneri (UI'de listelenecek).
 *
 * Dinamik segmentler için prefix yeterlidir:
 *   "/creator/campaigns/123/edit" → "/creator/campaigns" ile eşleşir.
 */
export const AI_CHAT_ROUTE_SUGGESTIONS = {
  // ── Genel keşif ──────────────────────────────────────────────────────────
  "/": [
    "BeniFonla nedir?",
    "Bir kampanyaya nasıl destek olurum?",
    "Kampanya hedefe ulaşmazsa ne olur?",
    "Ödül sistemi nasıl çalışır?",
  ],

  // ── Kampanya listeleme / keşif ────────────────────────────────────────────
  "/campaigns": [
    "Bir kampanyaya nasıl destek olurum?",
    "Kampanya hedefe ulaşmazsa ne olur?",
    "Ödül sistemi nasıl çalışır?",
    "Favorilere nasıl eklerim?",
  ],

  // ── Kullanıcı dashboard'u ─────────────────────────────────────────────────
  "/dashboard": [
    "Desteklerimi nereden görebilirim?",
    "Bildirimlerime nereden ulaşırım?",
    "Hesap bilgilerimi nasıl güncellerim?",
  ],

  // ── İadeler ──────────────────────────────────────────────────────────────
  "/dashboard/refunds": [
    "İade süreci nasıl çalışır?",
    "İade durumumu nereden görebilirim?",
  ],

  // ── Creator: kampanya yönetimi ────────────────────────────────────────────
  "/creator/campaigns": [
    "Yeni kampanya nasıl oluşturulur?",
    "Kampanyamı incelemeye nasıl gönderirim?",
    "Revizyon talebi ne demek?",
    "Kampanya analizlerini nereden görebilirim?",
  ],

  // ── Creator: analitik ────────────────────────────────────────────────────
  "/creator/analytics": [
    "Kampanya analizlerimi nasıl yorumlarım?",
    "Destek trendlerimi nereden görebilirim?",
    "Kampanyamın başarı oranı ne anlama gelir?",
  ],

  // ── Creator: ödeme çekme ──────────────────────────────────────────────────
  "/creator/payouts": [
    "Ödeme çekme işlemi nasıl çalışır?",
    "Ödeme ne zaman hesabıma yatar?",
    "Minimum çekim miktarı nedir?",
  ],

  // ── Profil / ayarlar ─────────────────────────────────────────────────────
  "/settings": [
    "Hesap bilgilerimi nasıl güncellerim?",
    "E-posta tercihlerimi nasıl yönetirim?",
    "Şifremi nasıl değiştiririm?",
  ],

  // ── Bildirimler ──────────────────────────────────────────────────────────
  "/notifications": [
    "Bildirim tercihlerimi nasıl ayarlarım?",
    "Hangi olaylar için bildirim alırım?",
  ],
} as const satisfies Record<string, readonly string[]>;

export type AiChatRouteKey = keyof typeof AI_CHAT_ROUTE_SUGGESTIONS;

// ---------------------------------------------------------------------------
// Prefix eşleştirici
// ---------------------------------------------------------------------------

/**
 * Verilen pathname için en spesifik prefix anahtarını ve önerilerini döner.
 *
 * Güvenli prefix kuralı: sonraki karakter "/" veya string sonu olmalı.
 *
 * @param pathname - TanStack Router'dan gelen `location.pathname`.
 *                   Yalnızca path kısmı; query string ve fragment içermemeli.
 * @returns Eşleşen öneri listesi veya eşleşme yoksa `null`.
 */
export function getRouteSuggestions(
  pathname: string,
): readonly string[] | null {
  // Güvenlik: query string veya fragment içeriyorsa temizle.
  const safePath = sanitizePathname(pathname);

  let bestKey: AiChatRouteKey | null = null;
  let bestLength = 0;

  for (const key of Object.keys(AI_CHAT_ROUTE_SUGGESTIONS) as AiChatRouteKey[]) {
    if (!isPrefixMatch(safePath, key)) continue;
    if (key.length > bestLength) {
      bestKey = key;
      bestLength = key.length;
    }
  }

  return bestKey !== null ? AI_CHAT_ROUTE_SUGGESTIONS[bestKey] : null;
}

// ---------------------------------------------------------------------------
// Yardımcılar (internal)
// ---------------------------------------------------------------------------

/**
 * Pathname'den query string ve fragment'ı çıkarır.
 * Sadece `/` ile başlayan path kısmını döner.
 */
function sanitizePathname(pathname: string): string {
  // TanStack Router location.pathname zaten temiz; bu savunmacı bir önlemdir.
  const questionIdx = pathname.indexOf("?");
  const hashIdx = pathname.indexOf("#");
  const endIdx = Math.min(
    questionIdx === -1 ? pathname.length : questionIdx,
    hashIdx === -1 ? pathname.length : hashIdx,
  );
  const cleaned = pathname.slice(0, endIdx);
  return cleaned || "/";
}

/**
 * `candidate` path'inin `prefix` ile başlayıp başlamadığını kontrol eder.
 *
 * Sonraki karakter "/" veya string sonu olmalı:
 * - "/creator/campaigns"  + "/creator/campaigns/new"  → true  ✓
 * - "/creator/campaigns"  + "/creator/campaigns"       → true  ✓
 * - "/creator/campaigns"  + "/creator/campaignsNew"    → false ✗
 */
function isPrefixMatch(candidate: string, prefix: string): boolean {
  if (!candidate.startsWith(prefix)) return false;
  if (candidate.length === prefix.length) return true;
  return candidate[prefix.length] === "/";
}
