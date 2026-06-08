
# BeniFonla — Faz 2: Ürün Sözleşmesi ve Domain Dokümantasyonu

**Kapsam:** Yalnızca `docs/` altına dokümantasyon. Hiçbir uygulama kodu, route, bileşen, paket, test veya UI dosyası **değişmeyecek**. Mevcut Faz 1 iskeleti aynen korunur.

## 1. Önce inceleme

Mevcut `docs/project-knowledge.md` ve `docs/workspace-knowledge.md` dosyaları kaynak gerçek olarak okunur; yeni dokümanlar bunlarla çelişmez, eksik kalan yerleri genişletir. Yaşam döngüsü ve terim seti zaten Faz 1'de taslak halinde var — Faz 2 onları kanonik sözleşmeye çevirir ve durum makinelerini ayrıştırır.

## 2. Oluşturulacak / güçlendirilecek dokümanlar

Tümü `docs/` altında, Türkçe içerik, İngilizce kod terimleriyle birlikte:

### `docs/product-scope.md`
- BeniFonla'nın kesin tanımı (ödül temelli kitle fonlama; yatırım/menkul kıymet/faiz DEĞİL).
- **MVP'de var** listesi: e-posta auth (kayıt/giriş/çıkış/doğrulama/şifre sıfırlama), kullanıcı profili + public creator profili, çok adımlı kampanya taslak/düzenleme, admin inceleme akışı (revision/approve/reject/suspend), yayınlama + liste + detay, arama/kategori/filtre/sıralama, favori/takip/yorum/creator yanıtı/şikâyet, reward tier, destek akışı, sandbox ödeme, başarı/başarısızlık sonucu, platform komisyonu + iade + payout kayıtları, User/Creator/Admin panelleri, uygulama içi bildirim + temel işlem e-postaları.
- **MVP dışı** kesin liste (hisse, faiz, cüzdan, kripto, çoklu para, canlı sohbet/DM, sosyal grafik, mobil uygulama, AI skor, kişiselleştirilmiş öneri, çok satıcılı e-ticaret).

### `docs/domain-glossary.md`
- Her terim için: kanonik İngilizce ad, Türkçe arayüz metni, kesin tanım, **ne DEĞİLDİR**, ilişkili terimler.
- Terimler: `Campaign`, `Creator`, `Backer`, `Contribution`, `Payment`, `Refund`, `Payout`, `Platform Fee`, `Provider Fee`, `Reward Tier`, `Settlement`, `Ledger Entry`.
- Açık vurgu: **Contribution, Payment, Refund ve Payout aynı tabloda veya aynı `status` alanında temsil edilemez** — her biri bağımsız varlık ve bağımsız state machine'e sahiptir.

### `docs/roles-and-permissions.md`
- Aktörler: Guest, User, Creator, Backer, Moderator (gelecek), Admin.
- Her aktör için: yapabilecekleri, yapamayacakları, yetki sınırı (özellikle: Admin **finans kaydını doğrudan değiştiremez**; durum geçişi tetikleyebilir, ledger ters kayıt ister).
- Açık vurgu: **Creator kalıcı ayrı kullanıcı tipi değildir**, kampanya sahipliği ilişkisidir. Bir kişi aynı anda User + Creator (bir kampanyasında) + Backer (başka kampanyada) olabilir.
- Yetki matrisi tablosu (aktör × kaynak × eylem).

### `docs/campaign-state-machine.md`
- Tüm geçerli durumlar: `draft`, `submitted`, `under_review`, `revision_requested`, `approved`, `scheduled`, `live`, `successful`, `failed`, `suspended`, `cancelled`, `payout_pending`, `paid_out`, `refunding`, `refunded`, `rejected`.
- **Geçiş tablosu** sütunları: kaynak durum, hedef durum, tetikleyen aktör, ön koşullar, yan etkiler, audit log alanı, bildirim hedefi.
- Geçerli geçişler (yalnızca):
  ```text
  draft → submitted (Creator)
  submitted → under_review (Admin)
  under_review → revision_requested (Admin)
  revision_requested → submitted (Creator)
  under_review → approved (Admin)
  under_review → rejected (Admin)
  approved → scheduled | live (sistem, başlangıç tarihine göre)
  scheduled → live (sistem, planlanan zamanda)
  live → successful (sistem, süre + hedef koşulu)
  live → failed (sistem, süre doldu hedef yok)
  live → suspended (Admin)
  suspended → live | cancelled (Admin)
  successful → payout_pending → paid_out (sistem + Admin onayı)
  failed → refunding → refunded (sistem)
  cancelled → refunding → refunded (sistem, tahsil varsa)
  ```
- Yasak: keyfi geriye geçiş, istemciden status değiştirme, atlamalı geçiş.
- ASCII diyagram.

### `docs/contribution-payment-state-machine.md`
- **Contribution** durumları: `initiated`, `payment_pending`, `paid`, `failed`, `cancelled`, `refund_pending`, `refunded`, `disputed`, `chargeback`.
- **Payment attempt** durumları (ayrı varlık, ayrı tablo): `created`, `pending`, `authorized`, `captured` (= `paid`), `failed`, `cancelled`, `refunded`, `partially_refunded`, `disputed`, `chargeback`.
- İki state machine'in ayrı tabloları olduğu, aralarındaki ilişkinin 1 contribution → N payment attempt olduğu.
- Örnek: ilk attempt `failed` → ikinci attempt `captured` → contribution `paid` (bir contribution'ın birden fazla attempt'inin tablo örneği).
- Geçiş tabloları + ASCII diyagram + yasak geçişler.

### `docs/money-flow.md`
- Para her zaman **TRY kuruşu cinsinden integer** saklanır; UI'da locale formatla gösterilir.
- 7 akış adım adım:
  1. **Başarılı ödeme**: contribution.initiated → payment.created → authorized → captured → contribution.paid → ledger append.
  2. **Reddedilen ödeme + yeniden deneme**: payment.failed → yeni payment attempt → captured.
  3. **Başarılı kampanya settlement & payout**: campaign.successful → gross hesap → provider fee düş → platform fee düş → net payout → payout_pending → Admin onay → paid_out → ledger.
  4. **Başarısız kampanya refund / authorization cancel**: pre-auth varsa cancel; captured varsa refund.
  5. **Chargeback**: dispute → chargeback → ledger ters kayıt + Creator bilgilendirme.
  6. **Duplicate webhook & idempotency**: provider event id ile unique constraint; aynı event ikinci kez işlenmez.
  7. **Platform fee vs Provider fee ayrımı**: ayrı ledger entry tipleri, ayrı hesap.
- Ledger'ın **append-only** olduğu, düzeltmenin yeni ters kayıtla yapıldığı.

### `docs/non-functional-requirements.md`
- **Güvenlik**: RLS her tabloda, server-side validation (Zod), least privilege grant, secret isolation (`process.env` yalnızca server), service role frontend'de YOK.
- **Tutarlılık**: kritik işlemler transaction içinde, idempotency key (özellikle ödeme/webhook), unique constraint (provider event id, contribution-attempt ilişkisi), audit log her durum geçişinde.
- **Erişilebilirlik**: WCAG 2.1 AA temelleri, klavye navigasyonu, görünür focus, semantic label, kontrast oranı.
- **Performans**: liste/arama pagination, projection (gereken kolonlar), index stratejisi (kampanya durumu, kategori, slug), lazy loading / route splitting.
- **Gözlemlenebilirlik**: yapılandırılmış JSON log, correlation id / request id, hata takibi (mevcut `reportLovableError` zaten kurulu).
- **Gizlilik**: minimum veri toplama, kart verisi tutulmaz (provider tokenize eder), PII erişimi rol bazlı.
- **Test edilebilirlik**: frontend unit (Vitest), database/RLS testleri, Edge/server function entegrasyon testleri, browser akışı (sonraki fazlarda).

### `docs/out-of-scope.md`
- MVP dışı listesi madde madde, **neden** dışta olduğu kısa gerekçesiyle (hukuki, kapsam, karmaşıklık).
- Bu maddelerin sonraki fazlara da otomatik girmediği — her biri ayrıca karar gerektirir.

### `docs/acceptance-scenarios.md`
- Anahtar kullanıcı senaryolarını Given/When/Then formatında:
  - Guest live kampanyayı görür ama destek butonuna basınca login'e yönlenir.
  - User kampanya taslağı oluşturur, submit eder, admin revision ister, düzeltip tekrar submit eder.
  - Backer canlı kampanyaya destek verir, ödeme başarılı → contribution.paid + ledger.
  - Backer ödemesi reddedilir, tekrar dener, ikincisi başarılı.
  - Kampanya süresi biter, hedef tutar, sistem successful → settlement → payout_pending.
  - Kampanya başarısız, sistem refunding → refunded.
  - Admin canlı kampanyayı suspend eder; suspend sırasında yeni contribution kabul edilmez.
  - Duplicate webhook gelir, ikincisi idempotency ile yok sayılır.
  - User şikâyet oluşturur, Admin görür.
  - Kullanıcı şifresini sıfırlar.

## 3. Çıktı eklentileri (kullanıcının istediği)

Dokümanlardan sonra son cevapta:

- **Karar Gerektiren Konular**: dokümanları yazarken karşılaşılan çelişkiler / belirsizlikler (örn. payout onayı tam otomatik mi yoksa Admin onayı mı; reward tier sınırı; refund kısmi mi tam mı).
- **Project Knowledge için yoğunlaştırılmış nihai metin**: kopyalanabilir kısa form (mevcut Faz 1 metnini Faz 2 kararlarıyla günceller).
- **Definition of Done kontrol listesi**: bir özellik PR'ının kabul edilmesi için sağlanması gereken maddeler (typecheck, lint, test, RLS, audit log, bildirim, a11y, dokümantasyon güncellemesi vb.).

## 4. Doğrulama

Kod değişmediği için:
- `bunx tsc --noEmit` — yine temiz (regression yok kontrolü).
- `bunx vitest run` — smoke test yine geçer.
- `bunx eslint .` — yine 0 hata.

## 5. Kapsam dışı (bu fazda yapılmaz)

- Hiçbir `src/` dosyası değişmez.
- Paket eklenmez/silinmez.
- Veritabanı şeması, migration, RLS politikası YAZILMAZ (yalnızca metin olarak gereksinim belgelenir; SQL Faz 3'te yazılır).
- Supabase bağlanmaz, publish yapılmaz, secret kullanılmaz.

## 6. Teslim edilecekler

9 yeni doküman + son cevapta: değişen dosyalar listesi, çalıştırılan doğrulamalar, Karar Gerektiren Konular, yoğunlaştırılmış Project Knowledge metni, Definition of Done listesi, açık riskler.
