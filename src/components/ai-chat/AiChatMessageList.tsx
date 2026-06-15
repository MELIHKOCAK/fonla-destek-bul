/**
 * AiChatMessageList — kaydırılabilir mesaj listesi.
 *
 * - Yeni mesaj geldiğinde otomatik olarak en alta scroll eder.
 * - Karşılama mesajını statik olarak gösterir; storage'a yazılmaz, backend'e gönderilmez.
 * - Loading sırasında "Asistan düşünüyor…" baloncuğunu gösterir.
 */

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiChatMessage as AiChatMessageType } from "@/lib/ai/chat/types";
import { AiChatMessage, AiChatThinkingBubble } from "./AiChatMessage";

const WELCOME_MESSAGE =
  "Merhaba! BeniFonla'nın kullanımı hakkında sana yardımcı olabilirim. Ne öğrenmek istiyorsun?";

interface AiChatMessageListProps {
  messages: AiChatMessageType[];
  isPending: boolean;
  className?: string;
}

export function AiChatMessageList({
  messages,
  isPending,
  className,
}: AiChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Yeni mesaj veya pending değiştiğinde en alta scroll et.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending]);

  // Son asistan mesajının index'i — aria-live için.
  const lastAssistantIndex = messages.reduce<number>(
    (acc, m, i) => (m.role === "assistant" ? i : acc),
    -1,
  );

  return (
    <div
      className={cn("flex flex-col gap-3 overflow-y-auto p-4", className)}
      role="log"
      aria-label="Sohbet geçmişi"
      aria-live="off" // bireysel mesajlar kendi aria-live'ını yönetiyor
    >
      {/* Statik karşılama mesajı */}
      <div className="flex items-end gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Bot className="size-4" />
        </span>
        <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
          <p className="whitespace-pre-wrap">{WELCOME_MESSAGE}</p>
        </div>
      </div>

      {/* Sohbet mesajları */}
      {messages.map((message, index) => (
        <AiChatMessage
          key={message.id}
          message={message}
          isLatestAssistant={
            message.role === "assistant" && index === lastAssistantIndex
          }
        />
      ))}

      {/* Loading göstergesi */}
      {isPending ? <AiChatThinkingBubble /> : null}

      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
