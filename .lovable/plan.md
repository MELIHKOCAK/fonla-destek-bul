
# BeniFonla — Eksik & Redirect Düzeltme Planı

Analiz sonucu bulunan sorunlar 3 öncelik grubuna ayrıldı. Onaylarsanız sırayla uygularım; istersen sadece belirli grupları seç.

## Öncelik 1 — Kırık linkler ve yanlış yönlendirmeler (hızlı, kullanıcıyı doğrudan etkiler)

**Kırık footer / nav linkleri**
- `src/routes/about.tsx`, `how-it-works.tsx`, `faq.tsx`, `contact.tsx` rotalarını oluştur. Her biri Türkçe içerik + kendi `head()` meta'sı (title, description, og:title/description). İçerik şu an için bilgilendirici statik metin (BeniFonla ürün tanımı, SSS, iletişim formu yerine e-posta + form taslağı).
- Alternatif: Bu sayfalar henüz hazır değilse linkleri footer/nav'dan kaldır. **Tercih: oluşturmak**, çünkü footer'da boşluk kalmasın.

**RegisterForm yanlış link hedefleri**
- `src/components/forms/RegisterForm.tsx:205-206`: `to="/"` → `to="/terms"` ve `to="/privacy"`.

**Sign-out / window.location**
- `src/routes/_authenticated/creator.index.tsx:113`: `window.location.href = "/creator/payment-account"` → `navigate({ to: "/creator/payment-account" })` (TanStack `useNavigate`).
- Sign-out yönlendirmeleri zaten `/login`; instructions'taki `/auth` referansını uygulamayacağız (proje `/login` kullanıyor, `/auth` rotası yok). Değişiklik gerekmiyor.

## Öncelik 2 — SEO / keşfedilebilirlik tutarsızlıkları

**robots.txt temizliği** (`public/robots.txt`)
- Sil: `Disallow: /profile`, `Disallow: /account`, `Disallow: /contributions` (var olmayan veya yanlış path).
- Ekle: `Disallow: /forgot-password`, `Disallow: /login`, `Disallow: /register` (zaten `noindex` meta'sı var ama tutarlılık için).
- `Disallow: /api/` aynen kalsın.

**sitemap.xml** (`src/routes/sitemap[.]xml.ts`)
- Statik legal sayfaları ekle: `/terms`, `/privacy`, `/cookies`, `/refund-policy`, `/risk-disclosure`, `/creator-agreement`, `/prohibited-campaigns`, `/complaints-and-appeals`.
- Öncelik 1'de oluşturulursa: `/about`, `/how-it-works`, `/faq`, `/contact` da eklenecek.

## Öncelik 3 — Teknik borç işaretleri (kısa not, kod yazılmayacak; sadece raporda kalır)

Bunlar bu faza dahil **değil**, ileride ayrı faz olarak ele alınmalı. Plan dosyasında ve `.lovable/plan.md`'de güncel açıklama:
- `checkReleaseGates()` çağrısı `checkout.functions.ts`, `refund.functions.ts`, `transfer.functions.ts` içinde yok; hâlâ hardcode `livePaymentsEnabled: false`. Live'a geçiş öncesi bağlanmalı.
- `settlement.functions.ts`: platform fee %5 hardcode, `refundedMinor = 0`. Faz 13'e bırakıldığı yorumda yazılı.
- `creators.service.ts`: creator kampanya filtresi in-memory; `get_public_campaigns` RPC'sine `_creator_id` parametresi eklenmeli.
- Faz 17.5 açık emitter'lar (12 event), bounce/complaint webhook, admin manuel retry UI.
- Onboarding gate yalnız `username` kontrolüne bakıyor; creator-rol gate'i yok.

## Doğrulama

- `bunx vitest run` (etkilenen testler).
- Build / typecheck (otomatik koşar).
- Yeni rotalar için `src/routeTree.gen.ts` otomatik regenerate olur — elle dokunulmaz.
- Görsel kontrol: footer'daki 4 yeni link 404 yerine yeni sayfaları açmalı; register sayfasında "kullanım koşulları" ve "gizlilik politikası" doğru rotalara gitmeli.

## Cevap bekliyorum

1. Öncelik 1'deki yeni 4 sayfayı **oluşturayım mı**, yoksa **linkleri kaldırayım mı**?
2. Sadece Öncelik 1+2'yi mi uygulayayım, yoksa Öncelik 3'teki teknik borç maddelerinden birini de bu faza dahil edeyim mi (ör. release-gate enforcement bağlamak)?
