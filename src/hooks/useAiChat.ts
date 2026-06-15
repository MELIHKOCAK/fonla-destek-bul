/**
 * useAiChat — AI sohbet hook'u.
 *
 * ### Sorumluluklar
 * - sessionStorage geçmişini ilk açılışta yükler.
 * - Kullanıcı mesajını anında ekrana ekler (optimistic update).
 * - Backend yanıtını alınca assistant mesajını ekler; storage'a kaydeder.
 * - Hata durumunda kullanıcı mesajını korur (kayıp olmaz), retry mümkün olur.
 * - Karşılama mesajı yalnızca UI katmanında statik olarak gösterilir —
 *   ne backend'e gönderilir ne de storage'a yazılır.
 * - Component unmount olduğunda devam eden fetch iptal edilir.
 *
 * ### Kullanım
 * ```tsx
 * const { messages, sendMessage, clearMessages, isPending, error } = useAiChat();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";

import { sendAiChatMessage, generateMessageId } from "@/lib/ai/chat/api";
import {
  loadChatMessages,
  saveChatMessages,
  clearChatMessages,
} from "@/lib/ai/chat/storage";
import { AiChatRequestError } from "@/lib/ai/chat/errors";
import { AI_CHAT_LIMITS } from "@/lib/ai/chat/constants";
import type { AiChatMessage, AiChatErrorCode } from "@/lib/ai/chat/types";

// ---------------------------------------------------------------------------
// Yardımcı — context penceresi oluşturma
// ---------------------------------------------------------------------------

/**
 * Backend'e gönderilecek mesaj dizisini hazırlar.
 *
 * Kurallar (sırasıyla uygulanır):
 * 1. En son `maxContextMessages` mesajı al.
 * 2. Toplam içerik `maxContextCharacters`'ı aşıyorsa en eski mesajları çıkar.
 */
function buildContextWindow(
  messages: ReadonlyArray<AiChatMessage>,
): AiChatMessage[] {
  let window = messages
    .slice(-AI_CHAT_LIMITS.maxContextMessages)
    .map((m) => ({ ...m })); // shallow copy — orijinal mutasyonu engelle

  // Karakter sınırı kontrolü: en eski mesajları çıkar.
  while (window.length > 0) {
    const totalChars = window.reduce((acc, m) => acc + m.content.length, 0);
    if (totalChars <= AI_CHAT_LIMITS.maxContextCharacters) break;
    window = window.slice(1);
  }

  return window;
}

// ---------------------------------------------------------------------------
// Yardımcı — validation (hook içi, kullanıcıya gösterilecek hata)
// ---------------------------------------------------------------------------

/** Kullanıcı mesajını göndermeden önce doğrular. */
function validateUserInput(
  content: string,
): { ok: true } | { ok: false; code: AiChatErrorCode } {
  if (!content.trim()) {
    return { ok: false, code: "INVALID_REQUEST" };
  }
  if (content.length > AI_CHAT_LIMITS.maxMessageCharacters) {
    return { ok: false, code: "MESSAGE_TOO_LONG" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mutation payload tipi
// ---------------------------------------------------------------------------

interface SendPayload {
  userMessage: AiChatMessage;
  contextWindow: AiChatMessage[];
  pathname: string;
  signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// Hook dönüş tipi
// ---------------------------------------------------------------------------

export interface UseAiChatReturn {
  /** Ekrandaki tam mesaj listesi (karşılama mesajı dahil değil). */
  messages: AiChatMessage[];
  /**
   * Yeni kullanıcı mesajı gönderir.
   * Boş, yalnızca whitespace veya `maxMessageCharacters`'ı aşan içerik reddedilir.
   */
  sendMessage: (content: string) => void;
  /** Tüm mesajları temizler ve storage'ı sıfırlar. */
  clearMessages: () => void;
  /**
   * Son kullanıcı mesajını yeniden gönderir.
   * Hata durumunda kullanılabilir; messages listesindeki son user mesajını bulur.
   */
  retryLastMessage: () => void;
  /** Bir istek devam ediyor mu. */
  isPending: boolean;
  /**
   * Son hata kodu (varsa).
   * Yeni bir mesaj başarıyla gönderildiğinde `null` olur.
   */
  error: AiChatErrorCode | null;
  /**
   * Rate limit aşıldığında, saniye cinsinden bekleme süresi.
   * Rate limit yoksa `null`.
   */
  retryAfterSeconds: number | null;
  /**
   * `true` ise kullanıcı mesaj gönderebilir.
   * `false` nedenleri: istek devam ediyor, rate limit aktif.
   */
  canSend: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiChat(): UseAiChatReturn {
  // Mevcut pathname — backend'e bağlam için gönderilir.
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  // Mesaj listesi — sessionStorage'dan ilk değer yüklenir.
  const [messages, setMessages] = useState<AiChatMessage[]>(() =>
    loadChatMessages(),
  );

  // Rate-limit bekleme sayacı.
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  // Hata kodu.
  const [error, setError] = useState<AiChatErrorCode | null>(null);

  // Devam eden istek için AbortController referansı.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Component unmount olduğunda isteği iptal et.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Rate-limit sayacını geri say.
  useEffect(() => {
    if (retryAfterSeconds === null || retryAfterSeconds <= 0) return;

    const timerId = window.setInterval(() => {
      setRetryAfterSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerId);
          return null;
        }
        return prev - 1;
      });
    }, 1_000);

    return () => clearInterval(timerId);
  }, [retryAfterSeconds]);

  // ---------------------------------------------------------------------------
  // useMutation — tek sorumluluk: API çağrısı
  // ---------------------------------------------------------------------------

  const mutation = useMutation<AiChatMessage | null, Error, SendPayload>({
    mutationFn: async ({ userMessage, contextWindow, pathname: pn, signal }) => {
      // Backend'e gönderilecek mesajlara kullanıcı mesajını ekle.
      const messagesForApi: AiChatMessage[] = [...contextWindow, userMessage];

      const response = await sendAiChatMessage(
        { messages: messagesForApi, pathname: pn },
        signal,
      );

      if (response.status === "completed") {
        return response.message;
      }

      if (response.status === "rate_limited") {
        setRetryAfterSeconds(response.retryAfterSeconds);
        throw new AiChatRequestError(
          `Rate limited for ${response.retryAfterSeconds}s.`,
          "RATE_LIMITED",
          response,
        );
      }

      // status === "error"
      throw new AiChatRequestError(
        response.message,
        response.code,
        response,
      );
    },

    onSuccess: (assistantMessage, { userMessage }) => {
      setError(null);
      setRetryAfterSeconds(null);

      setMessages((prev) => {
        // Kullanıcı mesajı zaten optimistic olarak eklendi.
        // Assistant mesajı null ise (rate_limited ile throw edilmeden dönülürse
        // bu dal çalışmaz, ama tip güvenliği için kontrol et).
        if (!assistantMessage) return prev;

        // Duplicate koruma: aynı ID zaten listede mi?
        const alreadyExists = prev.some((m) => m.id === assistantMessage.id);
        if (alreadyExists) return prev;

        const updated = [...prev, assistantMessage];
        saveChatMessages(updated);
        return updated;
      });
    },

    onError: (err) => {
      // Caller abort (component unmount) — sessizce geç, state'i bozma.
      if (err instanceof DOMException && err.name === "AbortError") return;

      // setRetryAfterSeconds, rate_limited durumunda mutationFn içinde zaten
      // çağrıldı. Burada yalnızca error state'i güncelliyoruz.
      setError(
        err instanceof AiChatRequestError ? err.code : "AI_PROVIDER_ERROR",
      );
      // Kullanıcı mesajı messages listesinde kalır — retry mümkün.
    },
  });

  // ---------------------------------------------------------------------------
  // sendMessage
  // ---------------------------------------------------------------------------

  const sendMessage = useCallback(
    (content: string): void => {
      // Validation
      const validation = validateUserInput(content);
      if (!validation.ok) {
        setError(validation.code);
        return;
      }

      // Pending veya rate-limit aktifken gönderme.
      if (mutation.isPending || retryAfterSeconds !== null) return;

      // Önceki hata temizle.
      setError(null);

      // Optimistic kullanıcı mesajı oluştur.
      const userMessage: AiChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      // Kullanıcı mesajını anında ekranda göster ve storage'a yaz.
      setMessages((prev) => {
        // Duplicate koruma: üretilen ID zaten listede mi?
        // (React StrictMode double-invoke senaryosuna karşı)
        if (prev.some((m) => m.id === userMessage.id)) return prev;

        const updated = [...prev, userMessage];
        saveChatMessages(updated);
        return updated;
      });

      // Yeni AbortController oluştur — öncekini iptal et.
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Backend'e gönderilecek context penceresi — yeni kullanıcı mesajı hariç.
      const contextWindow = buildContextWindow(messages);

      mutation.mutate({
        userMessage,
        contextWindow,
        pathname,
        signal: controller.signal,
      });
    },
    [mutation, messages, pathname, retryAfterSeconds],
  );

  // ---------------------------------------------------------------------------
  // retryLastMessage
  // ---------------------------------------------------------------------------

  const retryLastMessage = useCallback((): void => {
    if (mutation.isPending || retryAfterSeconds !== null) return;

    // Son user mesajını bul.
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMessage) return;

    setError(null);

    // Yeni AbortController.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Context: son user mesajı hariç önceki mesajlar (ID ile ara).
    const lastUserIndex = messages.findIndex(
      (m) => m.id === lastUserMessage.id,
    );
    const contextWindow = buildContextWindow(
      lastUserIndex > 0 ? messages.slice(0, lastUserIndex) : [],
    );

    mutation.mutate({
      userMessage: lastUserMessage,
      contextWindow,
      pathname,
      signal: controller.signal,
    });
  }, [mutation, messages, pathname, retryAfterSeconds]);

  // ---------------------------------------------------------------------------
  // clearMessages
  // ---------------------------------------------------------------------------

  const clearMessages = useCallback((): void => {
    // Devam eden isteği iptal et.
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    mutation.reset();
    setMessages([]);
    setError(null);
    setRetryAfterSeconds(null);
    clearChatMessages();
  }, [mutation]);

  // ---------------------------------------------------------------------------
  // canSend
  // ---------------------------------------------------------------------------

  const canSend = !mutation.isPending && retryAfterSeconds === null;

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    messages,
    sendMessage,
    clearMessages,
    retryLastMessage,
    isPending: mutation.isPending,
    error,
    retryAfterSeconds,
    canSend,
  };
}
