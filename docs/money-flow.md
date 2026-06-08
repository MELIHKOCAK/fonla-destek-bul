# Para akışı

> **Kritik kural:** Tüm para tutarları veritabanında **TRY kuruşu
> cinsinden integer** (örn. PostgreSQL `bigint`) olarak saklanır.
> Float **kullanılmaz**. UI'da `Intl.NumberFormat('tr-TR', { style:
> 'currency', currency: 'TRY' })` ile gösterilir.
>
> **Ledger append-only**'dir. Hiçbir entry silinmez veya güncellenmez.
> Düzeltme yalnızca **yeni ters kayıt** ile yapılır.

## 0. Ledger entry tipleri (özet)

| Tip                | Yön             | Açıklama                                            |
| ------------------ | --------------- | --------------------------------------------------- |
| `payment_captured` | credit (kampanyaya) | Bir Payment `captured` oldu                     |
| `refund_issued`    | debit (kampanyadan) | Bir Refund tamamlandı                           |
| `provider_fee`     | debit           | Provider'ın aldığı masraf                           |
| `platform_fee`    | debit           | BeniFonla komisyonu                                  |
| `payout_paid`      | debit           | Creator'a aktarım gerçekleşti                       |
| `chargeback`       | debit           | Sağlayıcı chargeback uyguladı                       |
| `adjustment`       | her ikisi       | Manuel düzeltme — yalnızca yeni ters kayıt formunda |

Her entry: `id`, `created_at`, `type`, `amount_kurus` (bigint),
`direction`, `campaign_id`, `contribution_id?`, `payment_id?`,
`refund_id?`, `payout_id?`, `correlation_id`, `provider_event_id?`.

---

## 1. Başarılı ödeme

```text
[Backer] -> destek başlat -> Contribution.initiated (C)
                            └── Payment attempt #1: created -> pending
                                       │ (provider çağrısı)
                                       ▼
                                 authorized
                                       │ (capture)
                                       ▼
                                  captured  ◄── webhook
                                       │
                                       ▼
                              Contribution.paid
                                       │
                                       ▼
              Ledger: + payment_captured (amount_kurus)
              Ledger: - provider_fee   (provider_fee_kurus)
```

- Tüm yazımlar **tek bir transaction** içinde commit edilir.
- Webhook handler'ı `provider_event_id` ile unique idempotency uygular
  (bkz. §6).

## 2. Reddedilen ödeme ve yeniden deneme

```text
Payment attempt #1: created -> pending -> failed
        (Contribution: payment_pending — DEVAM)

Backer "tekrar dene" -> Payment attempt #2: created -> pending -> authorized -> captured
        (Contribution: payment_pending -> paid)
        Ledger: + payment_captured, - provider_fee
```

- Başarısız attempt için **ledger entry yazılmaz** (para hareketi yok).
- Maks. attempt sayısı (örn. 3) aşılırsa Contribution sistem tarafından
  `failed`'a alınır.

## 3. Başarılı kampanya — settlement & payout

```text
Campaign K1: live -> successful (sistem, süre + hedef koşulu)

Settlement hesabı (kampanya bazında):
  gross_captured   = Σ payment_captured (K1)
  total_refunds    = Σ refund_issued    (K1)
  total_provider   = Σ provider_fee     (K1)
  net_collected    = gross_captured - total_refunds - total_provider
  platform_fee_amt = round(net_collected * platform_fee_rate)
  net_payout       = net_collected - platform_fee_amt

Payout kaydı oluşur: status = payout_pending, amount = net_payout
Ledger: - platform_fee (platform_fee_amt)
(payout henüz yapılmadı; ledger'a payout_paid YAZILMAZ)

Admin -> "payout onayla" -> provider transfer
   webhook: success
   Payout.status -> paid_out
   Campaign.status: payout_pending -> paid_out (terminal)
   Ledger: - payout_paid (net_payout)
```

- Platform fee oranı bir **konfig** değeridir; per-kampanya override
  edilebilir (Admin tarafından, kampanya `approved` öncesinde).
- Payout'tan sonra gelen geç refund / chargeback olayları **yeni ledger
  ters kayıtları** ile işlenir; payout geri alınmaz — fark Admin
  görevine düşer.

## 4. Başarısız kampanya — refund / authorization cancellation

```text
Campaign K2: live -> failed (sistem)

Her contribution için:
  - Payment attempt durumuna göre:
      - authorized (henüz capture edilmemiş) -> CANCEL (ledger entry YOK)
      - captured                              -> REFUND
  - Contribution.paid -> refund_pending
  - Refund webhook'u geldikçe:
      Payment.captured -> refunded (veya partially_refunded -> refunded)
      Contribution.refund_pending -> refunded
      Ledger: - refund_issued (amount_kurus)
      Ledger: - provider_fee (refund için provider'ın aldığı ek masraf, varsa)

Tüm refund'lar tamamlandığında:
  Campaign.refunding -> refunded (terminal)
```

- `cancelled` kampanyada da aynı süreç işler (tahsil edilmişler refund,
  yalnızca authorize edilmişler cancel).
- Başarısız refund'lar (provider hata döner) Admin görev kuyruğuna
  düşer; sistem otomatik kapatmaz.

## 5. Chargeback

```text
[Provider webhook] dispute event -> Payment.captured -> disputed
                                    Contribution.paid -> disputed
                                    (henüz ledger ters entry YOK; süreç beklemede)

[Provider webhook] chargeback event -> Payment.disputed -> chargeback (terminal)
                                       Contribution.disputed -> chargeback (terminal)
                                       Ledger: - chargeback (amount_kurus)
                                       Ledger: - provider_fee (chargeback masrafı, varsa)
                                       Bildirim: Creator + Admin

[Provider webhook] dispute_resolved (lehte) -> disputed -> captured (geri döner)
```

- Eğer chargeback **payout sonrası** geliyorsa, payout geri alınmaz;
  ledger ters entry yazılır ve **bakiye negatife düşebilir**. Bu durum
  Admin operasyonel görevidir; mahsuplaşma sonraki payout'tan düşülerek
  veya manuel olarak yapılır (yeni ters ledger entry ile).

## 6. Duplicate webhook & idempotency

- Her provider event'inin **`provider_event_id`** alanı vardır.
- `webhook_events` tablosunda bu alan **UNIQUE** constraint'lidir.
- Handler:
  1. `BEGIN`
  2. `INSERT INTO webhook_events (provider_event_id, ...)` — duplicate
     ise `ON CONFLICT DO NOTHING` ve **erken dönüş**.
  3. Aksi halde event'i işle (state geçişleri + ledger).
  4. `COMMIT`
- Aynı event ikinci kez geldiğinde işlenmez; yanıt yine 2xx döner
  (provider retry yapmasın).
- Webhook handler'ları **idempotent** olmak zorundadır.

## 7. Platform Fee vs Provider Fee ayrımı

| Özellik           | Platform Fee              | Provider Fee                         |
| ----------------- | ------------------------- | ------------------------------------ |
| Kime gider        | BeniFonla                 | Ödeme sağlayıcısı                    |
| Ne zaman düşülür  | Settlement aşamasında     | Her Payment / Refund event'inde      |
| Ledger entry tipi | `platform_fee`            | `provider_fee`                       |
| Hesaplama         | net_collected × oran      | Provider event'inden okunur          |
| Override          | Per-kampanya mümkün       | Hayır (provider belirler)            |

İki fee **asla aynı entry'de toplanmaz**; ayrı entry'ler olarak
yazılır. Admin raporları her ikisini ayrı kalemde gösterir.

---

## Genel kurallar özeti

- Para → **kuruş integer**, asla float.
- Ledger → **append-only**, düzeltme = yeni ters kayıt.
- Webhook → **idempotent**, `provider_event_id` unique.
- Refund vs Cancel → captured sonrası refund, authorized öncesi cancel.
- Payout sonrası chargeback → payout geri alınmaz, Admin görevi açılır.
- Tüm state geçişleri + ledger yazımları **aynı transaction** içinde.
- İstemciden hiçbir tutar veya status keyfi değiştirilmez.
