# BeniFonla

**BeniFonla**, kullanıcıların ürünlerini, yaratıcı fikirlerini ve projelerini
tanıtarak belirli bir hedef tutar ve süreyle destek toplayabildiği **ödül
temelli kitle fonlama** platformudur.

> BeniFonla bir yatırım, hisse satışı, faiz veya finansal getiri ürünü
> **değildir**. Kullanıcılar kampanyalara destek olur ve karşılığında —
> tanımlanmışsa — ödül (reward) alır.

## Mevcut faz: Faz 1 — Başlangıç İskeleti

Bu repo şu an yalnızca **güvenli ve sürdürülebilir bir başlangıç iskeleti**
içerir. Backend, veritabanı, kimlik doğrulama ve ödeme entegrasyonu **henüz
yoktur** ve uygulama yayınlanmamıştır.

Uygulanmış olanlar:

- React 19 + TypeScript (strict) + Vite 7 + TanStack Start
- TanStack Router (dosya tabanlı routing) ve TanStack Query
- Tailwind CSS v4 + shadcn/ui
- React Hook Form + Zod (form altyapısı için kurulu)
- Vitest + Testing Library (smoke test)
- Klasör yapısı, env örneği, dokümantasyon ve branch stratejisi

Henüz **uygulanmamış** olanlar (sonraki fazlar):

- Faz 2 — Tasarım sistemi ve marka kimliği
- Faz 3 — Lovable Cloud (Supabase) bağlantısı, şema ve RLS
- Faz 4 — Kimlik doğrulama (kullanıcı kayıt, giriş, profil)
- Faz 5 — Kampanya CRUD ve moderasyon akışı
- Faz 6 — Destek (contribution) ve ödeme entegrasyonu (TRY)
- Faz 7 — Payout, refund ve finans ledger'ı
- Faz 8 — Admin / moderasyon paneli
- Faz 9 — Üretim sertleştirmesi (security, observability)

## Yerel çalıştırma

Gereksinim: [Bun](https://bun.com/) veya Node 20+.

```bash
bun install
bun run dev          # geliştirme sunucusu
bun run build        # üretim derlemesi
bun run typecheck    # TypeScript kontrolü
bun run lint         # ESLint
bun run test         # Vitest (watch)
bun run test:run     # Vitest (tek seferlik)
```

## Klasör yapısı

```text
src/
  app/          # uygulama-seviyesi yardımcılar (provider, app-config)
  routes/      # TanStack Router dosya tabanlı route'lar
  pages/       # sayfa-seviyesi bileşenler (route dosyaları buradan import eder)
  components/
    common/    # ortak ufak bileşenler
    ui/        # shadcn/ui bileşenleri
  features/    # ileride özellik bazlı modüller
  hooks/
  lib/         # saf yardımcılar, üçüncü taraf yapılandırmaları
  types/
  test/        # test setup'ı ve render yardımcıları
docs/          # mühendislik dokümantasyonu
```

> Not: `src/routes/` TanStack Router için zorunlu konumdur. `src/pages/`
> framework routing için kullanılmaz; route dosyaları sayfa bileşenlerini
> oradan import eder.

## Branch stratejisi

Detay için bkz. [`docs/development-workflow.md`](./docs/development-workflow.md).

- `main` — yalnızca doğrulanmış kararlı sürümler
- `develop` — fazların birleştirildiği aktif geliştirme branch'i
- `feature/<kisa-aciklama>` — yeni özellik çalışmaları
- `fix/<kisa-aciklama>` — hata düzeltmeleri
- `chore/<kisa-aciklama>` — bakım ve araç değişiklikleri

## Dokümantasyon

- [Geliştirme akışı ve branch stratejisi](./docs/development-workflow.md)
- [Workspace Knowledge — geliştirme kuralları](./docs/workspace-knowledge.md)
- [Project Knowledge — ürün ve alan bilgisi](./docs/project-knowledge.md)
- [Ortamlar (local/staging/production)](./docs/environments.md)

## Güvenlik

- Hiçbir secret, service role key veya ödeme anahtarı frontend kodunda ya
  da git geçmişinde bulunmaz.
- Bu fazda gerçek anahtar **kullanılmamıştır**. `.env.example` yalnızca
  şablondur.
