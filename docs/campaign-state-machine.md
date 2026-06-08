# Kampanya state machine

> **Kritik kural:** Bu state machine **kanoniktir**. Sunucu yalnızca
> burada listelenen geçişleri kabul eder. **Atlamalı**, **keyfi geriye**
> veya **istemciden tetiklenen** geçişler **reddedilir**. Her geçiş bir
> **audit log** kaydı ve uygun bildirimleri tetikler.

## 1. Durumlar

| Durum                | Anlam                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `draft`              | Creator henüz inceleme için göndermedi; serbestçe düzenlenebilir.      |
| `submitted`          | Creator incelemeye gönderdi; Admin kuyruğunda.                         |
| `under_review`       | Admin incelemeyi devraldı; karar bekleniyor.                           |
| `revision_requested` | Admin düzeltme istedi; Creator düzenleyip yeniden submit edebilir.     |
| `approved`           | Admin onayladı; yayın için başlangıç tarihi bekleniyor.                |
| `rejected`           | Admin reddetti; terminal durum.                                        |
| `scheduled`          | Onaylı, başlangıç tarihi gelecekte; sistem `live`'a alacak.            |
| `live`               | Yayında; destek (contribution) kabul ediyor.                           |
| `suspended`          | Admin geçici olarak askıya aldı; yeni contribution alınmaz.            |
| `cancelled`          | İptal edildi; varsa tahsilatlar refund sürecine girer.                 |
| `successful`         | Süre doldu ve hedef tutuldu; settlement bekliyor.                      |
| `failed`             | Süre doldu, hedef tutmadı; refund sürecine girer.                      |
| `payout_pending`     | Settlement tamamlandı; Admin payout onayı bekleniyor.                  |
| `paid_out`           | Payout gerçekleşti; terminal durum (başarılı yol).                     |
| `refunding`          | Refund süreci başladı; payment'lar geri ödeniyor.                      |
| `refunded`           | Tüm refund'lar tamamlandı; terminal durum (refund yolu).               |

**Terminal durumlar:** `rejected`, `paid_out`, `refunded`. Bu durumlardan
sonra başka geçiş yapılmaz.

## 2. Geçiş tablosu

| Kaynak               | Hedef                | Aktör           | Ön koşullar                                                                                                          | Yan etkiler                                                                                                | Audit log alanı                       | Bildirim                                  |
| -------------------- | -------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `draft`              | `submitted`          | Creator         | Tüm zorunlu alanlar dolu, en az 1 reward tier (opsiyonel), Creator e-posta doğrulanmış                               | Inceleme kuyruğuna eklenir                                                                                 | actor, timestamp                      | Admin'e yeni inceleme; Creator'a teyit    |
| `submitted`          | `under_review`       | Admin           | Admin kuyruktan aldı                                                                                                 | `reviewer_id` set edilir                                                                                   | actor, reviewer_id                    | Creator'a "inceleniyor"                   |
| `under_review`       | `revision_requested` | Admin           | Admin not yazdı (`revision_note` zorunlu)                                                                            | Creator panelinde düzeltme görünür                                                                         | actor, note                           | Creator'a düzeltme talebi                 |
| `revision_requested` | `submitted`          | Creator         | Düzeltmeler yapıldı                                                                                                  | Yeniden kuyruğa alınır                                                                                     | actor, diff özeti                     | Admin'e yeniden inceleme                  |
| `under_review`       | `approved`           | Admin           | Onay notu opsiyonel                                                                                                  | Başlangıç tarihine göre `scheduled` veya `live`'a otomatik geçiş için zamanlanır                           | actor, note                           | Creator'a onay                            |
| `under_review`       | `rejected`           | Admin           | `rejection_reason` zorunlu                                                                                            | Terminal                                                                                                   | actor, reason                         | Creator'a ret                             |
| `approved`           | `scheduled`          | Sistem          | `starts_at` > now()                                                                                                  | Zamanlayıcı kaydı oluşur                                                                                   | system, scheduled_for                 | Creator'a yayın zamanı bilgisi            |
| `approved`           | `live`               | Sistem          | `starts_at` <= now()                                                                                                 | Listeleme görünürlüğü açılır                                                                               | system                                | Creator'a "yayında"; takipçilere bildirim |
| `scheduled`          | `live`               | Sistem          | `starts_at` <= now()                                                                                                 | Listeleme görünürlüğü açılır                                                                               | system                                | Creator'a "yayında"; takipçilere bildirim |
| `live`               | `successful`         | Sistem          | `ends_at` <= now() **ve** toplam tahsil edilmiş contribution tutarı >= `goal_amount`                                 | Settlement işi tetiklenir                                                                                  | system, totals snapshot               | Creator'a başarı; backer'lara teyit       |
| `live`               | `failed`             | Sistem          | `ends_at` <= now() **ve** toplam tahsil edilmiş tutar < `goal_amount`                                                | Refund süreci başlatılır                                                                                   | system, totals snapshot               | Creator'a başarısız; backer'lara bilgi    |
| `live`               | `suspended`          | Admin           | `suspend_reason` zorunlu                                                                                              | Yeni Contribution **kabul edilmez**; mevcut payment akışları durur                                          | actor, reason                         | Creator'a askı bildirimi                  |
| `suspended`          | `live`               | Admin           | İnceleme tamamlandı; engel kalktı                                                                                    | Listeleme tekrar açılır                                                                                    | actor, note                           | Creator'a tekrar yayın                    |
| `suspended`          | `cancelled`          | Admin           | `cancel_reason` zorunlu                                                                                               | Tahsil edilmiş varsa refund süreci başlatılır                                                              | actor, reason                         | Creator + backer'lara iptal               |
| `successful`         | `payout_pending`     | Sistem          | Settlement hesabı tamamlandı                                                                                          | Payout kaydı `pending` oluşturulur (`Payout` ayrı varlık)                                                  | system, settlement snapshot           | Admin'e payout onay görevi                |
| `payout_pending`     | `paid_out`           | Admin (+sistem) | Payout sağlayıcı işlemi başarılı                                                                                      | Ledger'a `payout_paid` entry; terminal                                                                     | actor, payout_id                      | Creator'a payout bilgisi                  |
| `failed`             | `refunding`          | Sistem          | Refund kuyruğu oluşturuldu                                                                                            | Her captured payment için refund attempt başlatılır                                                        | system                                | Backer'lara refund başladı                |
| `cancelled`          | `refunding`          | Sistem          | Tahsil edilmiş payment var                                                                                            | Aynı                                                                                                       | system                                | Backer'lara refund başladı                |
| `refunding`          | `refunded`           | Sistem          | Tüm refund'lar tamamlandı (başarısız refund'lar Admin görevine düşer)                                                | Terminal                                                                                                   | system, totals                        | Backer'lara refund tamamlandı             |

> Tüm "sistem" geçişleri, bir scheduled job veya event handler tarafından
> server tarafında atomik olarak yapılır. **İstemciden** asla bu geçişler
> tetiklenmez.

## 3. Yasaklar

- Hiçbir geçiş **istemciden** keyfi olarak yapılamaz; sunucu state
  geçişini yalnızca yukarıdaki tabloya göre kabul eder.
- **Keyfi geriye geçiş yoktur** (örn. `live → draft`, `successful →
  live`, `paid_out → herhangi bir şey`, `refunded → herhangi bir şey`).
- **Atlamalı geçiş yoktur** (örn. `submitted → approved` doğrudan; her
  zaman `submitted → under_review → approved`).
- `rejected`, `paid_out`, `refunded` terminaldir; sonrasında işlem yoktur.
- `live` durumunda kritik alanlar (hedef tutar, süre, reward tier
  tutarları/yapısı) **değiştirilemez**. Yalnızca "update post" / duyuru
  içeriği ve sınırlı meta alanlar değiştirilebilir.

## 4. Diyagram

```text
            ┌──────┐
            │draft │◄──────────────┐
            └──┬───┘               │
               │ Creator submit    │ Creator düzelt
               ▼                   │
       ┌────────────┐              │
       │ submitted  │──────────────┤
       └─────┬──────┘              │
             │ Admin pick          │
             ▼                     │
       ┌──────────────┐  reject    │
       │ under_review │──────────► rejected (terminal)
       └─┬─────┬──────┘            ▲
         │     │ revision          │
         │     └──────────────► revision_requested ──┘
         │ approve
         ▼
       ┌──────────┐  starts_at>now   ┌───────────┐  starts_at<=now
       │ approved │─────────────────►│ scheduled │──────────────┐
       └────┬─────┘                  └───────────┘              │
            │ starts_at<=now                                    │
            └──────────────────────────────────────────────────►┤
                                                                ▼
                                                          ┌──────┐
                                                          │ live │──suspend──► suspended ──► cancelled
                                                          └──┬───┘                 │             │
                                                             │ ends_at             └──► live     │
                                                  ┌──────────┴──────────┐                       │
                                                  ▼                     ▼                       │
                                            successful                failed ◄──────────────────┘
                                                  │                     │
                                                  ▼                     ▼
                                            payout_pending          refunding
                                                  │                     │
                                                  ▼                     ▼
                                            paid_out (T)            refunded (T)
```

(T) = terminal.
