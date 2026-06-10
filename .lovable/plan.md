# Faz 12 — Stripe Sandbox Ödeme Entegrasyonu

Faz 11.5'te hazırlanan veri modeli ve adapter iskeletinin üstüne **sadece Stripe test mode / sandbox** entegrasyonu eklenir. Production payment, Transfer ve Payout default kapalıdır; live secret yoktur. Live mode için Faz 12+ ve hukuki onay gerekir.

## Kapsam dışı
- Live Stripe API çağrısı, live secret kullanımı
- Stripe.js / publishable key (Hosted Checkout redirect kullanıyoruz)
- Connected account banka Payout statusu
- Production Transfer akışı (sadece test mode'da denenebilir, prod flag kapalı)

## Mimari

```
Browser ──► createServerFn (auth, ownership, readiness)
              │
              ▼
        Supabase Edge Function (Stripe secret kullanır)
              │
              ├─ create-payment-session
              ├─ payment-webhook (raw body, signature)
              ├─ request-refund
              ├─ create-transfer (test mode, prod flag kapalı)
              ├─ calculate-campaign-settlement (dry-run)
              └─ reconcile-pending-payments (scheduled)
              │
              ▼
         Stripe Test/Sandbox API
```

Edge Functions Stripe secret tutar; frontend doğrudan Stripe'a çağrı yapmaz. Stripe-specific kod tamamen `stripe-sandbox-adapter` arkasında izole. PaymentIntent/Checkout Session string'leri domain status'a explicit mapper ile bağlanır.

## 1) Secrets (manuel kullanıcı adımı)

`secrets--add_secret` ile istenir (chat'e değer yazılmaz):
- `STRIPE_SECRET_KEY_TEST` — sk_test_...
- `STRIPE_WEBHOOK_SECRET_TEST` — Stripe Dashboard endpoint secret
- `STRIPE_CONNECT_WEBHOOK_SECRET_TEST` — ayrı Connect endpoint için (varsa)
- `APP_PUBLIC_URL` — success/cancel URL base

`.env.example` sadece anahtar adlarını ve açıklamayı içerir. Live secret eklenmez.

## 2) Edge Functions (`supabase/functions/`)

Her function: CORS sadece app origin'i, structured logging (header/secret/PII yok), Sentry-safe error mapping, Zod input validation.

### a) `create-payment-session/index.ts`
- JWT doğrular (Authorization header)
- `contributions` row ownership + status `created|pending|action_required`
- `campaigns.live` + bitmemiş + `get_campaign_payment_readiness` true
- `reward_tiers` doğrulama; `reserve_reward` RPC (Faz 11.5)
- Amount/currency DB'den; currency MVP `TRY` zorunlu
- Local idempotency: `idempotency_keys` tablosuna unique insert; duplicate aktif session varsa onu döndür
- `payment_transactions` row insert (`provider='stripe'`, `environment='test'`, `domain_status='created'`, `provider_status='checkout_session.created'`)
- Stripe API: `Stripe.checkout.sessions.create({...}, { idempotencyKey })`
  - `mode: 'payment'`, `payment_intent_data.transfer_group = tg_<campaignId>_<settlementWindowId>`
  - `metadata`: `{ contribution_id, payment_transaction_id, campaign_id, environment }` — PII yok
  - `success_url: ${APP}/campaigns/${slug}/back/result?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: ${APP}/campaigns/${slug}/back/result?cancelled=1`
  - `expires_at` açık set edilir (örn. 30 dk)
- Response fields persist: `provider_checkout_session_id`, `provider_payment_intent_id` (varsa), `provider_status`, `livemode`, session `expires_at`, transfer_group DB'ye yazılır
- Frontend'e sadece `{ url, providerSessionId, expiresAt }` döner

### b) `payment-webhook/index.ts`
- **Raw body okur** (Deno `req.text()` — JSON parse etmeden)
- `stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET_TEST, tolerance)` — Stripe SDK signature verification
- `webhook_events` tablosuna `provider_event_id` unique insert ile **atomic claim**; duplicate sessizce 200 döner
- `event.livemode === false` zorunlu (test/live karışmaz)
- Connect event ise `event.account` context korunur, ayrı secret ile doğrulanır
- Event router → idempotent handler:
  - `checkout.session.completed` → session payment_status + PI status kontrol, async ise `pending`
  - `checkout.session.async_payment_succeeded` → `paid` (amount/currency/metadata DB ile karşılaştırılır, `confirm_reward_reservation`, ledger entry)
  - `checkout.session.async_payment_failed` → `failed`, reservation release
  - `checkout.session.expired` → `expired`, reservation release, paid'i geri çevirmez
  - `payment_intent.succeeded` → idempotent paid transition (duplicate fulfillment yok)
  - `payment_intent.payment_failed` / `canceled` → mapped state
  - `charge.refunded` → refund kaydını günceller
  - dispute event'leri → `payment_transactions.dispute_status` alanı
  - `transfer.*`, `transfer.reversed` → `creator_transfers` güncellenir
- Amount/currency mismatch → `paid` yapma; `audit_logs` alert, manuel reconciliation
- Unknown event tipleri kontrollü loglanır (payload kalıcı saklanmaz)

### c) `request-refund/index.ts`
- JWT + ownership/admin + payment `paid`/`partially_refunded`
- Server-side amount; sum(refunds) ≤ captured
- Local idempotency + Stripe `idempotencyKey`
- `stripe.refunds.create({ payment_intent, amount })`; response → `refunds` row `pending`
- Final state `charge.refunded` webhook'undan gelir
- İlgili `creator_transfers` varsa **ayrı işlem** olarak Transfer Reversal hesaplama (otomatik yapılmaz; bayrak konur, `create-transfer-reversal` ayrı çağrı ile)

### d) `create-transfer/index.ts`
- Production feature flag (`payment_provider_configs.transfers_enabled`) zorunlu; default false
- Settlement net amount server-side yeniden hesap
- `destination` = `creator_payment_accounts.provider_account_id` (doğrulanmış)
- Aynı `transfer_group`; `idempotencyKey` ile duplicate engellenir
- Result `creator_transfers` tablosuna provider_transfer_id ile yazılır
- **Stripe Transfer ≠ Stripe Payout** — payout asla bu function'da modellenmez

### e) `calculate-campaign-settlement/index.ts`
- Faz 12'de dry-run; net/fee/refund breakdown döner, DB'ye `campaign_settlements` preview yazar

### f) `reconcile-pending-payments/index.ts`
- pg_cron tarafından stable URL ile çağrılır
- N dakikadan uzun `pending|processing` `payment_transactions` row'ları için sadece provider_reference üzerinden `stripe.checkout.sessions.retrieve` + PaymentIntent retrieve
- Aynı webhook state transition servisini reuse eder (yeni state machine yok)
- Rate limit + exponential backoff; 4xx retry yok, 429/5xx kontrollü retry
- Mismatch → `audit_logs` report, payment'ı sessizce failed yapmaz

`supabase/config.toml`: `payment-webhook` için `verify_jwt = false`. Diğerleri default.

## 3) Adapter ve domain mapping (`src/lib/payments/provider/`)

- `stripe-sandbox-adapter.ts` gerçek implementasyon: `createCheckoutSession`, `fetchCheckoutSession`, `fetchPaymentIntent`, `verifyStripeEventSignature`, `parseStripeWebhookEvent`, `createRefund`, `createTransfer`, `reverseTransfer`
- `stripe-status-mapper.ts` — yeni dosya:
  - `mapCheckoutSessionStatus(session)`, `mapPaymentIntentStatus(pi)`, `mapRefundStatus(r)`, `mapTransferStatus(t)`
  - Unknown status → `processing` + alert (sessizce paid/failed yok)
- `index.ts` factory: `provider='stripe'` + `environment='test'` → sandbox; live → throw (kapalı)
- Adapter tip ayrımı korunur: `provider_checkout_session_id`, `provider_payment_intent_id`, `provider_charge_id`, `provider_refund_id`, `provider_transfer_id`, `provider_transfer_reversal_id`

## 4) Server functions (frontend ↔ edge function köprüsü)

`src/lib/payments/payments.functions.ts` genişletilir:
- `createStripeCheckoutSession` — Edge function `create-payment-session` çağırır, sonucu döner
- `getPaymentStatus(paymentTransactionId)` — DB poll için
- `requestRefund`, `requestTransfer` (admin), `requestSettlementPreview`

Hepsi `requireSupabaseAuth` middleware. `attachSupabaseAuth` zaten `src/start.ts`'te.

## 5) Frontend değişiklikleri

- `src/routes/campaigns.$slug.back.review.tsx`: onay → `createStripeCheckoutSession` → `window.location.href = url` (Stripe Hosted Checkout)
- `src/routes/campaigns.$slug.back.result.tsx`:
  - Query param `success`/`cancelled`/`session_id` **sadece lookup** için
  - TanStack Query ile `getPaymentStatus` poll (interval backoff: 2s→5s→10s, max 2 dk)
  - Status'a göre Türkçe UI: "İşleniyor", "Başarılı", "Başarısız", "İptal edildi", "Süresi doldu"
  - Cancel = otomatik failed değil; "ödemeniz hâlâ tamamlanabilir" mesajı
- `ContributionStatusBadge` Stripe state'lerini gösterir
- `TestEnvironmentBadge` her Stripe sayfasında görünür (sandbox bilgilendirme)

## 6) DB migration

Sadece eksik kolonlar:
- `payment_transactions`: `dispute_status text`, `last_provider_sync_at timestamptz`, `reconciliation_status text` (nullable)
- `creator_transfers`: `transfer_group text`, `source_charge_id text`
- `creator_transfer_reversals`: `refund_id uuid references refunds(id)`
- `payment_provider_configs`: `transfers_enabled boolean default false`, `reconciliation_enabled boolean default true`

Partial unique index: `payment_transactions(provider_checkout_session_id) where provider='stripe'`.

pg_cron job: `reconcile-pending-payments` her 10 dk (insert tool ile, migration değil).

## 7) Test paketi (`src/lib/payments/__tests__/`)

Vitest + node mocks (Stripe SDK mock; gerçek API çağrısı yok):
- `stripe-status-mapper.test.ts` — tüm Checkout/PI/Refund/Transfer status'ları + unknown
- `webhook-signature.test.ts` — geçerli, invalid, replay-outside-tolerance, malformed body, yanlış secret
- `webhook-idempotency.test.ts` — aynı event 2 kez; aynı paymentin checkout.session.completed + payment_intent.succeeded'i; out-of-order
- `webhook-amount-mismatch.test.ts` — paid yapmaz, alert yazar
- `create-session-idempotency.test.ts` — duplicate request aynı session döner
- `refund.test.ts` — full, partial, over-refund block, duplicate, transfer reversal ayrı işlem
- `transfer.test.ts` — duplicate engelleme, prod flag kapalı throw
- `reconciliation.test.ts` — pending → paid sync, session expired → reservation release, mismatch report, Stripe 404'te failed yapmaz
- `result-route.test.tsx` — `?success=true` payment'ı paid yapmaz, sadece backend status

Test matrisindeki 39 senaryo bu dosyalara dağıtılır. Stripe test kart numaraları kaynak kodda yok; sadece `docs/finance/stripe-test-guide.md` Stripe resmi dokümanına link verir.

## 8) Dokümantasyon

- `docs/finance/stripe-test-guide.md` — secret kurulumu, webhook endpoint URL'leri, Stripe Dashboard / Stripe CLI talimatları, test matrisi
- `docs/finance/stripe-go-live-checklist.md` — live öncesi hukuki/operasyonel kontrol listesi (KYC, vergi, crowdfunding uygunluk, country support)

## 9) Manuel kullanıcı adımları

1. Stripe test hesabı; sandbox secret'ları `secrets--add_secret` ile gir
2. Stripe Dashboard → Webhooks → `https://<project>.lovable.app/functions/v1/payment-webhook` endpoint ekle; secret'ı `STRIPE_WEBHOOK_SECRET_TEST` olarak gir
3. (Opsiyonel) Connect webhook ayrı endpoint
4. Sandbox connected account oluşturma akışı için Stripe test onboarding linki

## 10) Kabul kriterleri (her biri test/manuel doğrulanır)

Spec'teki tüm kabul kriterleri test paketi + manual smoke ile doğrulanır. Live mode bilinçli olarak kapalı kalır.

## Riskler / açık konular

- Connect Express vs Standard seçimi — Faz 11.5'te Express varsayıldı; Stripe Dashboard'da onaylanmalı
- Türkiye TRY desteği Stripe Connect için ülke kısıtları olabilir; kullanıcı sandbox hesabı oluştururken bunu doğrulamalı
- Dispute event şemaları SDK versiyonuna bağlı; Stripe API version `payment_provider_configs.api_version` alanından okunur
