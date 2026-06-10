# Observability

## Korelasyon

- Her HTTP istek **`x-request-id`** ile etiketlenir; yoksa server fn /
  server route üretir.
- Her Stripe webhook **`event.id`** ile birlikte `request_id` log'a yazılır.
- Notification outbox satırı, üretildiği `request_id`'yi taşır.

## Edge Function / server fn log'ları

- Structured JSON: `{ ts, level, msg, request_id, user_id?, event_id?,
  outcome }`.
- **PII / secret yasak**: e-mail tam adresi yerine hash veya `local***`;
  Stripe secret / webhook secret asla.
- ERROR seviyesi error tracker'a forward.

## Stripe alert'leri

| Olay | Alert | Eşik |
| --- | --- | --- |
| `payment_intent.payment_failed` artış | payments kanalı | 5 dk içinde %5 sapma |
| Refund failure | payments kanalı | her olay |
| Creator Transfer failure | payments + ops | her olay |
| Transfer Reversal failure | payments + ops | her olay |
| Provider Payout failure (Stripe → bank) | ops | her olay |
| Webhook backlog | infra | >100 undelivered / 5 dk |

## İş alert'leri

- Finalization job hata oranı > 0 → ops.
- Reconciliation mismatch (ledger vs Stripe balance) → finance + ops, **günlük**.

## Frontend

- Error tracking (örn. Sentry) source map'leri privately yüklenir; public
  bundle'da source map değil sadece `sourceMappingURL` referansı (private host).
- PII scrubbing açık.

## Uptime / health

- `/api/public/health` lightweight endpoint (DB ping yok; sadece runtime).
- Production uptime check 1 dk; staging 5 dk.
