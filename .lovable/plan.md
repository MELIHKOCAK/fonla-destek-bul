
# BeniFonla — Production Öncesi Uçtan Uca Test Planı

Amaç: tüm sayfa, route, akış, veritabanı işlemi, Edge Function ve güvenlik kuralını gerçek davranışla doğrulamak; bulunan hataları güvenli şekilde düzeltip regresyonla onaylamak; sonunda kanıta dayalı bir rapor üretmek.

Çalışma kuralı: her aşama "Test → Hata → Düzeltme → Yeniden Test → Regresyon" döngüsüyle yürür. Hiçbir bölüm test edilmeden başarılı sayılmaz.

## Faz 0 — Envanter Çıkarma (salt okunur)

`src/routes/`, `src/components/`, `src/lib/`, `src/hooks/`, `supabase/migrations/`, `src/routes/api/` taranır. Çıktı: tek bir `TEST_INVENTORY.md` (geçici, raporun ekine girer).

- Tüm route'lar (public / `_authenticated/` / admin / dinamik / `api/public/*`)
- Tüm formlar, butonlar, modallar, dosya yükleme alanları
- Tüm `createServerFn` ve server route handler'ları
- Supabase tabloları, RLS politikaları, RPC'ler, trigger'lar, storage bucket'ları
- Kullanılan secret/env değişkenleri ve harici entegrasyonlar (Stripe, Lovable AI)
- Roller: guest, user (backer), creator, moderator, admin

## Faz 1 — Statik Doğrulama

- `tsc` (strict) + lint + production build
- `supabase--linter` (security + performance)
- `rg` ile yasaklı kalıplar: `any`, `@ts-ignore`, `console.log`, `service_role`, sabit token
- Mevcut Vitest suite tam çalıştırma (önceki turda 111/112 → 112/112 hedef)

## Faz 2 — Route ve Navigasyon Testleri

Her route için: doğrudan URL, refresh, geri/ileri, geçersiz param, silinmiş kayıt, 404. Public sayfaların SSR yanıtı + `<title>` / OG / JSON-LD doğrulanır (`curl`). `_authenticated/*` için anonim erişim → `/auth` redirect testi.

## Faz 3 — Authentication

E-posta+şifre kayıt/giriş/çıkış, Google OAuth (broker), şifre sıfırlama, e-posta değiştirme, hesap silme. Session refresh, çok sekmeli logout, token süresi dolması.

## Faz 4 — Authorization & RLS (saldırgan modeli)

Anon ve `authenticated` rolleriyle doğrudan PostgREST istekleri:
- Başka kullanıcının `contributions`, `campaigns`, `profiles`, `notifications`, `campaign_reports` kayıtlarına SELECT/UPDATE/DELETE
- `user_roles` tablosuna self-insert denemesi (privilege escalation)
- `INSERT` sırasında `user_id` / `creator_id` override
- `payment_transactions`, `financial_ledger_entries`, `payouts`, `audit_logs` üzerinde her türlü yazma
- Admin RPC'leri (`is_admin`, moderation aksiyonları) normal kullanıcıyla çağırma
- Storage bucket'larında başka kullanıcının dosyasına erişim

Beklenen: tüm yetkisiz işlemler RLS seviyesinde reddedilir.

## Faz 5 — Veritabanı & Server Functions

Her `createServerFn` için: doğru/eksik/zararlı input, auth gerektiren fn'lerin anonim çağrısı (401), idempotency, hata mesajının kullanıcıya sızdırdığı detay.

CRUD: kampanya oluştur → düzenle → submit → review → publish → contribute → refund → payout zinciri. İlişkili kayıtların tutarlılığı ve cache invalidation kontrolü.

## Faz 6 — Server Routes / Webhook'lar

- `POST /api/public/hooks/stripe-webhook`: imzasız 400, geçersiz imza 401, geçerli imza 200 + idempotent
- `POST /api/public/hooks/publish-due-campaigns`: yetkisiz 401, yetkili akış
- AI summary endpoint: rate limit, provider hata fallback'i

## Faz 7 — Formlar & Validation

İletişim formu, kayıt/giriş, kampanya wizard (6 adım), reward tier, yorum, rapor, profil, şifre değiştirme. Her alanda boş/uzun/HTML/emoji/Türkçe karakter/SQL benzeri girdi. Çift submit, ağ kesintisi, server hatası senaryoları. Hata mesajlarının Türkçe, alan-bazlı, teknik detay içermemesi.

## Faz 8 — Dosya Yükleme

Kampanya medya yükleme: MIME + boyut + uzantı, kötü adlandırma, başka kullanıcının path'ine yazma denemesi, eski medyanın temizlenmesi, public/private bucket politikası.

## Faz 9 — Arama, Filtre, Sıralama, Pagination

Ana sayfa ve kategori sayfasında: Türkçe karakter, debounce, boş sonuç, URL query persistence, son sayfa, kayıt silindiğinde sayfa kayması.

## Faz 10 — State, Console, Network

Browser ile kritik akışlarda: hydration error, infinite render, "update on unmounted", missing key, controlled/uncontrolled. Network'te 401/403/404/CORS, gereksiz refetch, payload'da hassas veri sızıntısı.

## Faz 11 — Responsive & Accessibility

320 / 390 / 768 / 1280 / 1920 px'de ana akışlar. Klavye navigasyonu, focus trap (modal), alt text, kontrast, ikon-buton aria-label.

## Faz 12 — Performans

Lighthouse hızlı taraması ana sayfa + kampanya detay. N+1 sorgu, paginate edilmemiş select, bundle boyutu, lazy loading.

## Faz 13 — Güvenlik Tarama

`security--run_security_scan`, secret leak grep, redirect URL doğrulama, IDOR vakaları (Faz 4 sonuçlarıyla birlikte), Stripe sandbox akışının canlı veriye dokunmadığının teyidi.

## Faz 14 — Production Build & Smoke

`build:dev` + published preview üzerinde smoke: SSR 200, OG meta, auth gate, webhook imza reddi, 404, asset 200.

## Faz 15 — Düzeltme Döngüsü

Önem sırası: Güvenlik → Veri kaybı → Auth/Authz → Kırık route → Kırık fonksiyon → DB/Edge → Form → Responsive → Console → Performans → UX. Her düzeltme sonrası ilgili faz + ilgili Vitest dosyaları yeniden koşturulur.

## Faz 16 — Otomatik Test Eklemeleri

Eksik kritik akışlar için Vitest + RTL testi (kayıt, giriş, protected route, role guard, kampanya CRUD, RLS reddi smoke, 404). Playwright halihazırda kurulu değilse eklenmez; mevcut altyapıda kalınır.

## Faz 17 — Final Rapor

`TEST_REPORT.md` üretilir:
- Envanter sayıları (route, sayfa, form, server fn, tablo, rol)
- Tespit edilen sorunlar tablosu (önem, neden, düzeltme, retest sonucu)
- Başarılı test kategorileri
- Açık kalan sorunlar (varsa) + risk + öneri
- Final durum: kanıta dayalı tek bir cümle

## Teknik Notlar

- Yazma testleri yalnızca test kullanıcıları üzerinde; gerçek `contact_messages`, `campaigns`, `contributions` üretim kayıtlarına dokunulmaz.
- Stripe akışı yalnızca sandbox key ile.
- Hesap silme testi yalnızca özel test hesabıyla.
- Migration gerektiren düzeltmeler kullanıcı onayı ile uygulanır.
- `src/integrations/supabase/*` auto-generated dosyalarına dokunulmaz.

---

Onaylarsan Faz 0'dan başlayıp her fazın sonunda bulguları + uygulanan düzeltmeleri özetleyerek ilerlerim.
