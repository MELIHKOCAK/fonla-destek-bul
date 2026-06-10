# Post-Launch Operational Checklist

## İlk 24 saat
- [ ] 5xx oranı, p95 latency, webhook backlog, finalization job hatası →
      her 1 saatte bir gözden geçir.
- [ ] Başarısız Stripe `payment_intent.payment_failed`, `charge.refund.failed`,
      `transfer.failed`, `transfer_reversal.*`, `payout.failed` event listesi
      → 0 olmayan her satır incelenir.
- [ ] Stripe reconciliation (Dashboard balance ↔ local ledger) eşleşmesi.
- [ ] Auth abuse (başarısız login burst, signup spike) izlenir.
- [ ] Kullanıcı destek ticket'larında ödeme/iade/yetki sorunları işaretlenir.

## İlk 72 saat
- [ ] DB performans: yavaş sorgular (`supabase--slow_queries`), index
      eksiklikleri.
- [ ] Webhook idempotency çakışmaları: 0 olmalı.
- [ ] Reconciliation mismatch sıfır; aksi halde finance + ops eskalasyon.
- [ ] Hukuk/şikayet kanalı eskalasyonları gözden geçirilir
      (`docs/operations/complaint-appeal.md`).

## Sürekli (haftalık)
- [ ] Reconciliation daily özet → finance.
- [ ] Backup restore test (kuartal bazında en az 1 kez gerçek restore).
- [ ] Secret rotation takvimi (Stripe restricted key 90 gün, webhook secret
      180 gün, `LOVABLE_API_KEY` 180 gün).
- [ ] Güvenlik tarama (Basic + Deep) ve advisor sıfırlama.
