/**
 * AiChatPanel — sohbet panelinin tüm içeriği (header, mesajlar, composer).
 *
 * Masaüstü (Popover) ve Mobil (Sheet) tarafından ortak olarak kullanılır.
 * Layout kararları (genişlik, yükseklik) caller'a bırakılmıştır.
 */

import { useCallback, useState } from "react";
import { Bot, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getAiChatErrorMessage } from "@/lib/ai/chat/errors";
import type { UseAiChatReturn } from "@/hooks/useAiChat";
import type { AuthStatus } from "@/app/auth/AuthProvider";
import { AiChatMessageList } from "./AiChatMessageList";
import { AiChatComposer } from "./AiChatComposer";
import { AiChatSuggestions } from "./AiChatSuggestions";

// ---------------------------------------------------------------------------
// Status metni
// ---------------------------------------------------------------------------

function resolveStatusText(
  isPending: boolean,
  retryAfterSeconds: number | null,
): string {
  if (isPending) return "Yanıt bekleniyor…";
  if (retryAfterSeconds !== null)
    return `Lütfen ${retryAfterSeconds} saniye bekleyin.`;
  return "Sorularını yanıtlamak için buradayım.";
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface AiChatPanelProps {
  chat: UseAiChatReturn;
  authStatus: AuthStatus;
  isCreator: boolean;
  isAdmin: boolean;
  /** TanStack Router'dan gelen temiz pathname. Backend'e bu değer gönderilir. */
  pathname: string;
  onClose: () => void;
  className?: string;
}

export function AiChatPanel({
  chat,
  authStatus,
  isCreator,
  isAdmin,
  pathname,
  onClose,
  className,
}: AiChatPanelProps) {
  const { messages, sendMessage, clearMessages, retryLastMessage, isPending, error, retryAfterSeconds, canSend } = chat;

  // Hızlı soru tıklanınca composer'a yerleştirilecek metin.
  const [composerDraft, setComposerDraft] = useState<string | undefined>(undefined);

  const handleSuggestionSelect = useCallback((text: string) => {
    setComposerDraft(text);
  }, []);

  const handleDraftConsumed = useCallback(() => {
    setComposerDraft(undefined);
  }, []);

  const hasMessages = messages.length > 0;
  const statusText = resolveStatusText(isPending, retryAfterSeconds);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-background",
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
        {/* İkon */}
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <Bot className="size-4" />
        </span>

        {/* Başlık + durum */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            BeniFonla AI Asistanı
          </p>
          <p
            className="truncate text-xs text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusText}
          </p>
        </div>

        {/* Sohbeti temizle */}
        {hasMessages ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Sohbeti temizle"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sohbeti temizle</AlertDialogTitle>
                <AlertDialogDescription>
                  Tüm mesajlar silinecek ve bu işlem geri alınamaz. Devam etmek istiyor musun?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearMessages}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Temizle
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        {/* Kapat */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          onClick={onClose}
          aria-label="Sohbeti kapat"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* ── Mesaj listesi ──────────────────────────────────────────────────── */}
      <AiChatMessageList
        messages={messages}
        isPending={isPending}
        className="flex-1"
      />

      {/* ── Hata bantı ─────────────────────────────────────────────────────── */}
      {error ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-2"
          role="alert"
        >
          <p className="text-xs text-destructive">
            {getAiChatErrorMessage(error)}
          </p>
          {hasMessages ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={retryLastMessage}
              disabled={!canSend}
            >
              Tekrar dene
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* ── Hızlı sorular ─────────────────────────────────────────────────── */}
      <AiChatSuggestions
        authStatus={authStatus}
        isCreator={isCreator}
        isAdmin={isAdmin}
        pathname={pathname}
        onSuggestionSelect={handleSuggestionSelect}
        hasMessages={hasMessages}
      />

      {/* ── Composer ───────────────────────────────────────────────────────── */}
      <AiChatComposer
        onSend={sendMessage}
        isPending={isPending}
        canSend={canSend}
        externalDraft={composerDraft}
        onExternalDraftConsumed={handleDraftConsumed}
      />
    </div>
  );
}
