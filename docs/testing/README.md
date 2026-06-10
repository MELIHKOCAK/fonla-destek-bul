# Test Çalıştırma Rehberi

## Önkoşullar

- Node 20+ ve `bun` (lockfile bun ile yönetiliyor).
- `bun install --frozen-lockfile` ile bağımlı paketleri kur.
- Test ortamı için `.env.test` dosyası, Supabase test projesi anahtarlarını
  içermelidir. Üretim anahtarları **asla** kullanılmaz.
- Stripe ile etkileşimli testler için yalnız **test mode** secret
  (`sk_test_...`) kabul edilir. `sk_live_...` tespit edilirse
  `src/lib/payments/__tests__/id-guards.test.ts` paketi fail-fast olur.

## Komutlar

| Amaç | Komut |
| --- | --- |
| Tüm unit/component testleri | `bun run test:run` |
| Watch modu | `bun run test` |
| Tek dosya | `bunx vitest run path/to/file.test.ts` |
| Type-check | `bun run typecheck` |
| Lint | `bun run lint` |
| Build | `bun run build` |

## DB / pgTAP (planlı)

Supabase CLI ile yerel stack ayağa kalktığında:

```
supabase start
supabase db reset
supabase test db
```

pgTAP scriptleri `supabase/tests/` altına eklendiğinde CI matrisine
girer.

## Edge Function testleri (planlı)

```
supabase functions test
```

veya TanStack server function entegrasyon testleri için
`bunx vitest run --project edge`.

## E2E (Playwright — planlı)

```
bun run build
bun run preview &
bunx playwright test
```

E2E sandbox Stripe key gerektirir; CI yalnız `pull_request` branch
korumalı ortamda çalıştırır.

## Stripe Sandbox Manuel Matris

`docs/testing/test-matrix.md` içindeki "Manuel Stripe Sandbox" tablosunu
adım adım uygula. Her release öncesi sonuçları
`docs/testing/manual-runs/<tarih>.md` altına commit et.

## Test ortamı vs Live ayrımı

- `import.meta.env.MODE === "test"` veya `process.env.NODE_ENV === "test"`
  iken yalnızca test datası üretilir.
- `STRIPE_SECRET_KEY` `sk_live_` ile başlıyorsa finans testleri abort eder.
- Production DB host'una karşı test koşulması engellenir (bkz.
  `src/test/setup.ts` `assertNotProductionDb`).

## CI Davranışı

GitHub Actions workflow'u `.github/workflows/ci.yml`:

1. `bun install --frozen-lockfile`
2. `bun run typecheck`
3. `bun run lint`
4. `bun run test:run -- --coverage`
5. `bun run build`
6. Coverage raporu artifact olarak yüklenir; finans modülü için
   threshold `90%`, genel için `60%`.
7. Hata logları artifact'a yazılır; Stripe ve Supabase anahtarları
   `***` ile maskelenir.
8. Test failure deploy'u bloklar (branch protection ile eşleştir).
