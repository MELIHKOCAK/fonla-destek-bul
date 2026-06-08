# Contribution & Payment state machine

> **Kritik mimari kural:** `Contribution` ve `Payment` **ayrı varlıklar**,
> **ayrı tablolar**, **ayrı state machine'lerdir**. Tek bir `status`
> alanı ile temsil edilemezler. İlişki **1 Contribution → N Payment
> attempt** şeklindedir.

## 1. Neden ayrı?

Bir kullanıcı kampanyaya destek vermeye karar verdiği an iş seviyesinde
bir **Contribution** doğar. Bu taahhüt; ödeme sağlayıcısında bir veya
birden fazla **Payment attempt** ile gerçeklenebilir:

- İlk attempt 3-D Secure'da iptal edilirse `failed` olur, ama
  Contribution **henüz başarısız değildir** — kullanıcı tekrar
  deneyebilir.
- İkinci attempt `captured` olursa Contribution `paid` olur.

Bu modeli tek tabloya sıkıştırmak; yeniden deneme, kısmi refund,
chargeback ve dispute akışlarını **temsil edilemez** hale getirir ve
finansal denetimi bozar.

---

## 2. Contribution state machine

### Durumlar

| Durum             | Anlam                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `initiated`       | Backer destek akışını başlattı; henüz payment denemesi yok.                      |
| `payment_pending` | En az bir Payment attempt aktif (`pending`/`authorized`).                        |
| `paid`            | Bir Payment attempt `captured` oldu; destek başarılı.                            |
| `failed`          | Tüm denemeler başarısız ve Backer veya sistem akışı sonlandırdı.                 |
| `cancelled`       | Tahsilat öncesi Backer veya sistem iptal etti.                                   |
| `refund_pending`  | `paid` iken refund süreci başladı (kampanya `failed`/`cancelled` vb.).           |
| `refunded`        | Refund(lar) tamamlandı.                                                          |
| `disputed`        | Backer / sağlayıcı tarafından itiraz açıldı.                                     |
| `chargeback`      | Sağlayıcı chargeback uyguladı; ters ledger entry yazılır.                        |

**Terminal durumlar:** `failed`, `cancelled`, `refunded`, `chargeback`.

### Geçişler

| Kaynak            | Hedef             | Tetikleyen        | Koşul / Yan etki                                                              |
| ----------------- | ----------------- | ----------------- | ----------------------------------------------------------------------------- |
| `initiated`       | `payment_pending` | Sistem            | İlk Payment attempt `created → pending` oldu                                  |
| `initiated`       | `cancelled`       | Backer / sistem   | Hiç attempt yapılmadan vazgeçildi veya zaman aşımı                            |
| `payment_pending` | `paid`            | Sistem (webhook)  | Bir attempt `captured` oldu; ledger `payment_captured` append                 |
| `payment_pending` | `payment_pending` | Sistem            | Önceki attempt `failed`; yeni attempt başlatıldı (durum aynı)                 |
| `payment_pending` | `failed`          | Backer / sistem   | Backer vazgeçti **veya** max attempt aşıldı                                   |
| `paid`            | `refund_pending`  | Sistem            | Kampanya `failed`/`cancelled` veya Admin onaylı refund başlatıldı             |
| `refund_pending`  | `refunded`        | Sistem (webhook)  | Refund `refunded` (veya tüm kısmi refund'lar) tamamlandı; ledger ters entry   |
| `paid`            | `disputed`        | Sistem (webhook)  | Sağlayıcı dispute event'i geldi                                               |
| `disputed`        | `chargeback`      | Sistem (webhook)  | Sağlayıcı chargeback event'i geldi; ledger `chargeback` ters entry            |
| `disputed`        | `paid`            | Sistem (webhook)  | Dispute reddedildi; tutar geri yerine kondu                                   |

### Yasaklar

- `paid` durumundan doğrudan `cancelled` veya `failed`'a geçilmez.
- `refunded` veya `chargeback` terminaldir; geri dönülmez.
- Contribution durumu **istemciden** keyfi olarak değiştirilemez. Backer
  yalnızca tahsilat öncesi (`initiated`/`payment_pending` ön koşullarında)
  iptal isteyebilir; gerçekleştirme sunucu tarafında yapılır.

---

## 3. Payment attempt state machine

> Ayrı tabloda saklanır: `payment_attempts` (örnek ad). Her satırın
> `contribution_id` referansı vardır.

### Durumlar

| Durum                | Anlam                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `created`            | Provider'a istek hazırlandı, henüz gönderilmedi veya idempotency oluştu |
| `pending`            | Provider'a gönderildi, yanıt bekleniyor                                |
| `authorized`         | Pre-auth alındı, henüz capture edilmedi                                |
| `captured`           | Tahsilat kesinleşti (= `paid`)                                         |
| `failed`             | Provider reddetti veya teknik hata                                     |
| `cancelled`          | `authorized` iken capture öncesi iptal                                 |
| `refunded`           | Capture sonrası **tamamı** geri ödendi                                 |
| `partially_refunded` | Capture sonrası **bir kısmı** geri ödendi (refund destekleniyorsa)     |
| `disputed`           | Sağlayıcı dispute event'i geldi                                        |
| `chargeback`         | Sağlayıcı chargeback uyguladı                                          |

**Terminal durumlar:** `failed`, `cancelled`, `refunded`, `chargeback`.
`partially_refunded` terminal **değildir**; ek refund ile `refunded`'a
geçebilir.

### Geçişler

| Kaynak       | Hedef                | Tetikleyen        | Yan etki                                              |
| ------------ | -------------------- | ----------------- | ----------------------------------------------------- |
| `created`    | `pending`            | Sistem            | Provider API çağrıldı                                 |
| `pending`    | `authorized`         | Webhook           | Pre-auth onaylandı                                    |
| `pending`    | `captured`           | Webhook           | Direkt capture senaryosu                              |
| `pending`    | `failed`             | Webhook / timeout | Hata kodu kaydedilir                                  |
| `authorized` | `captured`           | Sistem / webhook  | Capture isteği başarılı; ledger `payment_captured`    |
| `authorized` | `cancelled`          | Sistem / webhook  | Pre-auth iptal; ledger entry **yok** (para hareketsiz) |
| `authorized` | `failed`             | Webhook / timeout | Capture başarısız                                     |
| `captured`   | `refunded`           | Webhook           | Tam refund; ledger `refund_issued`                    |
| `captured`   | `partially_refunded` | Webhook           | Kısmi refund; ledger `refund_issued` (kısmi tutar)    |
| `partially_refunded` | `refunded`   | Webhook           | Kalan tutar da refund edildi                          |
| `captured`   | `disputed`           | Webhook           | Dispute açıldı                                        |
| `disputed`   | `chargeback`         | Webhook           | Chargeback; ledger ters entry                         |
| `disputed`   | `captured`           | Webhook           | Dispute kullanıcı aleyhine reddedildi                 |

### Yasaklar

- `failed`, `cancelled`, `refunded`, `chargeback` terminal; geri
  dönülmez.
- `captured` olmadan `refunded` olmaz (önce capture, sonra refund).
- `authorized` olmadan `cancelled` olmaz (`created`/`pending` durumunda
  `failed` kullanılır).

---

## 4. Birden fazla attempt örneği

```text
Contribution C1 (kampanya K1, backer U1, tutar 500.00 TRY = 50000 kuruş)

  ├── payment_attempts row #1: created → pending → failed
  │     (provider: "insufficient_funds")
  │     [Contribution C1.status: payment_pending → payment_pending]
  │
  └── payment_attempts row #2: created → pending → authorized → captured
        [Contribution C1.status: payment_pending → paid]
        [Ledger: + payment_captured 50000 kuruş]
        [Ledger: - provider_fee 1250 kuruş (örnek)]
```

İki attempt **aynı** Contribution'a bağlıdır. Contribution'ın `paid`
olması ikinci attempt'in başarısıyla gerçekleşir.

---

## 5. İdempotency

- Her attempt için **kendi `idempotency_key`** kullanılır (Contribution
  id + attempt sırası + nonce). Provider tarafına aynı anahtar iki kez
  gönderilirse provider aynı sonucu döner.
- Provider webhook'ları **`provider_event_id`** üzerinden **unique
  constraint** ile yakalanır; duplicate event'ler ikinci kez işlenmez
  (bkz. `money-flow.md` §6).

---

## 6. Diyagramlar

### Contribution

```text
   initiated
      │ first attempt
      ▼
 payment_pending ──► failed (T)
      │
      │ webhook captured
      ▼
    paid ──► disputed ──► chargeback (T)
      │         │
      │         └─► paid (dispute reddedildi)
      │
      │ campaign failed/cancelled or admin refund
      ▼
 refund_pending ──► refunded (T)
```

### Payment attempt

```text
 created ─► pending ─► authorized ─► captured ─► partially_refunded ─► refunded (T)
                │           │             │              │
                │           │             │              └─► disputed ─► chargeback (T)
                │           │             │                          └─► captured
                │           │             └─► refunded (T)
                │           └─► cancelled (T)
                └─► failed (T)
```

(T) = terminal.
