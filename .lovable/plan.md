# Faz 12 — Stripe Sandbox Ödeme Entegrasyonu

Sadece Stripe **test mode / sandbox** uygulanır. Live mode, Transfer ve Payout kod tarafından açılmaz; Faz 11.5'te eklenen `payment_provider_configs.live_payments_enabled=false` ve `production_approval_status='not_verified'` guard'ları korunur. Stripe + crowdfunding uygunluk yazılı onayı, KYC, vergi/hukuki doğrulamalar bu faz dışıdır.

## Kapsam (yapılacak)

1. **Stripe SDK + adapter**
   - `bun add stripe` (server-side; frontend'e Stripe.js veya publishable key eklenmeyecek).
   - `src/lib/payments/provider/stripe-sandbox-adapter.ts` placeholder'ı gerçek implementasyona dönüştürülür: `createCheckoutSession`, `getPaymentStatus`, `expireCheckoutSession`, `createRefund`, `createCreatorTransfer`, `reverseCreatorTransfer`, `createConnectedAccount`, `createAccountOnboardingLink`, `getConnectedAccountStatus`.
   - `STRIPE_API_VERSION` env ile pinlenir; secret yalnız `process.env.STRIPE_SECRET_KEY` üzerinden okunur, asla VITE_ değişkenine konmaz.
   - `getProvider` factory'sinde test env için artık Stripe sandbox adapter döner; live yine `PAYMENT_PROVIDER_DISABLED` fırlatır.
   - Stripe status → domain status için ayrı `stripe-status-mapper.ts`; bilinmeyen status sessizce `paid/failed`'e map edilmez, `unknown` olarak loglanır.

2. **Secrets** (kullanıcıya add_secret ile sorulacak, koda yazılmayacak)
   - `STRIPE_SECRET_KEY` (test key, `sk_test_...`)
   - `STRIPE_WEBHOOK_SECRET` (Checkout/PaymentIntent endpoint)
   - `STRIPE_CONNECT_WEBHOOK_SECRET` (ayrı Connect endpoint için, opsiyonel)
   - `STRIPE_API_VERSION`
   - `APP_PUBLIC_URL`
   - `.env.example` sadece isimleri ve açıklamayı içerir.

3. **Server functions / API routes** (TanStack Start — Lovable Cloud edge function değil)
   - `src/lib/payments/checkout.functions.ts` → `createCheckoutSession` server fn (`requireSupabaseAuth`):
     - Contribution ownership, contribution status, campaign live + within window, creator account + readiness, currency=TRY, reward reservation kontrolleri (DB'den yeniden hesap).
     - Local idempotency key + aktif Checkout Session duplicate guard.
     - `payment_transactions` satırını `created` ile açar, sonra Stripe API'ye **ayrı bir Stripe-Idempotency-Key** ile çağrı atar.
     - Metadata: yalnız opaque ID'ler (contribution_id, payment_transaction_id, campaign_id, environment). PII yok.
     - `payment_intent_data.transfer_group = deterministic_campaign_group(campaign_id)` DB'de saklanır.
     - `success_url` Stripe `{CHECKOUT_SESSION_ID}` placeholder'ı içerir (sadece lookup).
     - Dönen `id`, `url`, `payment_intent`, `expires_at`, `livemode` ayrı kolonlara yazılır.
   - `src/lib/payments/refund.functions.ts` → `requestRefund`: server-side amount hesabı, refundable bakiye kontrolü, yerel + Stripe idempotency, ilk response sonrası `pending`, final state webhook'tan gelir.
   - `src/lib/payments/transfer.functions.ts` → `createCreatorTransfer` (test mode + feature flag): settlement net amount + transfer_group + destination DB'den; production guard.
   - `src/lib/payments/settlement.functions.ts` → `calculateCampaignSettlement` (dry-run).
   - `src/lib/payments/reconciliation.server.ts` → trusted reconciliation servisi (cron-only, user'dan çağrılamaz).

4. **Public webhook route** — `src/routes/api/public/hooks/stripe-webhook.ts`
   - Raw body okunur (Request.text()).
   - `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` ile signature + timestamp tolerance.
   - `webhook_events` tablosuna `provider_event_id` unique ile atomik claim; duplicate event no-op.
   - `event.livemode` ↔ local environment guard.
   - İşlenen olaylar: `checkout.session.completed` (sadece `payment_status='paid'` veya bağlı PI succeeded olduğunda fulfill), `checkout.session.async_payment_succeeded/failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.*`. Transfer event'leri yalnız Connect endpoint açıksa.
   - Amount/currency/metadata mismatch → `paid` yapma, security alert + reconciliation kaydı.
   - Aynı business event'in birden çok Stripe event'iyle fulfillment'ı tekrar tetiklememesi için `payment_transactions.domain_status` transition'ı idempotent state machine üzerinden.
   - `checkout.session.expired` → payment attempt `expired`, reservation idempotent release; paid kaydı dokunulmaz.
   - Connect için ayrı route: `src/routes/api/public/hooks/stripe-connect-webhook.ts`.

5. **Reconciliation**
   - Pending > N dakika `payment_transactions` için Stripe API'den Session+PI okur; aynı domain transition servisini kullanır.
   - 429/5xx exponential backoff, 4xx retry yok.
   - Mismatch raporu (silent failed/paid yok).
   - pg_cron veya `/api/public/hooks/run-payment-reconciliation` (cron secret korumalı) ile tetiklenir.

6. **Frontend (back flow)**
   - `back/index` adımı: `getCampaignPaymentReadiness` + `createCheckoutSession` server fn → kullanıcı `session.url`'e `window.location.assign` ile yönlendirilir.
   - `back/result` route'u: URL'deki `?success`/`?canceled`/`{CHECKOUT_SESSION_ID}` ödeme kanıtı olarak kullanılmaz; yalnız reference. TanStack Query ile backend status poll (exponential backoff, max 60s). Status set: `processing | paid | failed | cancelled | expired | action_required`.
   - Cancel URL'ye dönüş otomatik `failed` yapmaz — pending kalır, webhook karar verir.
   - Stripe.js veya publishable key eklenmez.

7. **Veritabanı (migration — küçük, sadece ek alanlar)**
   - `payment_transactions`: `stripe_idempotency_key text`, `transfer_group text`, `livemode boolean` (eksikse). Faz 11.5'teki provider_* kolonları zaten var; rename yok.
   - `webhook_events`: işlem sonucu (`processed_at`, `processing_error`) yoksa eklenir; `provider_event_id` unique zaten var.
   - `creator_transfers` / `creator_transfer_reversals`: live guard'ı koruyan trigger (env=live için `live_payments_enabled` ve verified zorunlu).
   - `simulate_test_payment` RPC kapatılmaz ama production env'de zaten trigger ile reddediliyor.
   - Migration forward-only, drop/rename yok.

8. **Testler** (Vitest, Stripe SDK mock)
   - `tests/payments/stripe-status-mapper.test.ts` — bilinmeyen status `unknown`'a düşer.
   - `tests/payments/checkout.test.ts` — idempotency, duplicate session guard, amount server-side, metadata PII yok, transfer_group persist.
   - `tests/payments/webhook.test.ts` — signature fail, replay outside tolerance, raw body değişikliği, duplicate event, amount mismatch, livemode mismatch, async succeeded/failed, expired, completed-without-paid.
   - `tests/payments/refund.test.ts` — refundable cap, duplicate, partial, Transfer Reversal ayrı işlem.
   - `tests/payments/reservation.test.ts` — paid → confirm, failed/expired → release (idempotent).
   - `tests/payments/reconciliation.test.ts` — pending sync, mismatch raporu, Stripe 429 backoff.
   - Test kartı numarası kaynak koda yazılmaz; sadece `docs/finance/stripe-testing.md` Stripe resmi test docs'a link verir.

9. **Dokümantasyon**
   - `docs/finance/stripe-integration-contract.md` Faz 12 davranışıyla güncellenir.
   - `docs/finance/stripe-testing.md` — test matrisi (yukarıdaki 39 senaryo), her biri otomatik test / Stripe CLI / manuel olarak işaretli.
   - `docs/finance/stripe-runbook.md` — webhook secret rotasyonu, reconciliation tetikleme, live mode'a geçiş prosedürü (admin manuel).

## Kapsam dışı (Faz 13+)

- Stripe live mode aktivasyonu.
- Production Transfer/Payout otomasyonu.
- Gerçek dispute/chargeback iş akışı (event log'lanır, manuel ele alınır).
- PII (shipping) için pgcrypto.
- Stripe.js Elements (hosted checkout yeterli).
- Eski `payouts` tablosunun drop'u.

## Teknik notlar

- TanStack Start `createServerFn` app-internal logic için; webhook ve cron `/api/public/*` server route ile raw `Response` döner.
- `attachSupabaseAuth` global functionMiddleware'in `src/start.ts`'de kurulu olduğu doğrulanır.
- Frontend bundle'a `stripe` paketi sızmaması için yalnız `*.functions.ts`/`*.server.ts` içinde import.
- Logger: authorization header, secret, raw payload, kart bilgisi, e-posta loglanmaz; sadece event id + type + outcome.

## Doğrulama (kapanış)

- `bun run build`, lint, type-check.
- Vitest payments paketi.
- `stack_modern--invoke-server-function` ile `/api/public/hooks/stripe-webhook` invalid signature → 400.
- Manuel: Stripe CLI `stripe listen` + `stripe trigger checkout.session.completed` happy path.

## Manuel yapılması gerekenler (kullanıcı)

1. Stripe Dashboard test mode → Webhook endpoint oluştur (Connect için ayrı), secret'ları add_secret ile gir.
2. Stripe Connect test mode'da bir Express account oluştur (creator onboarding test akışı için).
3. Live mode'a geçiş: hukuki/uygunluk onayı + DB'de `live_payments_enabled=true` + `production_approval_status='verified'` UPDATE — yalnız admin.

## Açık riskler

- Connect "separate charges and transfers" + crowdfunding uygunluğu Stripe Türkiye için yazılı onay gerektirir; alınana kadar live blok.
- Async payment method (örn. iDEAL, BLIK) MVP'de kapalı; ileride açılırsa `async_payment_*` olayları gerçek kullanıma girer.
- Transfer Reversal başarısızlık senaryosu operasyonel alert gerektirir — bu fazda alert sadece log + admin tablo kaydı.
