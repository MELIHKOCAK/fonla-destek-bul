/**
 * AiChatSuggestions — sayfaya ve kullanıcı rolüne göre hızlı soru önerileri.
 *
 * ### Öncelik sırası
 * 1. Mevcut route için `AI_CHAT_ROUTE_SUGGESTIONS` prefix eşleşmesi varsa → route önerileri.
 * 2. Yoksa → kullanıcı rolüne göre öneriler (guest / user / creator).
 * 3. Admin için yönetim işlemi veya kişisel veri önerisi üretilmez.
 *
 * ### Tıklama davranışı
 * Öneri doğrudan gönderilmez; composer'a yerleştirilir.
 * Kullanıcı içeriği inceleyip düzenleyebilir.
 */

import { cn } from "@/lib/utils";
import type { AuthStatus } from "@/app/auth/AuthProvider";
import { getRouteSuggestions } from "@/lib/ai/chat/routeSuggestions";

// ---------------------------------------------------------------------------
// Rol tabanlı fallback önerileri
// ---------------------------------------------------------------------------

const GUEST_SUGGESTIONS = [
  "BeniFonla nedir?",
  "Bir kampanyaya nasıl destek olurum?",
  "Kampanya hedefe ulaşmazsa ne olur?",
  "Ödül sistemi nasıl çalışır?",
] as const;

const USER_SUGGESTIONS = [
  "Desteklerimi nereden görebilirim?",
  "İade durumumu nasıl kontrol ederim?",
  "Bildirimlerime nereden ulaşırım?",
] as const;

const CREATOR_SUGGESTIONS = [
  "Nasıl kampanya oluşturabilirim?",
  "Kampanyamı incelemeye nasıl gönderirim?",
  "Revizyon talebi ne demek?",
  "Kampanya analizlerini nereden görebilirim?",
] as const;

// ---------------------------------------------------------------------------
// Prop tipleri
// ---------------------------------------------------------------------------

interface AiChatSuggestionsProps {
  authStatus: AuthStatus;
  isCreator: boolean;
  isAdmin: boolean;
  /** TanStack Router'dan alınan güvenli pathname. */
  pathname: string;
  /** Mesajı göndermek yerine composer'a yerleştiren callback. */
  onSuggestionSelect: (text: string) => void;
  /** Mesajlar varsa önerileri gizle. */
  hasMessages: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Öneri seçici
// ---------------------------------------------------------------------------

/**
 * Hangi öneri listesinin gösterileceğini belirler.
 *
 * Öncelik:
 * 1. Route prefix eşleşmesi (sayfa bağlamı en spesifik bilgidir).
 * 2. Rol tabanlı fallback.
 */
function resolveSuggestions(
  pathname: string,
  authStatus: AuthStatus,
  isCreator: boolean,
  isAdmin: boolean,
): readonly string[] {
  // 1. Route eşleşmesi — admin dahil tüm roller için çalışır.
  const routeSuggestions = getRouteSuggestions(pathname);
  if (routeSuggestions !== null) return routeSuggestions;

  // 2. Rol tabanlı fallback.
  if (authStatus === "unauthenticated") return GUEST_SUGGESTIONS;
  // Admin için yönetim işlemi önerisi yok → genel kullanıcı önerileri.
  if (isCreator && !isAdmin) return CREATOR_SUGGESTIONS;
  return USER_SUGGESTIONS;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiChatSuggestions({
  authStatus,
  isCreator,
  isAdmin,
  pathname,
  onSuggestionSelect,
  hasMessages,
  className,
}: AiChatSuggestionsProps) {
  // Mesaj varsa veya auth henüz yüklenmemişse gösterme.
  if (hasMessages || authStatus === "loading") return null;

  const suggestions = resolveSuggestions(pathname, authStatus, isCreator, isAdmin);

  return (
    <div className={cn("flex flex-col gap-1.5 px-4 pb-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">Hızlı sorular</p>
      <ul className="flex flex-col gap-1.5" role="list">
        {suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onSuggestionSelect(suggestion)}
              className={cn(
                "w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm",
                "text-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              )}
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
