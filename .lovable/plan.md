
# Faz 11.5 — Stripe’a Hazırlık (Sandbox-First)

Amaç: Faz 0–11 sonucu oluşan mevcut kod ve şemayı bozmadan, ileri yönlü migration’larla Stripe Checkout + Stripe Connect entegrasyonuna hazırlamak. **Stripe baştan yalnızca sandbox (test mode) olarak çalışacak şekilde kurulur**; live mode tüm katmanlarda varsayılan kapalı kalır ve yazılı dış onay olmadan açılamaz. Bu fazda hiçbir gerçek Stripe API çağrısı, gerçek secret, gerçek ödeme yok.

## 0. Sandbox-first prensibi (sözleşme)

- Stripe entegrasyonu Faz 12’de açıldığında **ilk çalışma modu Stripe sandbox / test mode**’dur.
- Tüm provider config kayıtları başlangıçta `environment='test'`, `payments_enabled=true`, `live_payments_enabled=false`, `production_approval_status='not_verified'`.
- Live mode kapısı (`live_payments_enabled=true`) yalnız: (a) Stripe TR + crowdfunding uygunluk yazılı onayı, (b) admin manuel SQL/seed işlemi, (c) production_approval_status='verified' kombinasyonu sağlandığında açılır. Frontend ve adapter live moda hiçbir kod yoluyla otomatik geçmez.
- Sandbox’ta dahi gerçek Stripe API çağrısı bu fazda yapılmaz; adapter `simulation`’dır. Stripe sandbox çağrıları Faz 12’de yalnız `STRIPE_SECRET_KEY_TEST` ile başlar.
- UI’de live/test rozetleri korunur; sandbox’ta net “Test ortamı — gerçek tahsilat yok” bildirimi.

## 1. Durum tespiti (yazılı çıktı)

`docs/finance/stripe-readiness-audit.md` oluşturulur. Her gereksinim için sınıflar: mevcut-doğru, mevcut-değiştirilecek, eksik, dış-onay-gerekli, Faz 12’ye bırakılan. Gözlemler: 10 migration uygulanmış; `payment_transactions` tek `provider_payment_id` text alanı; `payouts` settlement+transfer+payout’u karıştırıyor; `webhook_events` Connect/livemode/api_version yok; `reward_tiers.claimed_count` var ama süreli rezervasyon yok; `creator_payment_accounts`, `creator_transfers`, `creator_transfer_reversals`, `provider_payouts`, `reward_reservations`, `payment_provider_configs`, `campaign_settlements` yok; finans tabloları boş → forward migration güvenli, drop/rename yok.

## 2. Migration stratejisi

Tek yeni migration `supabase/migrations/<ts>_phase_11_5_stripe_readiness.sql`. Kurallar: drop yok, rename yok, type değişimi yok; eski kolonlar `COMMENT ... 'DEPRECATED'`. Yeni kolonlar nullable; constraint/NOT NULL ileride.

### 2.1 Yeni tablolar

```text
payment_provider_configs       (provider, environment) unique
creator_payment_accounts       (creator_id, provider, environment) unique
reward_reservations            contribution_id + reward_tier_id, status enum
campaign_settlements           campaign_id unique
creator_transfers              provider_transfer_id partial unique per env
creator_transfer_reversals     provider_transfer_reversal_id partial unique
provider_payouts               provider_payout_id partial unique per env
```

Her tablo: GRANT bloğu (finans için yalnız `service_role` write), RLS enable, policy seti (madde 9).

### 2.2 Yeni enum’lar

`payment_domain_status` (created|pending|action_required|processing|paid|failed|cancelled|expired|partially_refunded|refunded|disputed|chargeback), `reward_reservation_status`, `creator_transfer_status`, `creator_transfer_reversal_status`, `provider_payout_status`, `creator_payment_account_status`, `production_approval_status`. Mevcut enum’lara `ALTER TYPE ... ADD VALUE IF NOT EXISTS` ile değer eklenir; eski değerler korunur. `payment_provider` enum/text’ine `simulation` (varsa yok sayılır), `stripe` korunur.

### 2.3 Provider config seed (sandbox-first)

Migration sonunda idempotent seed:

```sql
insert into payment_provider_configs (provider, environment, checkout_mode, capture_model,
  failed_campaign_model, connect_flow, currency, payments_enabled,
  creator_onboarding_enabled, transfers_enabled, refunds_enabled,
  live_payments_enabled, production_approval_status)
values
  ('stripe','test','hosted_checkout','immediate_capture','full_refund',
   'separate_charges_and_transfers','TRY', true, true, true, true, false, 'not_verified'),
  ('stripe','live','hosted_checkout','immediate_capture','full_refund',
   'separate_charges_and_transfers','TRY', false, false, false, false, false, 'not_verified')
on conflict (provider, environment) do nothing;
```

### 2.4 `payment_transactions` genişletmesi (kolon ekleme; drop yok)

Eklenecek nullable kolonlar: `provider_checkout_session_id`, `provider_payment_intent_id`, `provider_charge_id`, `provider_balance_transaction_id`, `provider_connected_account_id`, `provider_status`, `provider_created_at`, `checkout_expires_at`, `completed_at`, `last_provider_event_id`, `failure_code`, `failure_message_sanitized`, `domain_status payment_domain_status`. `provider_payment_id` deprecated.

Partial unique indexler (her biri `WHERE col IS NOT NULL AND provider <> 'simulation'`, environment dahil): checkout_session, payment_intent, charge, balance_tx. Ayrıca `unique(contribution_id, attempt_number)`.

Simulation namespace trigger: `provider='simulation'` iken Stripe prefix’li ID (pi_, ch_, cs_, evt_, acct_) reddi.

### 2.5 `webhook_events` genişletmesi

Eklenir: `provider_account_id`, `livemode`, `api_version`, `request_id`, `event_created_at`, `provider_object_type`, `provider_object_id`, `processing_started_at`, `processing_completed_at`, `next_retry_at`, `dead_lettered_at`, `environment`. Unique expression index: `(provider, environment, coalesce(provider_account_id,'_'), provider_event_id)`. Raw payload saklanmaz; `payload_hash` tutulur.

### 2.6 `financial_ledger_entries` genişletmesi

FK kolonları: `creator_transfer_id`, `creator_transfer_reversal_id`, `provider_payout_id`. `entry_type` enum’una madde 5’teki event tipleri. Append-only trigger: UPDATE/DELETE reddi (admin dahil); düzeltme yalnız reversal entry ile.

### 2.7 `payouts` geriye dönük uyum

Tablo boş; drop edilmez. `COMMENT 'DEPRECATED — replaced by campaign_settlements + creator_transfers + provider_payouts'`. Mevcut kod yeni tablolara yönlendirilir; eski tablo Faz 12 sonrası temizlik fazında düşürülür.

## 3. Database fonksiyonları

Yeni `SECURITY DEFINER`, `search_path=public`, doğru REVOKE/GRANT:

- `reserve_reward(_contribution_id, _reward_tier_id, _quantity, _expires_at)` — transaction + row lock, duplicate aktif rezervasyon reddi.
- `confirm_reward_reservation(_contribution_id)` — idempotent.
- `release_reward_reservation(_contribution_id, _reason)` — idempotent; quantity tek sefer geri verilir.
- `release_expired_reward_reservations()` — cron-safe; payment durumunu yeniden okur.
- `get_campaign_payment_readiness(_campaign_id)` — campaign status, creator account, env, capability, blocking requirement, provider config, production approval, `live_payments_enabled`. Sandbox’ta test env readiness, live’da live env readiness döner; live env kapalıysa `PAYMENT_PROVIDER_DISABLED`.
- `record_payment_event(...)` — webhook idempotency + ledger append.

Mevcut `simulate_test_payment` korunur ve sandbox-first kurala göre düzenlenir: aynı trusted state-transition fonksiyonunu çağırır; başarıda `confirm_reward_reservation`, başarısız/iptalde `release_reward_reservation`. `provider='simulation'`, `environment='test'`. Production rejection devam eder. Public aggregate (`get_public_campaigns`, `get_public_campaign_by_slug`) `environment` filtresi alır: `live_payments_enabled=false` iken test sayılır; true olunca live’a geçer.

## 4. Provider adapter sınırı (sandbox-first)

`src/lib/payments/provider/`:

```text
types.ts                — PaymentProvider interface, DomainPaymentError union
errors.ts               — CAMPAIGN_NOT_PAYMENT_READY vb. 11 kod
simulation-adapter.ts   — mevcut simulate_test_payment'ı sarar (default)
stripe-sandbox-adapter  — Faz 12 iskeleti; STRIPE_SECRET_KEY_TEST okur, NOT_IMPLEMENTED
stripe-live-adapter     — Faz 12 sonrası; live flag + approval olmadan factory döndürmez
index.ts                — getProvider(env, config) factory: sandbox-first kuralı uygular
```

Factory kuralı: `environment='test'` → simulation (bu faz) / stripe-sandbox (Faz 12); `environment='live'` → yalnız `live_payments_enabled=true && production_approval_status='verified'` ise stripe-live; aksi halde `PAYMENT_PROVIDER_DISABLED` fırlatır. Frontend doğrudan Stripe’a bağlanmaz.

## 5. Server functions (TanStack Start)

`src/lib/payments/`, hepsi `requireSupabaseAuth`:

- `getCampaignPaymentReadiness({ campaignId })`
- `getCreatorPaymentAccountSummary()` — sahip maskeli okur
- `requestCreatorOnboarding()` — bu fazda `NOT_IMPLEMENTED`; UI placeholder
- `releaseExpiredReservations()` — admin/cron

`createContribution` güncellenir: contribution sonrası `reserve_reward` (transaction). `simulateTestPayment` aynı RPC’yi çağırır; success → reservation confirm.

## 6. Frontend

- `/_authenticated/creator/payment-account` route: readiness kartı + “Stripe sandbox onboarding Faz 12’de açılacak; live mode dış onaydan sonra” açıklaması.
- `CampaignDetailPage` ve back akışı: `getCampaignPaymentReadiness` çağrısı; readiness yoksa Destekle butonu disabled + dürüst mesaj.
- `back/ResultStep`: URL `?success=true` ödeme kanıtı değil; status yalnız backend polling’den.
- Sandbox rozetleri: `TestEnvironmentBadge` korunur; live env aktifleştiğinde ayrı `LiveEnvironmentBadge` ileride.

## 7. Environment & secrets (sandbox-first isimlendirme)

`.env.example` ve `docs/finance/stripe-integration-contract.md`’de yalnız isim+açıklama:

```text
STRIPE_SECRET_KEY_TEST            # Faz 12 sandbox — server only, sk_test_...
STRIPE_WEBHOOK_SECRET_TEST        # Faz 12 sandbox webhook
STRIPE_CONNECT_WEBHOOK_SECRET_TEST# Faz 12 sandbox connect webhook
STRIPE_SECRET_KEY_LIVE            # KAPALI — dış onaydan sonra eklenir
STRIPE_WEBHOOK_SECRET_LIVE        # KAPALI — dış onaydan sonra
STRIPE_API_VERSION                # opsiyonel pin
APP_PUBLIC_URL                    # checkout return/cancel base
```

Test/live secret aynı isimde paylaşılmaz. Publishable key bu fazda eklenmez (hosted checkout). Frontend’e secret konulmaz.

## 8. Belgeler

Yeni: `docs/finance/stripe-readiness-audit.md`, `docs/finance/stripe-integration-contract.md` (sandbox-first bölümü zorunlu), `docs/finance/edge-function-contracts.md` (madde 10’daki 5 function için auth, schema, idempotency, transaction, rate-limit, replay, test/live davranışı).

Güncellenir: `docs/money-flow.md`, `docs/domain-glossary.md` (Transfer ≠ Payout, settlement, reservation, sandbox vs live), `docs/contribution-payment-state-machine.md` (yeni domain_status), `docs/campaign-state-machine.md` (publish ≠ payment-ready), `docs/project-knowledge.md`, `docs/environments.md` (sandbox-first vurgusu, live mode açma prosedürü).

## 9. RLS özet

- Finans tabloları (`payment_provider_configs`, `webhook_events`, `financial_ledger_entries`, `creator_transfers`, `creator_transfer_reversals`, `provider_payouts`, `campaign_settlements`): authenticated INSERT/UPDATE/DELETE yok; SELECT yalnız ilgili creator/admin.
- `creator_payment_accounts`: owner SELECT (maskeli view); UPDATE yok, yalnız service role.
- `reward_reservations`: backer SELECT kendi rezervasyonu; UPDATE/DELETE yok.
- `payment_transactions`: backer SELECT kendi (maskeli); INSERT/UPDATE yok.
- Environment spoofing: insert trigger user-supplied environment’ı reddeder; daima config’den türetilir.

## 10. Faz 12 Edge Function contract iskelesi

`docs/finance/edge-function-contracts.md` ve `src/lib/payments/contracts/`:

- `create-stripe-checkout-session` (sandbox-first: env=test default; tutarı client’tan kabul etmez, backend re-read)
- `stripe-webhook` (test/live ayrı secret)
- `create-stripe-connected-account`
- `create-stripe-account-link`
- `get-stripe-account-status`

Her biri için auth, authz, input/output schema, idempotency scope, transaction boundary, Stripe nesneleri, DB yan etkileri, güvenli hata kodları, audit, test/live davranışı, rate limit, replay.

## 11. Testler (Vitest + SQL)

`tests/finance/`, `tests/reservations/`:

- Schema: forward migration replay, generated types regenerate.
- Reward reservation: concurrent claim, failed/cancelled release, expired job idempotency, paid confirm, double-release stok bozmaz.
- Payment: simulation ID prefix kontrolü, attempt sırası, URL success parametresi etkisiz, processing/action_required render, prod env rejection, test/live aggregate ayrımı.
- Sandbox-first: default config’de `live_payments_enabled=false`; live readiness `PAYMENT_PROVIDER_DISABLED` döner; manuel flag açıldığında readiness geçer.
- Creator account: owner okur, başka okuyamaz, client `payouts_enabled` yazamaz, blocking requirement → not payment-ready.
- Finance security: client insert/update/delete reddi, duplicate webhook ikinci ledger oluşturmaz, ledger update/delete reddi.
- Regression smoke: Faz 7/8/9/10/11 mevcut testler geçer.

Build, lint, `tsc --noEmit`, `vitest run` çalıştırılır; hata varsa düzeltilir.

## 12. Yapılmayacaklar

Gerçek Stripe API çağrısı (sandbox dahil), gerçek secret, gerçek Checkout, gerçek webhook, gerçek refund/transfer/payout, live payments aç, hukuki/Stripe onayı alınmış gibi davran, escrow ifadesi, eski migration düzenle, drop/rename/reset, çalışan fazları yeniden yaz.

## 13. Açık riskler / dış onay

- Stripe TR + crowdfunding uygunluk yazılı doğrulanmadan `live_payments_enabled=true` yapılmaz.
- Sandbox Stripe çağrıları Faz 12’de açılacak; bu fazda yalnız simulation.
- `payouts` tablosu Faz 12 sonrası temizlik fazında düşürülecek.
- PII şifreleme (pgcrypto) bu fazda dahil değil; sıkı RLS.
- Reward reservation cron’u Faz 12’de pg_cron/`/api/public/hooks/release-reservations` ile koşturulacak.
- Production `app.environment` Postgres setting elle ayarlanmalı.

## 14. Son rapor başlıkları

Mevcut yapı problemleri, eklenen tablolar/enum/index, değişen DB function’lar, RLS değişiklikleri, sandbox-first config seed doğrulaması, frontend/type değişiklikleri, eklenen testler, build/lint/type-check/test çıktıları, Faz 12’ye bırakılan Stripe işleri (sandbox aktivasyonu dahil), manuel Stripe & hukuki adımlar (live mode açma prosedürü), veri kaybı riski (yok bekleniyor), açık blokajlar.
