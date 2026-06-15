import { supabase } from "@/integrations/supabase/client";
import type { AiChatRequest, AiChatResponse, AiChatRateLimitedResponse } from "./types";
import { AiChatRequestSchema, AiChatResponseSchema } from "./schema";
import { AiChatRequestError } from "./errors";
import { AI_CHAT_ENDPOINT } from "./constants";

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

/** Tek bir AI sohbet isteği için maksimum bekleme süresi (ms). */
const AI_CHAT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// ID üretme utility
// ---------------------------------------------------------------------------

/**
 * Benzersiz mesaj ID'si üretir.
 *
 * `crypto.randomUUID()` tarayıcı ve Node 19+ ortamlarında mevcuttur.
 * Ortamın UUID desteği yoksa (test ortamı, eski tarayıcı) Math.random
 * tabanlı RFC-4122 v4 uyumlu bir string üretilir; bu yol yalnızca
 * production olmayan ortamlar için güvenli fallback'tir.
 */
export function generateMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Güvenli olmayan fallback — yalnızca test/SSR ortamları için.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// AbortSignal yardımcısı
// ---------------------------------------------------------------------------

/**
 * Caller signal'ı ile dahili timeout signal'ını birleştirir.
 *
 * `AbortSignal.any` modern tarayıcılarda ve Node 20+'da mevcuttur.
 * Yoksa manuel bir controller ile aynı davranış sağlanır.
 */
function buildCompositeSignal(callerSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(AI_CHAT_TIMEOUT_MS);

  if (!callerSignal) return timeoutSignal;

  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }

  // Fallback: her iki signal da aynı controller'ı tetikler.
  const controller = new AbortController();
  if (callerSignal.aborted) {
    controller.abort(callerSignal.reason);
    return controller.signal;
  }

  const onAbort = () => controller.abort(callerSignal.reason);
  const onTimeout = () => controller.abort(timeoutSignal.reason);

  callerSignal.addEventListener("abort", onAbort, { once: true });
  timeoutSignal.addEventListener("abort", onTimeout, { once: true });

  return controller.signal;
}

// ---------------------------------------------------------------------------
// HTTP 429 → rate_limited yanıt dönüştürücü
// ---------------------------------------------------------------------------

/**
 * HTTP 429 yanıtından `rate_limited` AiChatResponse üretir.
 *
 * Öncelik sırası:
 * 1. Yanıt gövdesindeki `retryAfterSeconds` (schema-valid body varsa)
 * 2. `Retry-After` HTTP header'ı (tamsayı saniye)
 * 3. Varsayılan: 60 saniye
 */
async function extractRateLimitResponse(
  res: Response,
): Promise<AiChatRateLimitedResponse> {
  const DEFAULT_RETRY_AFTER = 60;
  let retryAfterSeconds = DEFAULT_RETRY_AFTER;

  // Retry-After header'ı oku (token değeri yok, güvenli).
  const headerValue = res.headers.get("retry-after");
  if (headerValue) {
    const parsed = parseInt(headerValue, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      retryAfterSeconds = parsed;
    }
  }

  // Gövdeden daha kesin değer almayı dene.
  try {
    const body = await res.clone().json() as unknown;
    const validated = AiChatResponseSchema.safeParse(body);
    if (validated.success && validated.data.status === "rate_limited") {
      return validated.data;
    }
    // Validated değil ama retryAfterSeconds alanı varsa kullan.
    if (
      typeof body === "object" &&
      body !== null &&
      "retryAfterSeconds" in body
    ) {
      const fromBody = (body as Record<string, unknown>).retryAfterSeconds;
      if (typeof fromBody === "number" && fromBody > 0) {
        retryAfterSeconds = fromBody;
      }
    }
  } catch {
    // Gövde parse edilemedi — header değerini kullanmaya devam et.
  }

  return { status: "rate_limited", retryAfterSeconds };
}

// ---------------------------------------------------------------------------
// Ana API fonksiyonu
// ---------------------------------------------------------------------------

/**
 * `POST /api/public/ai/chat` endpoint'ine istek gönderir.
 *
 * ### Davranış
 * - Request, göndermeden önce Zod şemasıyla doğrulanır.
 * - Supabase oturumu varsa `Authorization: Bearer <token>` header'ı eklenir;
 *   yoksa guest olarak (header olmadan) çağrı yapılır.
 * - Access token hiçbir log satırına yazılmaz.
 * - `AI_CHAT_TIMEOUT_MS` kadar bekler; aşılırsa `AbortError` fırlatır.
 * - Caller, kendi `AbortSignal`'ini geçerek isteği iptal edebilir.
 * - HTTP 429 ve response gövdesindeki `rate_limited` durumu `AiChatResponse`
 *   olarak döner — throw edilmez (bu bilinen bir uygulama durumu, hata değil).
 * - Ağ hatası, parse hatası ve bilinmeyen durum `AiChatRequestError` fırlatır.
 * - Hata mesajları teknik (İngilizce); UI katmanı `getAiChatErrorMessage()`
 *   ile Türkçe metni üretir.
 *
 * @param request  - Gönderilecek istek gövdesi.
 * @param signal   - (opsiyonel) Caller tarafından sağlanan iptal sinyali.
 *
 * @throws {AiChatRequestError}  Ağ hatası, request/response doğrulama hatası.
 * @throws {DOMException}        `name === "AbortError"` — caller signal tetiklendiyse.
 */
export async function sendAiChatMessage(
  request: AiChatRequest,
  signal?: AbortSignal,
): Promise<AiChatResponse> {
  // ── 1. Request'i Zod ile doğrula ─────────────────────────────────────────
  const requestValidation = AiChatRequestSchema.safeParse(request);
  if (!requestValidation.success) {
    const detail = requestValidation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new AiChatRequestError(
      `Request validation failed: ${detail}`,
      "INVALID_REQUEST",
    );
  }

  // ── 2. Supabase session token — log'a yazılmaz ────────────────────────────
  const { data: sessionData } = await supabase.auth.getSession();
  const hasToken = Boolean(sessionData.session?.access_token);

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (hasToken) {
    // Token değerini header'a yaz ama asla log'a ekleme.
    headers.authorization = `Bearer ${sessionData.session!.access_token}`;
  }
  // hasToken === false → guest modu, Authorization header'ı gönderilmez.

  // ── 3. AbortSignal: caller + timeout ────────────────────────────────────
  const compositeSignal = buildCompositeSignal(signal);

  // ── 4. Network isteği ────────────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(AI_CHAT_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(requestValidation.data),
      signal: compositeSignal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Timeout mu, yoksa caller abort mu?
      const isTimeout =
        compositeSignal.reason instanceof DOMException &&
        compositeSignal.reason.name === "TimeoutError";

      if (isTimeout) {
        console.error(
          "[ai-chat] request timed out after %dms",
          AI_CHAT_TIMEOUT_MS,
        );
        throw new AiChatRequestError(
          `Request timed out after ${AI_CHAT_TIMEOUT_MS}ms.`,
          "AI_PROVIDER_ERROR",
        );
      }

      // Caller tarafından iptal edildi — DOMException olarak yeniden fırlat,
      // böylece hook katmanı "iptal" ile "hata" arasında ayrım yapabilir.
      throw err;
    }

    // Diğer ağ hataları (DNS, CORS, offline…)
    console.error(
      "[ai-chat] network error:",
      err instanceof Error ? err.message : "unknown",
    );
    throw new AiChatRequestError(
      "Network request failed.",
      "AI_PROVIDER_ERROR",
    );
  }

  // ── 5. HTTP 429 — rate limit (gövdeden bağımsız olarak işle) ────────────
  if (res.status === 429) {
    const rateLimitedResponse = await extractRateLimitResponse(res);
    return rateLimitedResponse;
  }

  // ── 6. Yanıt gövdesini JSON olarak parse et ───────────────────────────────
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    // Parse hatası — token bilgisi yoktur, sadece HTTP status logla.
    console.error("[ai-chat] response JSON parse failed, http_status=%d", res.status);
    throw new AiChatRequestError(
      "Server response could not be parsed as JSON.",
      "AI_PROVIDER_ERROR",
      undefined,
      res.status,
    );
  }

  // ── 7. Response'u Zod ile doğrula ────────────────────────────────────────
  const responseValidation = AiChatResponseSchema.safeParse(raw);
  if (!responseValidation.success) {
    const detail = responseValidation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.code}`)
      .join("; ");
    console.error("[ai-chat] response schema validation failed:", detail);
    throw new AiChatRequestError(
      "Server response did not match expected schema.",
      "AI_PROVIDER_ERROR",
      undefined,
      res.status,
    );
  }

  // ── 8. rate_limited gövdeden geliyorsa doğrudan döndür ──────────────────
  // Bu bilinen bir uygulama durumu; throw edilmez.
  return responseValidation.data;
}
