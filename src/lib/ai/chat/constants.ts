/**
 * AI Chat — limitler ve değişmez sabitler.
 *
 * Tüm limit değerleri bu dosyada merkezileştirilir; başka dosyalar
 * magic number yerine bu sabitlere atıfta bulunur.
 */

// ---------------------------------------------------------------------------
// Karakter / mesaj sınırları
// ---------------------------------------------------------------------------

/**
 * AI sohbet özelliğinin runtime sınırları.
 *
 * | Alan                 | Açıklama                                         |
 * |----------------------|--------------------------------------------------|
 * | maxMessageCharacters | Tek bir kullanıcı mesajının maksimum karakter sayısı |
 * | maxContextMessages   | Endpoint'e gönderilecek maksimum mesaj sayısı    |
 * | maxStoredMessages    | sessionStorage'da tutulacak maksimum mesaj sayısı |
 * | maxContextCharacters | Bağlamın toplam maksimum karakter uzunluğu        |
 */
export const AI_CHAT_LIMITS = {
  maxMessageCharacters: 1500,
  maxContextMessages: 12,
  maxStoredMessages: 20,
  maxContextCharacters: 12000,
} as const;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** sessionStorage anahtarı — sohbet geçmişini saklamak için. */
export const AI_CHAT_STORAGE_KEY = "benifonla-ai-chat-session-v1" as const;

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

/**
 * AI sohbet endpoint yolu.
 * Lovable tarafından backend implementasyonu tamamlandığında bu adres kullanılır.
 */
export const AI_CHAT_ENDPOINT = "/api/public/ai/chat" as const;
