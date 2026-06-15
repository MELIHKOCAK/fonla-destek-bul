/**
 * AI Chat — ortak TypeScript sözleşmeleri.
 *
 * Bu dosya yalnızca tip tanımları içerir; herhangi bir runtime kodu yoktur.
 * İstemci ve (gelecekte) sunucu tarafı bu tipleri paylaşır.
 */

// ---------------------------------------------------------------------------
// Primitive types
// ---------------------------------------------------------------------------

export type AiChatRole = "user" | "assistant";

/**
 * Desteklenen hata kodları.
 * Backend da aynı sabit kümeyi döndürmeli.
 */
export type AiChatErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "MESSAGE_TOO_LONG"
  | "CONTEXT_TOO_LARGE"
  | "AI_BALANCE_UNAVAILABLE"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_ERROR"
  | "CHAT_DISABLED";

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

/**
 * Tek bir sohbet mesajı.
 * - `id`        : `crypto.randomUUID()` ile üretilir.
 * - `createdAt` : ISO 8601 timestamp.
 */
export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * `POST /api/public/ai/chat` endpoint'ine gönderilen gövde.
 *
 * Dikkat: frontend'den ayrı bir `userId` / `role` alanı gönderilmez.
 * Backend rolü JWT üzerinden kendisi belirler.
 */
export interface AiChatRequest {
  /**
   * Bağlam mesajları — en eskiden en yeniye sıralı.
   * Maksimum uzunluk: `AI_CHAT_LIMITS.maxContextMessages`.
   */
  messages: AiChatMessage[];
  /**
   * Kullanıcının bulunduğu sayfa yolu (örn. `/campaigns/my-project`).
   * Backend, bağlama duyarlı yanıt oluşturmak için kullanabilir.
   */
  pathname: string;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/** Başarılı bir tamamlama yanıtı. */
export interface AiChatCompletedResponse {
  status: "completed";
  message: AiChatMessage;
}

/** Rate-limit aşımı yanıtı. */
export interface AiChatRateLimitedResponse {
  status: "rate_limited";
  retryAfterSeconds: number;
}

/** Hata yanıtı. */
export interface AiChatErrorResponse {
  status: "error";
  code: AiChatErrorCode;
  message: string;
}

/**
 * `POST /api/public/ai/chat` endpoint'inden dönen discriminated union yanıtı.
 *
 * `status` alanı ile daraltma yapılır:
 * ```ts
 * if (response.status === "completed") { response.message ... }
 * ```
 */
export type AiChatResponse =
  | AiChatCompletedResponse
  | AiChatRateLimitedResponse
  | AiChatErrorResponse;
