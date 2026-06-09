
# Faz 3 — Tasarım Sistemi ve Uygulama İskeleti (Mock Data)

Bu faz tamamen frontend: backend, Supabase, auth, ödeme YOK. Sadece tema, layout, ortak bileşenler, mock veri ve `/design-system` showcase.

## 1. Tema sistemi (`src/styles.css`)

Mevcut shadcn token bloğunu BeniFonla marka paletine göre yeniden yaz:

- **Ana ton:** gece mavisi (`--background` dark: derin navy oklch; light: kırık beyaz)
- **Primary:** kontrollü turkuaz/emerald (güven + ilerleme)
- **Accent (warm):** amber (ödül/başarı) — yeni token `--accent-warm`
- **Semantic ek tokenlar:** `--success`, `--warning`, `--info`, `--campaign-progress`, `--campaign-progress-track`
- `:root` (light) ve `.dark` (dark) eksiksiz tanımlanır; `@theme inline` içine yeni tokenlar map edilir (`--color-success`, `--color-warning`, `--color-info`, `--color-accent-warm`, `--color-campaign-progress`, …).
- Tüm renkler `oklch()`. Bileşenler renkleri hardcode etmez — sadece semantic util kullanır.

## 2. Tema yönetimi

- `src/app/theme/ThemeProvider.tsx`: context (`theme: "light" | "dark" | "system"`, `resolvedTheme`, `setTheme`). `prefers-color-scheme` dinler, seçim varsa `localStorage("benifonla-theme")` saklar, `<html>` üzerine `.dark` toggle eder.
- `src/app/theme/theme-script.ts`: senkron inline script string'i export eder; `__root.tsx` `head()` içine `scripts: [{ children: themeInitScript }]` olarak basılır → FOUC engellenir.
- `src/components/common/ThemeToggle.tsx`: erişilebilir dropdown (Sistem / Açık / Koyu), `aria-label`, ikon (`Sun`/`Moon`/`Monitor`).

## 3. AppShell ve navigation

- `src/components/layout/AppHeader.tsx`: logo (text mark "BeniFonla"), masaüstü nav (`Keşfet`, `Nasıl Çalışır`, `Proje Başlat`), giriş/kayıt placeholder buton (henüz route yok → disabled veya `#` + `aria-disabled`), `ThemeToggle`, mobilde hamburger.
- `src/components/layout/MobileNavigation.tsx`: shadcn `Sheet` tabanlı; focus trap (Radix verir), ESC kapanır, aynı linkler.
- `src/components/layout/AppFooter.tsx`: 4 grup (Ürün, Kaynaklar, Yasal, Sosyal) + copyright + KVKK/yatırım uyarı notu.
- `src/components/layout/AppShell.tsx`: header + `<main>` + footer wrapper; `Container` ile ortak max-width.
- `Container` mevcut — gerekirse `narrow/default/wide` variantları eklenir.
- `__root.tsx`: `ThemeProvider` ile sar, `AppShell` outlet'i sarar. `/design-system` route'u header nav listesinde GÖRÜNMEZ (nav listesi sabit array, design-system orada yok).

## 4. Domain tipleri (`src/types/`)

```ts
// campaign.ts
export type CampaignStatus =
  | "draft" | "in_review" | "rejected" | "scheduled"
  | "live" | "successful" | "failed" | "cancelled"
  | "paid_out" | "refunded";

export interface Money { amountMinor: number; currency: "TRY" }
export interface Creator { id; displayName; avatarUrl?; verified }
export interface Category { id; slug; label }
export interface Campaign { id; slug; title; shortDescription; coverImage;
  creator; category; raisedAmountMinor; goalAmountMinor; backerCount;
  endDate: string; status: CampaignStatus; featured?: boolean }
```

## 5. Ortak bileşenler (`src/components/common/`)

Hepsi typed props, hiç hardcoded renk yok, light+dark uyumlu.

- **MoneyDisplay** — props: `amountMinor: number`, `currency?: "TRY"`, `variant?: "full" | "compact"`. `Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })`. Compact için `notation: "compact"`. Sıfır ve negatif güvenli. Float yok — `amountMinor / 100` integer bölme bilgisi ama formatter'a number verilir; precision testle korunur.
- **CampaignProgress** — props: `raisedMinor`, `goalMinor`, `showLabel?`. Yüzde `goal > 0 ? min(raised/goal*100, ∞) : 0`. Progress bar görseli `clamp(0, 100)`; metin gerçek yüzdeyi (`%124`) gösterir. `--campaign-progress` token.
- **StatusBadge** — `type: "campaign" | "contribution"`, `status: string`. Typed record (`CAMPAIGN_STATUS_META: Record<CampaignStatus, {label; tone}>`). Bilinmeyen status → muted fallback + `console.warn` dev'de.
- **CategoryBadge** — `category: Category`, varyant: outline.
- **CreatorBadge** — `creator: Creator`, avatar + isim + verified ikon.
- **CampaignCard** — TEK component, variant yok. Yukarıdaki props. Cover üstte (aspect 16/9, fallback gradient placeholder), kategori chip, başlık (line-clamp-2), creator, MoneyDisplay (raised), CampaignProgress, backerCount + kalan süre (`Intl.RelativeTimeFormat("tr")`). Hover/focus state, keyboard erişilebilir link (`<Link>` ile sar).
- **EmptyState / ErrorState** — `title`, `description`, `action?: {label; onClick}`, ikon. ErrorState `retry` aksiyonu.
- **LoadingSkeleton** — primitive: `CampaignCardSkeleton`, `LineSkeleton`, `AvatarSkeleton`. Gerçek layout ölçüleri.
- **ConfirmDialog** — shadcn `AlertDialog` üzerine wrapper: `title`, `description`, `confirmLabel`, `cancelLabel`, `variant: "default" | "destructive"`, `onConfirm`.
- **Pagination** — `page`, `pageCount`, `onPageChange`. Klavye ile gezilebilir.
- **SearchInput** — controlled, `aria-label`, clear butonu, debounce hook yok (parent kontrol).
- **FilterPanel** — generic shell: kategori multi-select, status select, sıralama. Mock veri üzerinde çalışır.

## 6. Mock veri (`src/mocks/`)

- `categories.ts` — 8 kategori (Teknoloji, Tasarım, Sanat, Müzik, Yayıncılık, Oyun, Topluluk, Eğitim).
- `creators.ts` — 8 creator, Türkçe isimler, generated avatar (DiceBear `https://api.dicebear.com/7.x/initials/svg?seed=...` — public, lisanslı, kişi fotoğrafı değil).
- `campaigns.ts` — **12 kampanya**, farklı:
  - fonlama oranları: %12, %45, %78, %100, %134, %220
  - statuslar: live (çoğu), scheduled, successful, failed, draft (1 örnek)
  - süreler: 3 gün, 14 gün, 30 gün, bitmiş
  - cover: lokal gradient placeholder util (`coverGradient(slug)` → `linear-gradient` CSS string) — gerçek fotoğraf yok, lisans riski sıfır.
- `index.ts` — re-export + helper'lar (`getCampaignBySlug`, `listFeaturedCampaigns`, `filterCampaigns`). Sayfalar mocks'u doğrudan import etmez; bu helper'ları kullanır.

## 7. Sayfalar

- `src/routes/index.tsx` → `HomePage` güncelle: hero (marka mesajı, CTA "Keşfet" / "Proje Başlat"), featured kampanyalar grid (CampaignCard × mock).
- `src/routes/design-system.tsx` (YENİ) → `DesignSystemPage`. Bölümler: Renkler (token swatches), Tipografi, Buttons, Form inputs, Badges, MoneyDisplay (full/compact/edge), CampaignProgress (0/45/100/134), CampaignCard grid, EmptyState, ErrorState, LoadingSkeleton, ConfirmDialog tetikleyici, Pagination, SearchInput, FilterPanel, AppHeader/Footer preview. Nav'da listelenmez.
- Mevcut `NotFoundPage` ve `$.tsx` korunur; AppShell içine düşer.

## 8. Testler (`src/**/__tests__/`)

Vitest + RTL:

- `MoneyDisplay.test.tsx` — TRY formatlama, 0, 100000 (1000₺), kompakt notation, negatif.
- `CampaignProgress.test.tsx` — goal=0 → %0 ve crash yok; raised<goal; raised=goal; raised>goal görsel clamp + metin.
- `ThemeToggle.test.tsx` — seçim localStorage'a yazılır, `<html>.dark` class değişir.
- `CampaignCard.test.tsx` — başlık, kategori, raised + goal metni, link href, accessible name.
- `MobileNavigation.test.tsx` — trigger ile açılır, ESC ile kapanır, focus trap içinde kalır (klavye ile Tab edildiğinde dış element odak almaz).

## 9. Kapsam dışı (bu fazda YOK)

Supabase, auth, DB, storage, Edge Function, ödeme, gerçek API çağrıları, kampanya CRUD formları, admin paneli, i18n framework (Türkçe metinler doğrudan), email, bildirim.

## 10. Doğrulama

`bun run typecheck` + `bun run lint` + `bun run test:run` + `bun run build` — hepsi temiz olmadan tamamlandı denmez.

## Teknik notlar

- React Router DEĞİL — **TanStack Router** kullanılır (Faz 1 kararı). User prompt'taki "React Router" ifadesi proje knowledge'ı ile çelişir; TanStack Router ile devam edilir.
- Tüm renkler `oklch` + semantic token; `text-white`, `bg-black` vb. yasak.
- `localStorage` erişimi SSR-safe (`typeof window !== "undefined"`); FOUC için inline theme script `__root.tsx` head'inde.
- Avatar/cover için harici resim YOK (lisans riski) — DiceBear sadece initials SVG (public domain), kampanya cover'ları CSS gradient.

## Açık sorular (varsayımla ilerlenecek)

1. "Proje Başlat" butonu Faz 3'te disabled placeholder mı, yoksa bilgilendirici modal mı? → **Varsayım: disabled + tooltip "Yakında".**
2. Design-system route'u prod build'de tamamen kaldırılsın mı? → **Varsayım: route kalır ama nav'da listelenmez; ileride `import.meta.env.DEV` ile gate edilebilir.**
