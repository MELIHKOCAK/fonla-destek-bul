# Domain sözlüğü

Bu sözlük **kanoniktir**. Kod, veritabanı şeması, UI metni ve dokümantasyon
buradaki tanımlardan **sapamaz**. Yeni terim eklenmeden veya mevcut terim
yeniden tanımlanmadan önce bu dosya güncellenmelidir.

> **Kritik mimari kural:** `Contribution`, `Payment`, `Refund` ve `Payout`
> **aynı tablo** veya **aynı `status` alanı** ile temsil **edilemez**.
> Her biri bağımsız bir varlıktır, bağımsız bir yaşam döngüsüne (state
> machine) sahiptir ve ayrı tablolarda saklanır. Bu kuralın ihlali
> finansal tutarsızlığa ve auditlenememeye yol açar.

---

## `Campaign`

- **Türkçe UI:** "Kampanya"
- **Tanım:** Bir Creator'ın oluşturduğu; başlığı, hikâyesi, görseli,
  **hedef tutarı** (kuruş cinsinden integer), **süresi** (başlangıç ve bitiş
  tarihi), kategorisi, opsiyonel **reward tier**'ları ve bir **yaşam
  döngüsü durumu** olan fonlama girişimidir.
- **Değildir:** Bir ürün listingi, bir bağış toplama sayfası (kâr amacı
  güden destek kabul eden bir reward kampanyasıyla eşdeğer değildir; bu
  MVP'de saf reward modelidir), bir yatırım teklifi.
- **İlişkili:** `Creator`, `Reward Tier`, `Contribution`, `Settlement`,
  `Payout`.

## `Creator`

- **Türkçe UI:** "Kampanya sahibi" / "Yaratıcı"
- **Tanım:** Bir kampanyanın sahibi ve içerik sorumlusu olan **User**.
  Creator olmak **ayrı bir kullanıcı tipi veya rol değildir**; her
  authenticated user kampanya oluşturabilir ve oluşturduğu kampanya
  üzerinde Creator yetkisine sahip olur. Creator yetkisi **kampanya
  bazında** verilir, kullanıcıya kalıcı olarak değil.
- **Değildir:** Kalıcı bir rol; admin onayı gerektiren bir başvuru
  statüsü; finansal işlem yetkilisi.
- **İlişkili:** `User`, `Campaign`, `Payout`.

## `Backer`

- **Türkçe UI:** "Destekçi"
- **Tanım:** Bir kampanyaya **destek** (contribution) gönderen
  authenticated User.
- **Değildir:** Yatırımcı, ortak, alacaklı, hissedar.
- **İlişkili:** `User`, `Contribution`, `Reward Tier`.

## `Contribution`

- **Türkçe UI:** "Destek"
- **Tanım:** Bir Backer'ın bir kampanyaya verdiği **destek kaydı /
  taahhüdü**. İş seviyesi mantıksal birimdir; tutar, kampanya, backer
  ve opsiyonel reward tier ile birlikte saklanır. Kendi bağımsız
  yaşam döngüsüne sahiptir
  (`docs/contribution-payment-state-machine.md`).
- **Değildir:** Bir Payment. Bir Contribution **yapıldığı an** tahsilat
  gerçekleşmiş demek değildir; tahsilat ayrı bir varlık olan `Payment`
  attempt'leri ile yürür.
- **İlişkili:** `Backer`, `Campaign`, `Reward Tier`, `Payment`, `Refund`.

## `Payment`

- **Türkçe UI:** "Ödeme"
- **Tanım:** Bir Contribution için **ödeme sağlayıcısında gerçekleşen
  ödeme denemesi veya kesinleşmiş işlem**. Her Payment kendi yaşam
  döngüsüne sahiptir (`created → pending → authorized → captured`
  vb.). Bir Contribution'ın **birden fazla Payment attempt'i olabilir**
  (örn. ilk attempt `failed`, ikincisi `captured`).
- **Değildir:** Contribution'ın kendisi; tek seferlik garanti edilmiş
  tahsilat; ledger entry'sinin kendisi.
- **İlişkili:** `Contribution`, `Refund`, `Ledger Entry`, `Provider Fee`.

## `Refund`

- **Türkçe UI:** "İade"
- **Tanım:** **Kesinleşmiş** (captured) bir Payment'in tamamının veya —
  destekleniyorsa — bir kısmının geri ödenmesi.
- **Değildir:** Bir authorization iptali (`cancelled`); henüz captured
  edilmemiş bir tutar refund edilmez, **cancel** edilir.
- **İlişkili:** `Payment`, `Contribution`, `Ledger Entry`.

## `Payout`

- **Türkçe UI:** "Ödeme aktarımı" / "Yaratıcıya ödeme"
- **Tanım:** Bir kampanya `successful` olduktan sonra **settlement
  hesabı** sonucunda Creator'a aktarılması onaylanan ve/veya gerçekleşen
  **net tutar**. Payout kaydı bağımsız bir varlıktır ve kendi durumlarına
  sahiptir (`payout_pending`, `paid_out`).
- **Değildir:** Brüt fonlanan tutar; tek tek payment kayıtlarının
  toplamı (fee'ler düşülmemiş); contribution refund'larını içermez.
- **İlişkili:** `Campaign`, `Settlement`, `Platform Fee`, `Provider Fee`.

## `Platform Fee`

- **Türkçe UI:** "Platform komisyonu"
- **Tanım:** Başarılı kampanyalarda BeniFonla'nın aldığı komisyon.
  Settlement aşamasında brüt tutardan düşülür ve **ayrı bir ledger
  entry** olarak kaydedilir.
- **Değildir:** Provider Fee'nin parçası; vergi; KDV.
- **İlişkili:** `Settlement`, `Payout`, `Ledger Entry`.

## `Provider Fee`

- **Türkçe UI:** "Ödeme sağlayıcı masrafı"
- **Tanım:** Ödeme sağlayıcısının (sandbox/üretim) Payment ve Refund
  başına aldığı masraf. Settlement'ta brüt tutardan düşülür ve **ayrı
  bir ledger entry** olarak kaydedilir.
- **Değildir:** Platform Fee; vergi.
- **İlişkili:** `Payment`, `Refund`, `Settlement`, `Ledger Entry`.

## `Reward Tier`

- **Türkçe UI:** "Ödül seviyesi"
- **Tanım:** Creator'ın kampanya içinde tanımladığı, **belirli bir
  destek tutarı ve üzeri** için sunduğu ödül seviyesi (ör. teşekkür
  kartı, erken erişim, fiziksel ürün). Reward bir **fiziksel veya
  sembolik karşılıktır**; finansal getiri vaadi içeremez.
- **Değildir:** Hisse, gelir paylaşımı, faiz, kâr payı, satış sözleşmesi
  (MVP'de hukuki olarak satış değil destek karşılığı ödül modelidir).
- **İlişkili:** `Campaign`, `Contribution`.

## `Settlement`

- **Türkçe UI:** "Hesap kapatma" / "Mutabakat"
- **Tanım:** Bir kampanyanın `successful` olmasının ardından **brüt
  fonlanan tutar**, **iadeler**, **provider fee**, **platform fee** ve
  diğer geçerli kesintiler üzerinden **net payout tutarının
  hesaplanması** sürecidir. Settlement bir hesaplama olayıdır; sonucu
  bir Payout kaydına bağlanır.
- **Değildir:** Payout'un kendisi; gerçek banka transferi.
- **İlişkili:** `Campaign`, `Payout`, `Platform Fee`, `Provider Fee`,
  `Refund`, `Ledger Entry`.

## `Ledger Entry`

- **Türkçe UI:** İç kavram; UI'da doğrudan gösterilmez (Admin/finans
  görünümünde "İşlem kaydı").
- **Tanım:** **Değiştirilmeyen (append-only)** finansal olay kaydı.
  Tutar, tip (`payment_captured`, `refund_issued`, `platform_fee`,
  `provider_fee`, `payout_paid`, `chargeback` vb.), referans (payment
  id, refund id, payout id), yön (`debit`/`credit`), zaman ve
  correlation id içerir.
- **Değildir:** Düzenlenebilir bir defter satırı; günlük log; audit log
  (audit log durum geçişlerini izler, ledger ise para hareketlerini).
  Bir ledger entry **silinmez ve güncellenmez**; düzeltme yeni bir
  **ters kayıt** ile yapılır.
- **İlişkili:** Tüm finansal varlıklar.

---

## Audit log vs. Ledger ayrımı

- **Audit log**: domain durum geçişlerini izler (kim, ne zaman, hangi
  state'e geçirdi, hangi sebep). Finansal değildir.
- **Ledger**: yalnızca para hareketlerini izler. Append-only.

İki kayıt türü farklı tablolardır ve farklı amaçlara hizmet eder.
