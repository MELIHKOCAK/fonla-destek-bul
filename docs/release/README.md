# Release Documentation

Bu klasör BeniFonla'nın staging → production geçişini ve sonraki
release'leri yönetir.

| Belge | İçerik |
| --- | --- |
| [environment-topology.md](./environment-topology.md) | local / staging / production ayrımı + env envanteri |
| [migration-release-flow.md](./migration-release-flow.md) | 9 adımlı migration yaşam döngüsü + expand-migrate-contract |
| [git-release-process.md](./git-release-process.md) | Branch akışı, CI check'leri, release artefaktları |
| [production-checklist.md](./production-checklist.md) | Production hazırlık tam listesi |
| [observability.md](./observability.md) | Log, alert, korelasyon kuralları |
| [smoke-tests.md](./smoke-tests.md) | Production güvenli smoke prosedürü |
| [controlled-launch.md](./controlled-launch.md) | 10 adımlı kontrollü canlı çıkış |
| [production-runbook.md](./production-runbook.md) | Deploy / rollback / runbook |
| [post-launch.md](./post-launch.md) | İlk 24/72 saat + haftalık operasyon |

## Kabul kriterleri özeti

- Staging ve production veri/secrets ayrı; aynı Supabase projesi
  paylaşılmıyor.
- Migration staging'den geçmeden production'a uygulanmıyor.
- Stripe live secret/restricted key client bundle'da yok; CI guard aktif.
- `production_payments_enabled` ve `production_creator_transfers_enabled`
  ayrı server-side gate; manuel onayla yönetiliyor.
- Stripe Transfer ile connected-account Payout veri modelinde ayrı.
- Backup/PITR, monitoring, alert routing, rollback runbook mevcut.
- Test/sandbox key, data ve connected account production'a sızmıyor
  (smoke test #15).
- Controlled real payment + (gerekirse) Refund/Transfer Reversal + creator
  Transfer sonrası ledger ↔ Stripe ↔ reconciliation eşleşmesi doğrulanmış.
