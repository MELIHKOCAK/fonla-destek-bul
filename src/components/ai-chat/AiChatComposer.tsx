/**
 * AiChatComposer — mesaj yazma alanı.
 *
 * - Textarea: Enter gönderir, Shift+Enter yeni satır.
 * - IME composition (Japonca, Korece vb.) sırasında Enter yanlışlıkla göndermez.
 * - 1.500 karakter limiti; sona yaklaşıldığında karakter sayacı görünür olur.
 * - Boş / yalnızca whitespace içerikli mesaj gönderilemez.
 * - Pending sırasında tüm etkileşimler devre dışı.
 * - Maksimum textarea yüksekliği 8 satır; taşarsa iç scroll devreye girer.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AI_CHAT_LIMITS } from "@/lib/ai/chat/constants";

// Kaç karakterden sonra sayaç gösterilsin?
const CHAR_COUNTER_THRESHOLD = AI_CHAT_LIMITS.maxMessageCharacters - 200;

interface AiChatComposerProps {
  onSend: (content: string) => void;
  isPending: boolean;
  canSend: boolean;
  /** Dışarıdan (hızlı soru) composer'a yerleştirilecek metin. */
  externalDraft?: string;
  onExternalDraftConsumed?: () => void;
}

export function AiChatComposer({
  onSend,
  isPending,
  canSend,
  externalDraft,
  onExternalDraftConsumed,
}: AiChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  const charCount = value.length;
  const overLimit = charCount > AI_CHAT_LIMITS.maxMessageCharacters;
  const isEmpty = !value.trim();
  const sendDisabled = isPending || !canSend || isEmpty || overLimit;

  // Dışarıdan gelen draft'ı textarea'ya yerleştir.
  useEffect(() => {
    if (externalDraft === undefined) return;
    setValue(externalDraft);
    onExternalDraftConsumed?.();
    // Cursor'ı en sona taşı.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, [externalDraft, onExternalDraftConsumed]);

  // Textarea'yı içeriğe göre yeniden boyutlandır.
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // max-height CSS'de ayarlı; overflow: auto ile iç scroll devreye girer.
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleSend = useCallback(() => {
    if (sendDisabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    // Textarea yüksekliğini sıfırla.
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [sendDisabled, value, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // IME composition sırasında Enter'ı yoksay.
      if (isComposingRef.current) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="flex flex-col gap-1.5 border-t border-border bg-background p-3">
      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border bg-background transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          overLimit ? "border-destructive" : "border-input",
        )}
      >
        <label htmlFor="ai-chat-composer" className="sr-only">
          Mesajınızı yazın
        </label>
        <textarea
          id="ai-chat-composer"
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          placeholder="Bir soru sor…"
          disabled={isPending || !canSend}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed",
            "placeholder:text-muted-foreground",
            "focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Maksimum ~8 satır; taşarsa iç scroll
            "max-h-[10rem] overflow-y-auto",
          )}
          aria-label="Mesajınızı yazın"
          aria-describedby={
            overLimit ? "ai-chat-composer-overlimit" : "ai-chat-composer-hint"
          }
          maxLength={AI_CHAT_LIMITS.maxMessageCharacters + 100} // soft buffer; Zod katı kontrol yapar
        />

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "mb-1.5 mr-1.5 shrink-0 size-8 rounded-lg text-primary",
            "hover:bg-primary/10",
            "disabled:opacity-40",
          )}
          onClick={handleSend}
          disabled={sendDisabled}
          aria-label="Mesaj gönder"
        >
          <SendHorizonal className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Karakter sayacı & limit uyarısı */}
      <div className="flex items-center justify-between px-1">
        <span id="ai-chat-composer-hint" className="sr-only">
          Enter ile gönder, Shift+Enter ile yeni satır ekle.
        </span>

        {charCount >= CHAR_COUNTER_THRESHOLD ? (
          <span
            id="ai-chat-composer-overlimit"
            className={cn(
              "ml-auto text-xs tabular-nums",
              overLimit ? "text-destructive" : "text-muted-foreground",
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {charCount} / {AI_CHAT_LIMITS.maxMessageCharacters}
          </span>
        ) : (
          // Boş placeholder — layout kaymasını önler
          <span className="ml-auto text-xs text-transparent" aria-hidden="true">
            &nbsp;
          </span>
        )}
      </div>
    </div>
  );
}
