/**
 * AI Chat — sessionStorage persistence katmanı.
 *
 * ### Saklanan veriler
 * - Yalnızca `user` ve `assistant` rolündeki mesajlar (id, role, content, createdAt).
 * - Sistem promptu saklanmaz.
 * - Access token, e-posta, kullanıcı ID'si veya profil verisi saklanmaz.
 * - Bilinmeyen alanlar Zod `.strip()` davranışıyla silinir.
 *
 * ### sessionStorage seçimi
 * Sekme kapandığında veri doğal olarak silinir; localStorage'a yazılmaz.
 *
 * ### SSR güvenliği
 * Her public fonksiyon, SSR ortamında `window` / `sessionStorage` erişimi
 * yapmadan güvenli biçimde erken döner.
 */

import { z } from "zod";
import { AiChatMessageSchema } from "./schema";
import { AI_CHAT_STORAGE_KEY, AI_CHAT_LIMITS } from "./constants";
import type { AiChatMessage } from "./types";

// ---------------------------------------------------------------------------
// Storage şeması
// ---------------------------------------------------------------------------

/**
 * Depolama şeması.
 *
 * - `AiChatMessageSchema` zaten `role: "user" | "assistant"` ile kısıtlıdır.
 *   Sistem promptu veya bilinmeyen rol bu adımda reddedilir.
 * - Zod varsayılan olarak bilinmeyen alanları strip eder → PII sızdırmaz.
 * - Maksimum `maxStoredMessages` eleman kabul edilir.
 */
const StoredMessagesSchema = z
  .array(AiChatMessageSchema)
  .max(
    AI_CHAT_LIMITS.maxStoredMessages,
    `Depolanan mesaj sayısı ${AI_CHAT_LIMITS.maxStoredMessages} sınırını aşıyor.`,
  );

type StoredMessages = z.infer<typeof StoredMessagesSchema>;

// ---------------------------------------------------------------------------
// SSR koruyucu
// ---------------------------------------------------------------------------

/**
 * Ortamın tarayıcı (istemci) tarafında çalışıp çalışmadığını kontrol eder.
 * SSR (Next.js / TanStack Start server render) sırasında `false` döner.
 */
function isClientEnvironment(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof sessionStorage !== "undefined"
  );
}

// ---------------------------------------------------------------------------
// Güvenli sessionStorage erişim yardımcıları (internal)
// ---------------------------------------------------------------------------

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (err) {
    console.error(
      "[ai-chat:storage] sessionStorage.getItem failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (err) {
    // Kapasite dolması (QuotaExceededError) veya private mode kısıtlaması.
    console.error(
      "[ai-chat:storage] sessionStorage.setItem failed:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    console.error(
      "[ai-chat:storage] sessionStorage.removeItem failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// JSON parse yardımcısı (internal)
// ---------------------------------------------------------------------------

function safeParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * sessionStorage'daki sohbet geçmişini yükler.
 *
 * Hata durumları:
 * - SSR → boş dizi.
 * - `sessionStorage` erişim hatası → boş dizi, hata loglanır.
 * - Bozuk JSON → storage temizlenir, boş dizi döner, hata loglanır.
 * - Zod şeması geçersiz (eski format, bozuk veri) → storage temizlenir,
 *   boş dizi döner, detaylar loglanır.
 *
 * @returns Geçerli `AiChatMessage[]` — hiçbir zaman `null` döndürmez.
 */
export function loadChatMessages(): AiChatMessage[] {
  if (!isClientEnvironment()) return [];

  const raw = safeGetItem(AI_CHAT_STORAGE_KEY);
  if (!raw) return [];

  const jsonResult = safeParseJson(raw);
  if (!jsonResult.ok) {
    console.error(
      "[ai-chat:storage] corrupt JSON in sessionStorage — clearing storage.",
    );
    safeRemoveItem(AI_CHAT_STORAGE_KEY);
    return [];
  }

  const validation = StoredMessagesSchema.safeParse(jsonResult.value);
  if (!validation.success) {
    const detail = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error(
      "[ai-chat:storage] schema validation failed — clearing storage. Issues:",
      detail,
    );
    safeRemoveItem(AI_CHAT_STORAGE_KEY);
    return [];
  }

  return validation.data;
}

/**
 * Mesaj dizisini sessionStorage'a yazar.
 *
 * İşlemler sırasıyla:
 * 1. SSR ise çık.
 * 2. `user` ve `assistant` dışındaki mesajları filtrele.
 * 3. `maxStoredMessages` sınırı için en eski mesajları at (sondan kes).
 * 4. Zod ile doğrula — geçersiz yapı hiçbir koşulda yazılmaz.
 * 5. `sessionStorage`'a yaz; yazım hatası loglanır.
 */
export function saveChatMessages(messages: ReadonlyArray<AiChatMessage>): void {
  if (!isClientEnvironment()) return;

  // Adım 1: Yalnızca izin verilen roller — sistem promptu veya bilinmeyen rol elenir.
  const allowedOnly = messages.filter(
    (m): m is AiChatMessage =>
      m.role === "user" || m.role === "assistant",
  );

  // Adım 2: maxStoredMessages — en eski mesajlar atılır (sliding window).
  const trimmed: StoredMessages = allowedOnly.slice(
    -AI_CHAT_LIMITS.maxStoredMessages,
  );

  // Adım 3: Zod doğrulaması — bu aynı zamanda bilinmeyen alanları strip eder.
  const validation = StoredMessagesSchema.safeParse(trimmed);
  if (!validation.success) {
    // Bu dalın tetiklenmesi programlama hatası olduğundan detaylı logla.
    const detail = validation.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error(
      "[ai-chat:storage] saveChatMessages: validation failed — write aborted. Issues:",
      detail,
    );
    return;
  }

  safeSetItem(AI_CHAT_STORAGE_KEY, JSON.stringify(validation.data));
}

/**
 * sessionStorage'daki sohbet geçmişini temizler.
 *
 * İki durumda çağrılır:
 * 1. Kullanıcı "Sohbeti temizle" düğmesine basar.
 * 2. Kullanıcı oturumu kapatır (logout).
 *
 * SSR ortamında güvenle çağrılabilir; erken döner.
 */
export function clearChatMessages(): void {
  if (!isClientEnvironment()) return;
  safeRemoveItem(AI_CHAT_STORAGE_KEY);
}
