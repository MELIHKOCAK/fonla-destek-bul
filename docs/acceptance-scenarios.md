# Kabul senaryoları (Given / When / Then)

Bu senaryolar MVP'nin kanonik davranış sözleşmesidir. Test ve QA bu
listeden türetilir.

---

## S1 — Guest destek vermek isterse login'e yönlenir

- **Given** ben oturum açmamış bir ziyaretçiyim
- **And** durumu `live` olan bir kampanyanın detay sayfasındayım
- **When** "Destek ol" butonuna tıklarım
- **Then** giriş sayfasına yönlendirilirim
- **And** giriş başarılı olunca **aynı kampanyanın destek akışına**
  geri dönerim
- **And** hiçbir Contribution kaydı oluşmaz

## S2 — Creator kampanya taslağı oluşturur ve inceleme döngüsünü tamamlar

- **Given** doğrulanmış e-postası olan bir User'ım
- **When** "Yeni kampanya" akışını başlatır ve zorunlu alanları doldurup
  kaydederim
- **Then** kampanya `draft` durumunda oluşur
- **When** "İncelemeye gönder"e basarım
- **Then** kampanya `submitted` olur ve Admin kuyruğuna düşer
- **When** Admin "inceleme başlat" işlemini yapar
- **Then** durum `under_review` olur, audit log'a kayıt düşer
- **When** Admin `revision_note` ile düzeltme talep eder
- **Then** durum `revision_requested` olur ve Creator'a bildirim gider
- **When** Creator düzeltmeleri yapıp tekrar gönderir
- **Then** durum `submitted` → ... → Admin onayı ile `approved` olur
- **And** başlangıç tarihi geçmişse sistem `live`'a alır, gelecekse
  `scheduled`'a alır

## S3 — Backer canlı kampanyaya başarılı destek verir

- **Given** oturum açmış bir User'ım
- **And** `live` bir kampanyanın destek akışındayım
- **When** geçerli bir tutar (ve opsiyonel reward tier) seçip onaylarım
- **Then** sunucuda Contribution `initiated` oluşur
- **And** ilk Payment attempt `created → pending` olur
- **When** provider webhook'u `captured` event'i gönderir
- **Then** Payment `captured`, Contribution `paid` olur
- **And** Ledger'a `payment_captured` ve `provider_fee` entry'leri
  **tek transaction**'da yazılır
- **And** Backer "destek başarılı" ekranını görür ve e-posta bildirimi
  alır

## S4 — Reddedilen ödeme, ikinci denemede başarılı olur

- **Given** Contribution `payment_pending` durumunda
- **And** ilk Payment attempt `failed` ile sonuçlandı
- **When** Backer "tekrar dene" akışına girer
- **Then** yeni bir Payment attempt **aynı** Contribution'a bağlanır
- **When** ikinci attempt `captured` olur
- **Then** Contribution `paid` olur
- **And** ledger entry'leri yalnızca **başarılı** attempt için yazılır

## S5 — Kampanya süresi biter ve hedef tutar → successful

- **Given** `live` bir kampanya
- **And** `ends_at <= now()`
- **And** toplam captured tutar `>= goal_amount`
- **When** scheduled job çalışır
- **Then** kampanya `successful` olur
- **And** sistem settlement hesabını yapar:
  `net_collected = gross_captured - refunds - provider_fees`
  `platform_fee_amt = round(net_collected * rate)`
  `net_payout = net_collected - platform_fee_amt`
- **And** `Payout` kaydı `payout_pending` ile oluşur, kampanya
  `payout_pending`'e geçer
- **And** Ledger'a `platform_fee` entry yazılır
- **When** Admin payout'u onaylar ve provider transfer success döner
- **Then** kampanya `paid_out` (terminal) olur
- **And** Ledger'a `payout_paid` entry yazılır

## S6 — Başarısız kampanya → refund

- **Given** `live` bir kampanya
- **And** `ends_at <= now()` **ve** toplam captured tutar < `goal_amount`
- **When** scheduled job çalışır
- **Then** kampanya `failed` → `refunding` olur
- **And** her captured Payment için refund attempt başlatılır;
  authorized (capture edilmemiş) için cancel yapılır
- **When** tüm refund'lar tamamlanır
- **Then** ilgili Contribution'lar `refunded`, kampanya `refunded`
  (terminal) olur
- **And** Backer'lara refund bildirimi gider

## S7 — Admin canlı kampanyayı askıya alır

- **Given** Admin'im ve `live` bir kampanyayı inceliyorum
- **When** geçerli bir `suspend_reason` ile "askıya al" işlemi yaparım
- **Then** kampanya `suspended` olur
- **And** **yeni Contribution oluşturulamaz** (sunucu reddeder)
- **And** mevcut Contribution / Payment akışları durur
- **When** inceleme tamamlanır
- **Then** Admin `live`'a döndürebilir **veya** `cancelled` yapabilir;
  `cancelled` yolunda tahsil edilmişler refund sürecine girer

## S8 — Duplicate webhook idempotency ile yok sayılır

- **Given** provider aynı `provider_event_id` ile iki kez webhook
  gönderdi
- **When** ilk istek işlenir
- **Then** state geçişi ve ledger entry'si yazılır, 2xx döner
- **When** ikinci istek gelir
- **Then** `webhook_events.provider_event_id` UNIQUE constraint
  nedeniyle **erken dönüş** yapılır, **hiçbir** state veya ledger
  değişikliği olmaz, yine 2xx döner

## S9 — User şikâyet oluşturur

- **Given** oturum açmış bir User'ım
- **And** bir kampanya detay veya yorum sayfasındayım
- **When** "Şikâyet et" akışında bir sebep + açıklama gönderirim
- **Then** şikâyet kaydı oluşur (sahipliği yalnızca kendim ve Admin
  görür)
- **And** Admin paneli kuyruğunda görünür
- **And** Admin gerekli aksiyonu alabilir (yorum gizleme, kampanya
  `suspended`, vb.)

## S10 — Kullanıcı şifresini sıfırlar

- **Given** "Şifremi unuttum" sayfasındayım
- **When** kayıtlı e-postamı girerim
- **Then** e-postaya tek kullanımlık reset token bağlantısı gider
- **And** UI **e-posta var/yok bilgisini sızdırmaz** (account
  enumeration koruması — her zaman aynı başarı mesajı)
- **When** linke tıklayıp yeni şifreyi belirlerim
- **Then** şifre değişir, açık tüm oturumlar geçersizleşir, giriş
  ekranına yönlenirim

---

## Genel sözleşme

- Hiçbir senaryoda istemci `status`, tutar veya finansal alanları
  keyfi değiştiremez.
- Hiçbir senaryoda hata sessizce yutulmaz; kullanıcı uygun hata UI'sı
  görür ve sunucu yapılandırılmış log atar.
- Hiçbir senaryoda kart verisi BeniFonla DB'sinde saklanmaz.
