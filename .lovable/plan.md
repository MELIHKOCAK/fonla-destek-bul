
# BeniFonla — Faz 1: Başlangıç İskeleti

Amaç: Yalnızca güvenli, sürdürülebilir bir başlangıç iskeleti. Backend, auth, ödeme, Supabase YOK. Uygulama publish edilmeyecek.

## 1. Stack ve uyum kararları

- Mevcut Lovable şablonu korunur: React 19 + TypeScript strict + Vite 7 + TanStack Start + TanStack Router + TanStack Query + Tailwind v4 + shadcn/ui (zaten kurulu).
- Eklenecek paketler: `react-hook-form`, `zod`, `@hookform/resolvers`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`.
- React Router DOM **kurulmaz** (TanStack Router seçildi).
- Gereksiz ağır bağımlılık eklenmez.

## 2. Klasör yapısı

İstediğin yapıyı birebir kurarken framework kurallarını da koruyacağım:

```text
src/
  app/                 # uygulama-seviyesi provider'lar, query client factory, app-config
  routes/              # TanStack Router dosya tabanlı route'lar (ZORUNLU)
    __root.tsx         # mevcut shell — sadece provider zinciri + error boundary güncellenir
    index.tsx          # / route'u: src/pages/HomePage'i import eder
    $.tsx              # not-found (splat) route — src/pages/NotFoundPage
  pages/               # sayfa SEVİYESİ bileşenler (routing YOK — route dosyaları buradan import eder)
    HomePage.tsx
    NotFoundPage.tsx
  components/
    common/            # ortak küçük bileşenler (InfoCard, Container, vs.)
    ui/                # mevcut shadcn bileşenleri
  features/            # ileride özellik modülleri (şimdilik .gitkeep + README)
  hooks/               # mevcut + .gitkeep
  lib/                 # mevcut utils.ts + query-client.ts + env.ts
  types/               # global tip tanımları (.gitkeep)
  test/                # setup.ts + render helper
```

Not: `src/pages/` framework routing için DEĞİL, sadece page-component konteyneri olarak kullanılır. Route dosyaları `src/routes/` altında kalır (TanStack Router şartı). Bu, isteğin ruhunu korur ve build'i bozmaz.

## 3. Sayfa içeriği (`/`)

Nötr "geliştirme aşamasında" sayfası:
- H1: "BeniFonla geliştirme aşamasında"
- Kısa açıklama (Türkçe, ürün bağlamından — ödül/destek temelli kitle fonlama, yatırım değil)
- shadcn `Card` ile bilgi kartı: "Bu ortam henüz yayınlanmadı"
- Tailwind semantic token'larla minimal stil
- Semantic HTML, görünür focus state, doğru başlık hiyerarşisi
- Tam ürün tasarımı yapılmaz (Faz 2'ye bırakılır)

## 4. Router & boundary işleri

- `src/routes/__root.tsx`: mevcut `errorComponent` ve `notFoundComponent` korunur; Türkçeleştirilir. QueryClientProvider zaten var.
- `src/routes/$.tsx`: splat not-found → `NotFoundPage`
- `src/routes/index.tsx`: placeholder kaldırılır, `HomePage` import edilir, head() Türkçe meta'larla doldurulur.
- `src/router.tsx`: `defaultErrorComponent` ve `defaultNotFoundComponent` set edilir.

## 5. Env, config, gitignore

- `.env.example`: yalnızca açıklamalı, boş örnek anahtarlar (gerçek değer YOK, Supabase YOK):
  ```
  # VITE_APP_NAME=BeniFonla
  # VITE_APP_ENV=local
  # (Supabase bu fazda bağlanmadı — anahtar eklenmez)
  ```
- `.gitignore`: mevcut korunur, eksikler tamamlanır (`.env`, `.env.local`, `dist`, `coverage`, `node_modules`, vs.).
- `src/lib/env.ts`: tip-güvenli env okuyucu (Zod ile minimal şema; şimdilik boş).

## 6. Scripts (`package.json`)

En az: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest watch), `test:run` (vitest run).

## 7. Test

- `src/test/setup.ts`: jest-dom matcher, jsdom.
- `vitest.config.ts`: jsdom, setupFiles, alias `@`.
- `src/pages/__tests__/HomePage.test.tsx`: smoke test — başlığın render edildiğini doğrular.

## 8. Dokümantasyon

`README.md`: proje amacı (kitle fonlama, yatırım değil), local çalıştırma, scriptler, branch stratejisi özeti, henüz uygulanmamış fazlar listesi.

`docs/` klasörü:
- `docs/development-workflow.md`: branch stratejisi (main / develop / feature/* / fix/* / chore/*), commit mesajı, PR akışı.
- `docs/workspace-knowledge.md`: tüm Workspace Knowledge kuralları (TS strict, any yasak, named export, kebab-case, Tailwind+shadcn, TanStack Query, RHF+Zod, güvenlik frontend'e bırakılmaz, kuruş cinsinden integer, vs.).
- `docs/project-knowledge.md`: BeniFonla amacı, aktörler (Guest/User/Creator/Backer/Moderator/Admin), terimler (Campaign, Contribution≠Payment, Reward Tier, Payout, Refund, Platform Fee, Ledger), kampanya yaşam döngüsü tüm durumlar, MVP TRY+Türkçe, teknoloji yığını, ödeme/hukuk uyumu olmadan production payment yok.
- `docs/environments.md`: local/staging/production ayrımı, secret ayrımı, production verisi local'de kullanılmaz, Lovable Cloud Test/Live ortam özelliğine güvenilmez, bu fazda Supabase bağlanmaz.

## 9. GitHub (manuel adımlar)

Lovable arayüzünden senin adına OAuth tamamlayamam. Faz sonunda sana net bir manuel adım listesi vereceğim:
1. Lovable Plus (+) menü → GitHub → Connect project
2. Repo adı: `BeniFonla`
3. İlk sync'i doğrula
4. GitHub'da `develop` branch'ini oluştur (`main` → `develop`)
5. Branch protection önerileri (main + develop için PR zorunluluğu, status check, force-push yasak)

## 10. Kabul kriterleri doğrulaması

Faz sonunda:
- `tsc --noEmit` temiz
- `vitest run` yeşil (smoke test geçer)
- Build, lint temiz
- Supabase / auth / payment / migration / edge function YOK
- Publish YOK, gerçek secret YOK

## Kapsam dışı (bu fazda yapılmaz)

- Supabase bağlantısı, database, RLS, migration
- Auth UI veya akış
- Ödeme entegrasyonu (Stripe/Paddle/Iyzico)
- Kampanya CRUD, kullanıcı profili, admin paneli
- Tam ürün tasarım sistemi (Faz 2)
- Publish

## Onay sonrası teslim edilecekler

- Tüm yeni/değişen dosyaların listesi
- Çalıştırılan doğrulamaların (typecheck/build/test/lint) sonuçları
- Kopyalanabilir Workspace Knowledge ve Project Knowledge metinleri
- Manuel GitHub bağlantı adımları
- Açık riskler ve sonraki faz önerileri
