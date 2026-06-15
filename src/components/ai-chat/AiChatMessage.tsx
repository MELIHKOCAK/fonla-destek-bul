/**
 * AiChatMessage — tek mesaj baloncuğu.
 *
 * - Kullanıcı mesajları sağda, asistan mesajları solda.
 * - Plain text gösterilir; HTML render edilmez, dangerouslySetInnerHTML kullanılmaz.
 * - Yeni asistan yanıtları `aria-live="polite"` bölgesi üzerinden ekran okuyucuya bildirilir.
 * - Loading durumunda animasyonlu "Asistan düşünüyor…" gösterilir.
 */

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiChatMessage as AiChatMessageType } from "@/lib/ai/chat/types";

// ---------------------------------------------------------------------------
// Loading baloncuğu
// ---------------------------------------------------------------------------

export function AiChatThinkingBubble() {
  return (
    <div className="flex items-end gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="size-4" aria-hidden="true" />
      </span>
      <div
        className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground"
        aria-label="Asistan düşünüyor"
        role="status"
      >
        <span className="flex items-center gap-1">
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
          <span className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
          <span className="sr-only">Asistan düşünüyor…</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tek mesaj
// ---------------------------------------------------------------------------

interface AiChatMessageProps {
  message: AiChatMessageType;
  /** Son asistan mesajı mı? Ekran okuyucu duyurusu için. */
  isLatestAssistant?: boolean;
}

export function AiChatMessage({ message, isLatestAssistant = false }: AiChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary",
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="size-4" />
        ) : (
          <Bot className="size-4" />
        )}
      </span>

      {/* Balon */}
      <div
        className={cn(
          "max-w-[75%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          // Uzun kelimeler taşmasın
          "overflow-wrap-anywhere",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
        // Yeni asistan cevaplarını ekran okuyucuya bildir
        aria-live={isLatestAssistant ? "polite" : undefined}
        aria-atomic={isLatestAssistant ? "true" : undefined}
      >
        {/* plain text — whitespace korunur, HTML render edilmez */}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
