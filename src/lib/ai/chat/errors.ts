import type { AiChatErrorCode, AiChatResponse } from "./types";

// ---------------------------------------------------------------------------
// Typed error class
// ---------------------------------------------------------------------------

/**
 * AI sohbet isteği sırasında oluşan hatalar için özel Error sınıfı.
 *
 * - `code`   : Backend'den dönen veya istemci tarafında üretilen hata kodu.
 * - `body`   : Tam sunucu yanıtı — loglama ve hata ayıklama için.
 * - `status` : HTTP durum kodu (varsa).
 */
export class AiChatRequestError extends Error {
  constructor(
    message: string,
    public readonly code: AiChatErrorCode,
    public readonly body?: AiChatResponse,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiChatRequestError";
  }
}

// ---------------------------------------------------------------------------
// Error code → kullanıcıya gösterilecek mesaj
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<AiChatErrorCode, string> = {
  INVALID_REQUEST: "Geçersiz istek. Lütfen mesajınızı kontrol edin.",
  UNAUTHORIZED: "Bu özelliği kullanmak için giriş yapmalısınız.",
  RATE_LIMITED: "Çok fazla istek gönderildi. Lütfen biraz bekleyin.",
  MESSAGE_TOO_LONG: "Mesajınız çok uzun. Lütfen kısaltın.",
  CONTEXT_TOO_LARGE: "Sohbet geçmişi çok uzun. Yeni sohbet başlatın.",
  AI_BALANCE_UNAVAILABLE: "AI servisi şu an kullanılamıyor. Lütfen daha sonra deneyin.",
  AI_PROVIDER_RATE_LIMITED: "AI servisi şu an yoğun. Lütfen biraz bekleyin.",
  AI_PROVIDER_ERROR: "AI servisi yanıt vermedi. Lütfen tekrar deneyin.",
  CHAT_DISABLED: "AI sohbet özelliği şu an devre dışı.",
} as const;

/**
 * Hata kodunu kullanıcıya gösterilecek Türkçe mesaja dönüştürür.
 * Tanınmayan kodlar için genel bir geri dönüş mesajı kullanılır.
 */
export function getAiChatErrorMessage(code: AiChatErrorCode): string {
  return ERROR_MESSAGES[code] ?? "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
}

/**
 * Sunucu yanıtının parse hatası için standart mesaj.
 * Kod akışı dışına çıkmadan tutarlı bir kullanıcı deneyimi sağlar.
 */
export const AI_CHAT_PARSE_ERROR_MESSAGE =
  "Sunucu yanıtı beklenmeyen bir formatta geldi." as const;
