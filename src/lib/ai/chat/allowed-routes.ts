/**
 * AI sohbet için **önerilebilir** dahili route allowlist'i.
 *
 * - Yalnızca burada listelenen route'lar asistan tarafından önerilebilir.
 * - Dinamik segment içeren (kampanya slug'ı, kullanıcı adı, id) route'lar
 *   **yer almaz**: model bunları uydurmamalıdır.
 * - Bu liste yetkilendirme amacıyla **kullanılmaz**; yalnızca model çıktısı
 *   için güvenli bir öneri kümesidir.
 */
export const AI_CHAT_ALLOWED_ROUTES = [
  "/",
  "/discover",
  "/faq",
  "/how-it-works",
  "/login",
  "/register",
  "/forgot-password",
  "/dashboard/contributions",
  "/dashboard/payments",
  "/dashboard/refunds",
  "/dashboard/rewards",
  "/dashboard/favorites",
  "/notifications",
  "/creator/campaigns",
  "/creator/campaigns/new",
  "/settings/profile",
  "/settings/security",
  "/contact",
  "/refund-policy",
  "/prohibited-campaigns",
  "/risk-disclosure",
] as const;

export type AiChatAllowedRoute = (typeof AI_CHAT_ALLOWED_ROUTES)[number];
