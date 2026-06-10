# Stripe Readiness Audit — Faz 11.5

Sınıflar: ✅ mevcut-doğru · 🔧 mevcut-değiştirilecek · ➕ eksik · 🔒 dış-onay-gerekli · ⏭ Faz 12'ye bırakıldı

## Veritabanı

| Gereksinim | Sınıf | Not |
|---|---|---|
| `payment_provider_configs` tablosu | ➕→✅ | Faz 11.5'te eklendi; sandbox-first seed |
| `creator_payment_accounts` | ➕→✅ | Field-lock trigger ile kritik alanlar korumalı |
| `reward_reservations` + TTL | ➕→✅ | `reserve_reward`/`release_expired_reward_reservations` RPC'leri |
| `campaign_settlements` | ➕→✅ | Yeni; net hesap özeti |
| `creator_transfers` / `creator_transfer_reversals` | ➕→✅ | Transfer ≠ Payout ayrımı |
| `provider_payouts` | ➕→✅ | Connected account → banka payout |
| `payment_transactions` Stripe ID alanları | 🔧→✅ | provider_payment_id deprecated; checkout/intent/charge/balance_tx kolonları + partial unique indexler |
| Simulation namespace izolasyonu | ➕→✅ | Trigger Stripe prefix'li ID'yi simulation provider için reddeder |
| Webhook Connect/livemode awareness | 🔧→✅ | environment + provider_account_id + 8 kolon eklendi |
| Ledger append-only | ➕→✅ | UPDATE/DELETE reddeden trigger |
| `payouts` tablosu | 🔧 | DEPRECATED comment; drop edilmedi (data yok ama forward-only) |

## RPC'ler

| RPC | Sınıf |
|---|---|
| `reserve_reward`, `confirm_reward_reservation`, `release_reward_reservation`, `release_expired_reward_reservations` | ➕→✅ |
| `get_campaign_payment_readiness` | ➕→✅ |
| `get_my_creator_payment_account` (maskeli) | ➕→✅ |
| `simulate_test_payment` (mevcut, korunur) | ✅ |

## Frontend / Adapter

| Bileşen | Sınıf |
|---|---|
| `src/lib/payments/provider/types.ts` (DomainPaymentError + interface) | ➕→✅ |
| `simulation-adapter.ts` (sandbox-first default) | ➕→✅ |
| `stripe-sandbox-adapter.ts` (Faz 12 iskele) | ➕→⏭ |
| `stripe-live-adapter.ts` (live-only) | ➕→🔒 |
| `getProvider` factory (sandbox-first kural) | ➕→✅ |
| `/_authenticated/creator/payment-account` route | ➕→✅ |
| `getCampaignPaymentReadiness` server fn | ➕→✅ |

## Dış onay (kod dışı)

- 🔒 Stripe Türkiye + crowdfunding uygunluk yazılı onayı
- 🔒 `live_payments_enabled=true` flag'i admin tarafından elle açılır
- 🔒 `production_approval_status='verified'` admin tarafından elle güncellenir
- 🔒 Production `app.environment` Postgres setting

## ⏭ Faz 12'ye bırakılan

- Gerçek Stripe Checkout Session oluşturma
- Stripe webhook handler (`/api/public/hooks/stripe-webhook`)
- Stripe Connect onboarding link üretme
- pg_cron veya HTTP cron ile `release_expired_reward_reservations` periyodik çalıştırma
- Refund / Transfer / Payout gerçek API çağrıları
- PII (shipping) için pgcrypto şifrelemesi
- Eski `payouts` tablosunun temizliği
