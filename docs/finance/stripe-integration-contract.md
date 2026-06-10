# Stripe Entegrasyon Sözleşmesi

## Sandbox-first prensibi (zorunlu)

1. **İlk çalışma modu Stripe sandbox**'tır. `payment_provider_configs` satırları seed edildiğinde test açık, live tüm flag'leri kapalıdır.
2. Live mode (`live_payments_enabled=true`) sadece üç koşul birlikte sağlandığında açılır:
   - Stripe Türkiye + reward-based crowdfunding uygunluk **yazılı** onayı,
   - admin tarafından elle SQL/seed UPDATE,
   - `production_approval_status='verified'`.
3. `getProvider()` factory live moda hiçbir kod yoluyla otomatik geçmez; eksik koşulda `PAYMENT_PROVIDER_DISABLED` fırlatır.
4. Faz 11.5'te gerçek Stripe çağrısı yoktur; adapter `simulation`. Faz 12'de yalnız `STRIPE_SECRET_KEY_TEST` ile sandbox açılır.

## Domain kararları

- Ödeme arayüzü: **Stripe-hosted Checkout** (frontend secret tutmaz).
- Ödeme yaşam döngüsü: **PaymentIntent**, **immediate capture**.
- Başarısız kampanya → **full refund**.
- Başarılı kampanya → settlement sonrasında **Stripe Transfer** (platform → connected account).
- **Transfer ≠ Payout.** Transfer connected account bakiyesine ekler; Payout o bakiyeden banka hesabına gider.
- Sistem **escrow / cüzdan / kullanıcı bakiyesi değildir**.

## Webhook sözleşmesi

- Stripe signature **raw body** üzerinden doğrulanır.
- Duplicate event ikinci yan etkiyi üretmez (`webhook_events_full_unique` index Connect context dahil).
- Event sırası garanti değildir; gerektiğinde Stripe API'den nesne yeniden okunur.
- Test/live webhook secret'ları ayrıdır (`STRIPE_WEBHOOK_SECRET_TEST` / `STRIPE_WEBHOOK_SECRET_LIVE`).
- Bilinmeyen event loglanır; domain state'i değiştirmez.
- URL'deki `?success=true` parametresi ödeme kanıtı değildir.

## Idempotency ve unique anahtarlar

- `payment_transactions` her Stripe nesnesi için ayrı kolon ve **environment-scoped partial unique** index'e sahiptir (`pt_checkout_session_unique`, `pt_payment_intent_unique`, `pt_charge_unique`, `pt_balance_tx_unique`).
- Simulation kayıtları Stripe namespace'ine giremez (DB trigger).
- `contribution_id, attempt_number` çift unique.

## Reward rezervasyon yaşam döngüsü

`reserved → confirmed | released | expired` — kontrolü `reserve_reward` / `confirm_reward_reservation` / `release_reward_reservation` / `release_expired_reward_reservations` RPC'leri sağlar; quantity sayacı sadece confirmed durumunda artar. Trigger contribution status'ı `captured → confirm`, `failed|cancelled → release` mapping'ini otomatik yapar.

## Production enablement kapıları

- `payment_provider_configs.live_payments_enabled`
- `payment_provider_configs.production_approval_status`
- `creator_payment_accounts.charges_enabled` (live env için)
- `process.env.APP_ENV !== 'production'` simulation endpoint'i için
- `current_setting('app.environment')` DB-side simulation reddi

Hiçbiri kod tarafından otomatik açılmaz. Hukuki/Stripe onayı **teknik koddan bağımsız dış gereksinimdir**.
