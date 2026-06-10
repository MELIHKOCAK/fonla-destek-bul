# Faz 14 — Performance, Accessibility, SEO Raporu

Bu doküman BeniFonla public yüzünde performans, erişilebilirlik ve SEO için
uygulanan değişiklikleri, ölçüm baseline'ını ve bilinen kısıtları kaydeder.
Lighthouse veya benzeri sayılar **manuel ölçümle** doğrulanmalıdır; bu
dokümanda tahmin/uydurma metrik yer almaz.

## Baseline (ölçüm yapıldığında doldurulacak)

| Metrik | Ortam | Cihaz | Değer | Tarih |
|---|---|---|---|---|
| LCP (Home) | published | Mobile 4G | _to-fill_ | _to-fill_ |
| CLS (Home) | published | Mobile 4G | _to-fill_ | _to-fill_ |
| INP (Discover) | published | Mobile 4G | _to-fill_ | _to-fill_ |
| TBT (Campaign Detail) | published | Mobile 4G | _to-fill_ | _to-fill_ |
| Bundle (gzip, initial JS) | preview | desktop | _to-fill_ | _to-fill_ |

Lighthouse'u CLI ile (`bunx lighthouse https://benifonla.lovable.app
--preset=desktop`) ve Chrome DevTools "Performance" panelinde 4× CPU throttle
+ "Slow 4G" ile çalıştırın; sonuçları bu tabloya yazın.

## Bu fazda yapılan değişiklikler

### SEO
- `public/robots.txt` — admin/dashboard/settings/onboarding/notifications/
  profile/account/contributions/creator/api/auth-callback/reset-password/
  unauthorized/design-system disallow; sitemap referansı.
- `src/routes/sitemap[.]xml.ts` — dinamik sitemap; yalnız public statüdeki
  (live/successful/paid_out/refunded) kampanyalar, kategoriler ve
  `profiles.is_public=true` creator'lar. Draft/in_review/suspended/cancelled
  asla sitemap'e dahil değil. `Cache-Control: public, max-age=900, s-maxage=3600`.
- `src/lib/seo/meta.ts` — paylaşılan canonical, openGraph ve NOINDEX_META
  yardımcıları (SITE_URL = `https://benifonla.lovable.app`).
- Private route'larda `<meta name="robots" content="noindex, nofollow">`:
  `login`, `register`, `forgot-password`, `reset-password`, `auth.callback`,
  `unauthorized`, ve `_authenticated` layout (admin/creator/dashboard/
  settings/notifications/onboarding/profile/account/contributions hepsini
  kapsar).
- `/search` route'u filtre/q/page>1/non-default sort durumlarında
  `noindex, follow` ile işaretlenir; base `/search` indekslenmeye açık.

### Türkçe slug
- `src/lib/seo/slugify.ts` — Türkçe transliteration (ç→c, ğ→g, ı→i, ö→o,
  ş→s, ü→u; büyük harfler dahil), kalan diakritikler NFKD ile soyulur,
  alfasayısal olmayan karakterler `-`, baş/son dash trim, max 96 karakter.
- `slugifyUnique(input, existingSet)` çakışma durumunda `-2`, `-3` … suffix
  üretir; aşırı çakışmada timestamp fallback. Caller mevcut slug
  kümesini sağlar; DB unique constraint son savunma olarak kalır.
- Test: `src/lib/seo/__tests__/slugify.test.ts` (transliteration,
  whitespace/punctuation, boş input, uzunluk, deterministiklik, suffix).

### Accessibility
- `src/components/layout/AppShell.tsx` — skip link (`İçeriğe atla` →
  `#main`) eklendi; klavye tab'ında focus-visible ile görünür hale gelir.
  `<main id="main" tabIndex={-1}>` aktivasyonda focus alabilir.
- `_authenticated`, `login`, `register`, `forgot-password`,
  `reset-password`, `auth.callback`, `unauthorized` head'leri korunmuş
  semantic title ile birlikte güncellendi.

## Bilinen kısıtlamalar — bu faz kapsamında düzeltilmedi

1. **Dynamic campaign metadata (OG share preview).** TanStack Start SSR ile
   `head()` server-side render edilir, ama mevcut `CampaignDetailPage` veriyi
   client-side `useQuery` ile çekiyor — route loader'a taşınmadığı için
   crawler kampanya başlığı/açıklamasını dinamik göremez. Faz 14.5'te
   `campaigns.$slug.tsx` route'una `loader` + `ensureQueryData(...)` +
   loader-data'dan `head()` üretimi eklenmesi gerekiyor. Şu anda paylaşım
   önizlemesi kök `__root.tsx` default'larına düşer; **bu sınırlama dürüstçe
   raporlanıyor, "OG tamamlandı" denmiyor.**
2. **JSON-LD structured data.** Campaign için doğru schema.org tipi
   (CreativeWork / Project / DonateAction) seçimi Faz 14.5'e bırakıldı;
   yanlış `Investment` / `FinancialProduct` / sahte `review`/`rating` ile
   uydurma yapılmadı.
3. **OG image pipeline.** Sosyal görseller cover external URL varsa
   kullanılabilir (helper hazır, `openGraphMeta` mutlak https URL şartı
   uyguluyor), ancak signed Supabase storage URL'leri kısa ömürlü olduğu
   için crawler-friendly değil. Dedicated public OG image fallback'i
   (`/og/default.png`) ve campaign cover için CDN-stable URL Faz 14.5.
4. **Image format optimization (AVIF/WebP).** Mevcut kampanya cover'ları
   CSS gradient string olarak saklanıyor (bkz. `gradientFromId`).
   `<img>` ile responsive `srcset/sizes` ve LCP eager-priority bilinçli
   atama, gerçek cover image URL pipeline'ı (Faz 14.5) sonrasında
   uygulanmalı.
5. **Code splitting metrikleri.** TanStack Start otomatik route-level code
   splitting yapıyor (default `autoCodeSplitting: true`), ek manuel split
   yapılmadan önce gerçek bundle ölçümü gerek. `bun run build` çıktısındaki
   chunk size raporu baseline'a yazılmalı.
6. **Slug history / redirects.** Published slug değişirse 301 redirect
   tablosu (`campaign_slug_history`) henüz yok; Faz 14.5 kapsamında.

## Manuel yapılması gereken

- Lighthouse mobile + desktop ölçümü published URL üzerinde, sonucu
  bu dokümanın "Baseline" tablosuna işle.
- `axe DevTools` veya `@axe-core/playwright` ile public sayfalarda
  otomatik a11y taraması; bulunan kritik (critical/serious) finding'ler
  Faz 14.5'e kart olarak açılmalı.
- Google Search Console'a `https://benifonla.lovable.app/sitemap.xml`
  eklenmesi.
- Facebook Sharing Debugger / Twitter Card Validator ile mevcut OG
  davranışını doğrula; dinamik campaign sayfasının default'a düştüğünü
  görmek beklenen mevcut durumdur.

## Açık kalan riskler

- `_authenticated` altındaki tüm sayfalar artık noindex; eğer ileride
  bilinçli olarak public yapılacak bir alt rota olursa (örn.
  `/_authenticated/public-preview`) o leaf'te `robots` meta override
  edilmeli.
- Sitemap query `supabaseAdmin` ile çalışır ve RLS bypass eder; yalnız
  public statü filtreleri sayesinde özel veri çıkmaz. Status enum'a
  yeni private statü eklenirse sitemap whitelist güncellenmelidir.
- `slugify` 96 karakter sınırı seçildi; mevcut DB slug kolonunun text
  olduğu doğrulandı (sınırsız). Caller tarafında uzun başlıkların
  kesilmesi UI'da görünür hale gelmediği için sorun yok.

## Test çıktısı

```
bunx vitest run src/lib/seo/__tests__/slugify.test.ts
```

Beklenen: tüm slug testleri geçer. Build/typecheck harness tarafından
otomatik çalıştırılır.
