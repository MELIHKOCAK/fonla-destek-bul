# Ürün kapsamı (MVP)

## 1. Ürün tanımı

**BeniFonla**, kullanıcıların ürünlerini, yaratıcı fikirlerini ve projelerini
tanıtarak **belirli bir hedef tutar ve süreyle** destek toplayabildiği
**ödül (reward) temelli bir kitle fonlama** platformudur.

BeniFonla **kesinlikle**:

- Bir **yatırım** platformu **değildir**.
- Hisse, ortaklık, menkul kıymet satışı **değildir**.
- Faiz, kâr payı, finansal getiri veya kazanç vaadi **vermez**.
- Bir **kullanıcı cüzdanı / bakiye / saklama** ürünü **değildir**.
- P2P borç verme **değildir**.

Bir Backer'ın bir kampanyaya verdiği destek, yalnızca kampanyanın
tanımladığı **reward tier** karşılığında ödül talep hakkı doğurur;
finansal bir getiri talebi doğurmaz.

## 2. MVP'de kesin olarak bulunacak özellikler

### 2.1. Kimlik doğrulama ve hesap

- E-posta ile **kayıt**, **giriş**, **çıkış**
- **E-posta doğrulama** akışı
- **Şifre sıfırlama** akışı (e-posta üzerinden token)
- Oturum yenileme, güvenli oturum sonlandırma

### 2.2. Profil

- Kullanıcının kendi **profil yönetimi** (ad, kısa biyografi, avatar)
- Herkese açık **creator profili** sayfası (kullanıcının açık kampanyaları,
  açıklaması)

### 2.3. Kampanya yaşam döngüsü

- **Çok adımlı kampanya taslağı oluşturma ve düzenleme** (temel bilgi,
  hikâye, görsel, hedef tutar, süre, kategori, reward tier'lar)
- Taslağı **admin incelemesine gönderme** (`submitted`)
- Admin için **revision_requested / approved / rejected / suspended**
  işlemleri
- **Yayınlama** (`scheduled` veya `live`)
- Kampanya **liste** ve **detay** sayfası
- **Arama**, **kategori filtreleme**, **filtre** (durum, hedef aralığı),
  **sıralama** (yeni, biten, popüler)

### 2.4. Etkileşim

- **Favori** ekleme/çıkarma
- Kullanıcı / creator **takip etme**
- Kampanyaya **temel yorum** ekleme
- **Creator yanıtı**
- **Şikâyet** (içerik moderasyonu için)

### 2.5. Destek (contribution) akışı

- **Reward tier** tanımlama ve seçme
- **Destek verme** akışı (tutar seçimi, opsiyonel reward tier, onay ekranı)
- **Sandbox ödeme** entegrasyonu (gerçek tahsilat hukuki uyum sonrası açılır)
- **Başarı / başarısızlık sonucu** ekranları
- Backer için **kendi contribution / payment / refund özetini görüntüleme**

### 2.6. Finans kaydı

- **Platform komisyonu** (Platform Fee) hesabı ve kaydı
- **Provider fee** ayrı kaydı
- **İade** (refund) kayıtları
- **Payout** kayıtları (gerçek transfer mekanizması Faz sonrasında devreye
  alınır; MVP'de kayıt + Admin görünürlüğü zorunludur)
- **Append-only ledger** üzerinden tüm finansal hareketlerin izlenebilirliği

### 2.7. Paneller

- **User paneli**: profilim, favorilerim, takiplerim, desteklerim,
  bildirimlerim
- **Creator paneli**: kampanyalarım (taslak/canlı/sonuçlanmış),
  kampanya analitik özeti, gelen destekler
- **Admin paneli**: inceleme kuyruğu, kampanya yönetimi, şikâyetler,
  finans/payout görünümü

### 2.8. Bildirim

- **Uygulama içi bildirim** merkezi
- **Temel işlem e-postaları**: hoş geldin, e-posta doğrulama, şifre
  sıfırlama, kampanya durum değişiklikleri (submitted/approved/rejected/
  revision_requested/live/successful/failed), destek alındı, destek
  başarılı/başarısız, refund/payout bildirimi

## 3. MVP dışında kesin olarak bırakılan özellikler

Aşağıdaki özellikler **MVP'de yer almayacaktır** ve gerekçeleri
`docs/out-of-scope.md` içinde detaylandırılmıştır:

- Hisse, ortaklık, menkul kıymet veya finansal getiri ürünleri
- Faiz, kâr payı veya yatırım getirisi vaadi
- Kullanıcı cüzdanı, platform içi bakiye, saklama hizmeti
- Kripto para ve çoklu para birimi (yalnızca **TRY**)
- Canlı sohbet ve birebir direkt mesaj (DM)
- Gelişmiş sosyal ağ, takipçi grafiği, akış (feed) algoritması
- Mobil uygulama (yalnızca responsive web)
- Yapay zekâ ile kampanya skoru / başarı tahmini
- Karmaşık kişiselleştirilmiş öneri algoritması
- Çok satıcılı genel e-ticaret özellikleri (stok yönetimi, kargo entegrasyonu,
  envanter)

## 4. Dil ve para birimi

- Arayüz dili: **yalnızca Türkçe** (UI metinleri Türkçe; kod terimleri İngilizce).
- Para birimi: **yalnızca TRY**. Tutarlar veritabanında **kuruş cinsinden
  integer** olarak saklanır; UI'da `tr-TR` locale ile gösterilir.
