# Smoke Tests (production — düşük etkili)

> Hiçbir smoke test gerçek para hareketi yaratmaz. Live ödeme adımı yalnız
> "Controlled launch sequence" altındaki authorized participants ile yapılır.

## Genel
1. `GET /` (home) → 200, hero render.
2. `GET /discover` → 200, kampanya listesi (boşsa boş state).
3. `GET /campaigns/:slug` (public bir kampanya) → 200.
4. `robots.txt`, `sitemap.xml` → 200.

## Auth
5. Register → e-mail gönderildi (sandbox/restricted recipient prod öncesi).
6. Login → success; auth redirect URL production domain.
7. OAuth callback (varsa) → success.

## Creator
8. Test creator hesabı (cleanup edilecek) ile **draft** kampanya oluştur →
   başarılı; sonrasında **silinir**.

## Admin
9. Admin login → MFA prompt; admin dashboard erişimi.

## Gate kontrolleri (gerçek işlem yok)
10. `production_payments_enabled = false` iken Checkout dene → **server 403**
    `release_gate_blocked`.
11. `production_payments_enabled = true` + `kill_switch_new_contributions =
    false` → server 403 `release_gate_blocked`.
12. `production_creator_transfers_enabled = false` iken transfer komutu →
    server 403.

## Webhook health (finansal mutasyon **yok**)
13. Stripe Dashboard → "Send test webhook" ping → endpoint 200; DB'ye
    finansal kayıt **yazılmaz** (test event guard: `livemode=false` filtreli
    veya signature/event-ID prefix kontrolü).
14. `webhook_events` tablosunda son 5 dk içinde test event'in `claimed` veya
    `ignored` durumda olduğunu doğrula.

## Sandbox izolasyon
15. Production DB'de `stripe_*_id` kolonlarında `cs_test_`, `pi_test_`,
    `acct_*` test prefix taraması → 0 satır.

## Monitoring
16. Sentry/error tracker'a kasıtlı test exception → alert tetiklendi.
17. Uptime monitor → green.
