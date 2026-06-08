# Fonksiyonel olmayan gereksinimler (NFR)

Bu gereksinimler **her özellik PR'ı** için geçerlidir ve `Definition of
Done` listesinin temelini oluşturur.

## 1. Güvenlik

- **RLS her tabloda zorunludur.** RLS olmadan hiçbir public şema tablosu
  prod'a alınmaz. Politikalar `security definer` `has_role(user_id,
  role)` ve sahiplik koşulları üzerinden yazılır.
- **Server-side validation:** Tüm server function ve server route
  giriş verileri **Zod** ile doğrulanır. Client-side validation yalnızca
  UX'tir, güvenlik kontrolü değildir.
- **Least privilege:** PostgREST grant'leri minimum yetki ile verilir
  (`SELECT/INSERT/UPDATE/DELETE` yalnızca gereken rollere). `service_role`
  yalnızca server tarafında kullanılır.
- **Secret isolation:** Gizli anahtarlar (service role, ödeme sağlayıcısı
  private key, webhook secret) yalnızca `process.env` üzerinden server
  tarafında okunur. `VITE_*` ön ekli değişkenler **gizli kabul edilmez**.
- Webhook handler'ları **imza doğrulaması** yapar; doğrulama başarısızsa
  401 döner, payload işlenmez.
- Service role anahtarı **asla** frontend bundle'ına, log'a, hata
  mesajına veya commit'e sızmaz.

## 2. Tutarlılık ve bütünlük

- Kritik işlemler (state geçişi + ledger yazımı) **tek transaction**
  içinde commit edilir.
- **Idempotency:** Her dış (provider) çağrı için `idempotency_key`;
  her webhook için `provider_event_id` üzerinde **UNIQUE** constraint.
- **Unique constraint'ler:**
  - `webhook_events(provider_event_id)`
  - `user_roles(user_id, role)`
  - `favorites(user_id, campaign_id)`
  - `follows(follower_id, followee_id)`
- **Audit log:** Her domain state geçişi (`actor_id`, `actor_role`,
  `from_state`, `to_state`, `reason?`, `correlation_id`, `created_at`)
  ayrı bir tabloya yazılır. Audit log **append-only**'dir.
- **Ledger append-only.** UPDATE/DELETE yasak; düzeltme yeni ters
  entry ile.

## 3. Erişilebilirlik

- **WCAG 2.1 AA** temel hedefimizdir.
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<header>`, `<form>`,
  `<label>` doğru kullanım.
- **Klavye navigasyonu:** Her etkileşim klavye ile yapılabilir; tab
  sırası mantıklı.
- **Görünür focus state:** Tailwind `focus-visible:ring-*` kullan;
  outline kaldırılmaz.
- **Form etiketleri:** Her input için `<label htmlFor>` veya
  `aria-label`. Hata mesajları `aria-describedby` ile bağlanır.
- **Kontrast:** Token bazlı; `--background`/`--foreground` çiftleri
  AA kontrast oranını sağlar.
- Görseller için `alt` metni; dekoratif görsellerde boş `alt=""`.

## 4. Performans

- Liste sayfalarında **pagination** (cursor veya offset+limit;
  default 20).
- **Projection:** Query'ler yalnızca ihtiyaç duyulan kolonları çeker
  (`SELECT *` yasak).
- **Index stratejisi (örnek):**
  - `campaigns(status, ends_at)`
  - `campaigns(category_id, status)`
  - `campaigns(slug)` UNIQUE
  - `contributions(campaign_id, status)`
  - `payment_attempts(contribution_id, status)`
  - `ledger_entries(campaign_id, created_at)`
  - `webhook_events(provider_event_id)` UNIQUE
- **Lazy loading / route splitting:** TanStack Router code splitting
  kullanılır; ağır bileşenler dinamik import edilir.
- Görseller WebP/AVIF + responsive `sizes`; üst kıvrımdaki tek görsel
  haricinde **lazy**.

## 5. Gözlemlenebilirlik

- **Yapılandırılmış JSON log** server tarafında: `level`, `msg`,
  `correlation_id`, `user_id?`, `campaign_id?`, `event`.
- **Correlation / request id:** Her istek için bir ID üretilir, log ve
  audit/ledger entry'lerine yazılır.
- **Hata takibi:** Mevcut `reportLovableError` zaten root error
  boundary'ye bağlı; yeni boundary'ler de aynı kanalı kullanır.
- Webhook ve scheduled job'lar başlangıç/bitiş/hata olarak loglanır.

## 6. Gizlilik

- **Minimum veri:** Yalnızca işlevsel olarak gerekli PII toplanır.
- **Kart verisi saklanmaz.** Ödeme bilgileri provider tarafından
  tokenize edilir; bizim DB'mizde PAN, CVV, tam kart no **bulunmaz**.
- **PII erişim sınırı:** E-posta, telefon, adres gibi alanlar yalnızca
  ilgili kullanıcıya ve gerekli Admin/Moderator rollerine açıktır.
- Kullanıcı **hesap silme** ile birlikte profil PII'si anonimleştirilir
  (Ledger entry'leri korunur — finansal kayıt geçmişi silinmez, ama
  user referansı pseudonymize edilir).

## 7. Test edilebilirlik

- **Frontend unit / component:** Vitest + Testing Library.
- **Database / RLS testleri:** İleride policy davranışı doğrulanır
  (yetkisiz kullanıcı erişim denemesi, sahiplik kontrolleri).
- **Server function / route entegrasyon:** Auth middleware, Zod
  validation, idempotency davranışları test edilir.
- **Browser akışı (E2E):** Sonraki fazda kritik akışlar (login, destek,
  refund) için.
- Her PR ilgili katmanın testlerini çalıştırır; coverage zorlanmaz ama
  **kritik finans yolları** için test zorunlu.

## 8. Sürdürülebilirlik

- Domain dili (`docs/domain-glossary.md`) ile kod ve UI tutarlı kalır.
- Yeni özellik **mevcut state machine'leri bozmaz**; gerekiyorsa state
  machine dokümanı önce güncellenir.
- Migration'lar **forward-only**; rollback senaryosu için ileri
  düzeltme migration'ı yazılır.
