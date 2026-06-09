# Faz 4 — Public User Journey (Mock-Only)

Bu faz **yalnızca frontend**. Supabase, gerçek auth, network çağrısı, ödeme YOK. Tüm veri `src/mocks` üzerinde typed async repository üzerinden okunur.

## 1. Mock Repository Katmanı (`src/services/mock/`)

Mevcut `src/mocks/index.ts` sync helper'ları korunur; üzerine async servis katmanı eklenir.

- `src/services/mock/delay.ts` — `simulateDelay(ms?: number)`, `MOCK_LATENCY` sabiti (~250–600ms random).
- `src/services/mock/errors.ts` — `MockError` sınıfı, `shouldSimulateError(key)` (dev flag `import.meta.env.DEV` + `localStorage` debug; production'da daima `false`).
- `src/services/campaigns.service.ts`
  - `getFeaturedCampaigns(): Promise<Campaign[]>`
  - `getCampaigns(filters, page): Promise<{ items, total, page, pageSize, totalPages }>`
  - `getCampaignBySlug(slug): Promise<Campaign | null>`
  - `getNewCampaigns(limit)`, `getSuccessfulCampaigns(limit)`
- `src/services/categories.service.ts` — `listCategories`, `getCategoryBySlug`, `countCampaignsInCategory`
- `src/services/creators.service.ts` — `getCreatorByUsername`, `getCampaignsByCreator`

Filtre tipi:
```ts
interface CampaignQuery {
  q?: string;
  categorySlugs?: string[];
  fundedMin?: number; // 0-200 (%)
  fundedMax?: number;
  endingWithinDays?: number; // 7, 14, 30
  sort?: "newest" | "popular" | "near-goal" | "ending-soon";
  page?: number;
  pageSize?: number;
}
```

Mock veri yetersizse `src/mocks/campaigns.ts` 12 → ~24 kampanyaya genişletilir (yeni/başarılı/biten yelpazesi için).

## 2. Route Yapısı (`src/routes/`)

TanStack file-based routing, flat dot-separated. Mevcut `__root.tsx`, `index.tsx`, `$.tsx`, `design-system.tsx` korunur.

Yeni route dosyaları:
- `discover.tsx`
- `search.tsx`
- `categories.$slug.tsx`
- `campaigns.$slug.tsx`
- `creators.$username.tsx`
- `how-it-works.tsx`
- `about.tsx`
- `contact.tsx`
- `faq.tsx`
- `terms.tsx`
- `privacy.tsx`
- `refund-policy.tsx`
- `risk-disclosure.tsx`
- `login.tsx`
- `register.tsx`
- `forgot-password.tsx`

`$.tsx` (mevcut) catch-all NotFound zaten var; korunur.

Her route ince bir kabuk olur; gerçek içerik `src/pages/` altında PascalCase sayfa bileşeni. Mevcut konvansiyon (`HomePage`, `NotFoundPage`) sürdürülür.

## 3. Sayfa Bileşenleri (`src/pages/`)

- `HomePage.tsx` — 9 bölümle yeniden yazılır (hero, featured, kategoriler, yeni, başarılı, nasıl çalışır, güven & şeffaflık, proje başlat CTA, footer mevcut shell'de).
- `DiscoverPage.tsx` — featured + tüm kampanyalar; "Filtrele" CTA `/search`'e yönlendirir veya inline filtre paneliyle aynı bileşeni paylaşır.
- `SearchPage.tsx` — sol sidebar (desktop) / Sheet drawer (mobil), `FilterPanel` + `SearchInput`, `Pagination`, aktif filtre chip listesi, "Tümünü temizle". URL query params kaynak.
- `CategoryDetailPage.tsx` — header + kampanya grid; geçersiz slug → `notFound()`.
- `CampaignDetailPage.tsx` — Mobil öncelikli tek sütun, desktopta sağda sticky support kartı. Bölümler: header, kapak, creator kartı, metrik bar, hikâye, fon kullanım planı, takvim/milestone, riskler, reward tier listesi, güncellemeler, yorumlar (read-only mock), SSS, paylaşım, "Şikâyet Et" Dialog. "Destek Ol" → `<Dialog>` "Demo aşaması" mesajı + `/login`'e Link.
- `CreatorProfilePage.tsx` — avatar, display name, @username, bio, location, website link (rel=noopener), live + successful kampanyalar; özet metrikler (toplam kampanya, toplam destekçi).
- `HowItWorksPage.tsx` — creator + backer akışı, her biri 3–4 adım kart.
- `AboutPage.tsx`, `ContactPage.tsx` (form), `FaqPage.tsx` (Accordion).
- `TermsPage.tsx`, `PrivacyPage.tsx`, `RefundPolicyPage.tsx`, `RiskDisclosurePage.tsx` — üstte uyarı banner'ı "Bu metin taslaktır; hukuki inceleme gerektirir." Sonra heading hiyerarşili içerik.
- `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx` — RHF + Zod, submit'te toast: "Demo aşaması — hesap işlemleri henüz etkin değil."

## 4. Ortak Yeni Bileşenler

- `src/components/common/CampaignGrid.tsx` — responsive grid + skeleton/empty/error orchestration.
- `src/components/common/PageHeader.tsx` — sayfa başlığı + alt başlık + breadcrumb opsiyonel.
- `src/components/common/SectionHeading.tsx` — ana sayfa bölüm başlıkları.
- `src/components/common/LegalNotice.tsx` — yasal sayfaların taslak uyarısı.
- `src/components/common/SupportCtaDialog.tsx` — "Destek Ol" demo dialog.
- `src/components/common/ReportDialog.tsx` — "Şikâyet Et" demo dialog (form + Zod, submit demo toast).
- `src/components/common/ActiveFilterChips.tsx`.
- `src/components/forms/` — `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ContactForm.tsx`. Shared `useDemoSubmit` hook (`src/hooks/use-demo-submit.ts`).

## 5. Data Fetching

TanStack Query mevcut. Tüm async mock servis çağrıları `useQuery` ile sarılır:
- `queryKey: ["campaigns", filters, page]`
- Loading → `LoadingSkeleton`
- Error → `ErrorState` + retry (`refetch`)
- Empty → `EmptyState`

`loader` kullanılmaz (auth/SSR karmaşıklığı yok), client-side `useQuery` yeterli ve faz hedefine uygun.

## 6. URL Query Params (Search Page)

Zod schema + TanStack Router `validateSearch` + `fallback`:
```ts
const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cats: fallback(z.array(z.string()), []).default([]),
  fundedMin: fallback(z.number().min(0).max(500), 0).default(0),
  fundedMax: fallback(z.number().min(0).max(500), 500).default(500),
  ending: fallback(z.enum(["7","14","30","any"]), "any").default("any"),
  sort: fallback(z.enum(["newest","popular","near-goal","ending-soon"]), "newest").default("newest"),
  page: fallback(z.number().int().min(1), 1).default(1),
});
```

## 7. Navigation Güncellemesi

`AppHeader` nav linkleri TanStack `<Link>` ile güncel route'lara bağlanır:
- Keşfet → `/discover`
- Nasıl Çalışır → `/how-it-works`
- Proje Başlat → disabled, tooltip "Yakında"
- Giriş → `/login`, Kayıt → `/register`

`AppFooter` linkleri ilgili yasal/statik route'lara bağlanır.

## 8. Testler (`__tests__/`)

Mevcut testler korunur. Eklenenler:
- `services/campaigns.service.test.ts` — filter/sort/pagination doğruluğu.
- `pages/SearchPage.test.tsx` — query param parse, chip clear, empty state.
- `pages/CampaignDetailPage.test.tsx` — geçersiz slug 404, support dialog açılıp `/login` linkini gösterir.
- `forms/LoginForm.test.tsx` — invalid input network çağrısı yapmaz; submit demo toast tetikler.

## 9. Doğrulama (build mode'da)

1. `bunx tsc --noEmit`
2. `bunx vitest run`
3. `bunx eslint .`
4. Browser: `/`, `/discover`, `/search?q=...`, `/campaigns/<slug>`, `/categories/<slug>`, `/creators/<username>`, `/login`, geçersiz slug. Console clean, 320px overflow yok.

## 10. Kapsam Dışı (bu faz YAPMAZ)

Supabase enable, auth state, gerçek API çağrısı, ödeme, kampanya yaratma/CRUD, admin, i18n framework, e-mail, bildirim, görsel upload.

## Varsayımlar

1. "Şikâyet Et" formu mock toast ile sonlanır; veritabanı yok.
2. Yorumlar read-only mock; ekleme formu disabled placeholder.
3. Search'te `fundedMax` üst sınır 500 (%) — %220 gibi aşırı fonlanmış mock kampanyalar için.
4. Reward tier limit/stok mock alanlarda yer alır; checkout yok.
5. `MockError` simülasyonu sadece `localStorage.setItem("benifonla:mock-error", "campaigns")` ile dev'de tetiklenir; UI debug switch yok.

## Açık Riskler

- TanStack Router `validateSearch` array param (kategori multi-select) URL serialization formatı: virgülle değil, default JSON-stringify ile. Bu kullanıcıya çirkin URL üretebilir — kabul edilebilir varsayım.
- Mock kampanya sayısı genişletilse de "başarılı kampanya" çeşitliliği sınırlı kalabilir.

Onay sonrası build mode'da uygularım.