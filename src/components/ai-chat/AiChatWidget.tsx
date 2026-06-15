/**
 * AiChatWidget — global sabit AI sohbet butonu + panel.
 *
 * ### Masaüstü
 * Sağ alt köşede popover benzeri kayan panel. Escape ile kapanır.
 * Dışarı tıklama: kullanıcı mesaj yazıyorsa (composer dolu) kapanmaz.
 *
 * ### Mobil
 * Radix Sheet (bottom side) ile %85dvh yüksekliğinde alt drawer.
 * Klavye açıldığında composer görünür kalır (CSS `env(safe-area-inset-bottom)` + flexbox).
 *
 * ### Erişilebilirlik
 * - Trigger: `aria-label`, `aria-expanded`, Tooltip.
 * - Panel: `role="dialog"`, `aria-label`, `aria-modal`.
 * - Escape kapatır (Radix Sheet built-in + masaüstü keydown).
 *
 * ### Konum
 * `fixed bottom-6 right-6` masaüstü, `fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-4` mobil.
 * `z-50` — MobileNavigation (z-40) ve header (z-40) üzerinde.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useAiChat } from "@/hooks/useAiChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { AiChatPanel } from "./AiChatPanel";

// ---------------------------------------------------------------------------
// Ekran boyutu hook'u — mobil tespiti
// ---------------------------------------------------------------------------

// useMobile zaten src/hooks/use-mobile.tsx içinde var.

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { status, isCreator, isAdmin } = useAuth();

  const chat = useAiChat();
  const { messages } = chat;

  // Mevcut pathname — backend'e bağlam olarak gönderilir.
  // Yalnızca path kısmı; query string ve fragment yoktur (TanStack Router garantisi).
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  // Masaüstü panel dışına tıklama için ref.
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Composer boş mu? Dolu ise dışarı tıklama ile kapanmaz (veri kaybı önlemi).
  // Bu state'i AiChatPanel → AiChatComposer'dan yukarı taşımak yerine
  // panel konteyneri query selector ile kontrol edilir.
  const composerHasContent = useCallback((): boolean => {
    const textarea = desktopPanelRef.current?.querySelector<HTMLTextAreaElement>(
      "#ai-chat-composer",
    );
    return Boolean(textarea && textarea.value.trim().length > 0);
  }, []);

  // Masaüstü: Escape ile kapat.
  useEffect(() => {
    if (isMobile || !open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, open]);

  // Masaüstü: Dışarı tıklama ile kapat (composer boşsa).
  useEffect(() => {
    if (isMobile || !open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!desktopPanelRef.current) return;
      const target = e.target as Node;
      // Radix AlertDialog portala tıklama — kapat tetikleme.
      if (!desktopPanelRef.current.contains(target) && !triggerRef.current?.contains(target)) {
        if (!composerHasContent()) {
          setOpen(false);
        }
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobile, open, composerHasContent]);

  const handleClose = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const panelContent = (
    <AiChatPanel
      chat={chat}
      authStatus={status}
      isCreator={isCreator}
      isAdmin={isAdmin}
      pathname={pathname}
      onClose={handleClose}
    />
  );

  return (
    <>
      {/* ── FAB trigger butonu ─────────────────────────────────────────── */}
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="AI asistanı aç"
              aria-expanded={open}
              aria-haspopup="dialog"
              className={cn(
                // Boyut ve şekil
                "fixed size-14 rounded-full p-0",
                // Konum — masaüstü
                "bottom-6 right-6",
                // Mobil — safe-area + daha küçük boşluk
                "max-md:bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] max-md:right-4",
                // Katman
                "z-50",
                // Renk ve gölge
                "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                // Geçiş
                "transition-transform active:scale-95",
              )}
            >
              {open ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <MessageCircle className="size-6" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            AI Asistan
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* ── Masaüstü panel ─────────────────────────────────────────────── */}
      {!isMobile && open ? (
        <div
          ref={desktopPanelRef}
          role="dialog"
          aria-label="BeniFonla AI Asistanı"
          aria-modal="true"
          className={cn(
            // Konum: FAB'ın üzerinde, sağ köşede
            "fixed bottom-[5.5rem] right-6 z-50",
            // Boyut
            "w-[380px]",
            // Yükseklik — ekran taşmasına karşı
            "max-h-[min(600px,calc(100dvh-8rem))]",
            // Görünüm
            "flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl",
            // Animasyon — açılış
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
          )}
        >
          {panelContent}
        </div>
      ) : null}

      {/* ── Mobil Sheet ────────────────────────────────────────────────── */}
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className={cn(
              // Yükseklik
              "h-[85dvh]",
              // Safe area
              "pb-[env(safe-area-inset-bottom)]",
              // Layout
              "flex flex-col overflow-hidden p-0",
              // Yatay taşmayı önle
              "max-w-full",
            )}
            // Varsayılan Sheet close butonunu gizle — kendi kapatma butonumuz var.
            aria-label="BeniFonla AI Asistanı"
          >
            {/* Radix Dialog için zorunlu erişilebilirlik alanları */}
            <SheetTitle className="sr-only">BeniFonla AI Asistanı</SheetTitle>
            <SheetDescription className="sr-only">
              BeniFonla platformu hakkında sorularınızı yanıtlayan AI asistan.
            </SheetDescription>

            {/* Panel içeriği flex-1 ile kalan yüksekliği doldurur */}
            <div className="flex min-h-0 flex-1 flex-col">
              {panelContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
