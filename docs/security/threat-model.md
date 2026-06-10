# BeniFonla — Threat Model

> Faz 19. Bu doküman varlıkları, güven sınırlarını ve gerçek tehditleri
> listeler. Yeni özellik eklenince güncellenmeli.

## Veri Akışı (kısaltılmış)

```
Tarayıcı (anon / authenticated)
  │
  ├── TanStack server fn (Cloudflare Worker, attachSupabaseAuth)
  │     └── Supabase Postgres (RLS, SECURITY DEFINER RPC, has_role)
  │
  ├── Public TSS routes (/api/public/*) — webhook & cron
  │     └── Stripe → /webhook (imza doğrulanır)
  │
  └── Supabase Auth (e-posta/parola + Google)
        └── handle_new_user trigger → profiles, notification_preferences
```

Güven sınırları:
- Tarayıcı ↔ Worker: bearer token + RLS
- Worker ↔ DB: publishable key (RLS) veya servis rolü (yalnız webhook/cron)
- Stripe ↔ /api/public/webhooks: imza + raw body

## Varlıklar

| Varlık | Konum | Hassasiyet |
| --- | --- | --- |
| Oturum tokenları | tarayıcı `localStorage` | yüksek |
| `profiles` PII (e-posta, ad) | `public.profiles` | orta |
| Taslak kampanya & medya | `campaigns`, `campaign_media` | orta |
| Admin inceleme notları | `campaigns.admin_notes`, `campaign_reports` | yüksek |
| Katkı, ödeme, refund, transfer | `contributions`, `payment_transactions`, `refunds`, `creator_transfers`, `creator_transfer_reversals`, `provider_payouts` | kritik |
| Stripe gizli/restricted/webhook secret | Edge secret (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | kritik |
| Connect account context | `creator_payment_accounts` | yüksek |
| Ledger / audit | `financial_ledger_entries`, `audit_logs` | kritik (immutable) |

## Tehditler ve Kontroller

| # | Tehdit | Vektör | Kontrol | Durum |
| --- | --- | --- | --- | --- |
| T-01 | IDOR / ownership bypass | API'da başka kullanıcının `campaign_id`'sini geçmek | RLS + `auth.uid()` kontrolleri + RPC içinde owner doğrulama | OK |
| T-02 | Privilege escalation | `profiles.role` yazımı | Roller `user_roles` ayrı tabloda, `has_role` SECURITY DEFINER, profile.role yok | OK |
| T-03 | RLS misconfiguration | RLS kapalı / aşırı izinli policy | Tüm public tablolarda RLS açık; linter ile periyodik tarama | OK + izleniyor |
| T-04 | Stored XSS (rich text) | Kampanya hikâye, comment, update | Markdown render edici raw HTML kapalı; allowlist sanitizer; `dangerouslySetInnerHTML` yalnız chart token CSS (kontrollü) | Kontrollü |
| T-05 | Stripe webhook spoof | İmza atlama / replay | Edge'de raw body + `stripe.webhooks.constructEvent`; `webhook_events.provider_event_id` UNIQUE → replay engellenir | OK |
| T-06 | Test/live event karışması | Test event'in live ledger'ı bozması | `webhook_events.environment` (`live`/`test`) + `payment_transactions.environment` + `creator_transfers_live_guard` trigger | OK |
| T-07 | Duplicate financial op | Refund/Transfer tekrar | Idempotency keys + DB UNIQUE constraint; `_finalize_contribution_paid` once-only | OK |
| T-08 | Object ID confusion (cs_/pi_/ch_/re_/tr_/po_) | Yanlış endpoint, yanlış silme | Server-side prefix guard + test (`id-guards.test.ts`) | OK |
| T-09 | Brute force / enumeration | Login, password reset | Supabase Auth rate-limit + generic error mesajları; HIBP açık | İzleniyor |
| T-10 | Spam (comment/report) | Otomasyon | RPC içinde owner kontrolü + per-user rate (Faz 19.5) | Kısmi |
| T-11 | Malicious upload | SVG/exec/polyglot | Storage allowlist (image/jpeg, image/png, image/webp); SVG block; generated path; private bucket draft media | OK |
| T-12 | Secret exposure | `VITE_*` içinde sırrı kaçırmak | Lint: `VITE_.*SECRET|SERVICE_ROLE` yasak; CI grep; bundle scan | OK |
| T-13 | Admin abuse | Doğrudan finans yazımı | Admin yalnız RPC ile (gerekçe + audit log); `financial_ledger_entries` UPDATE/DELETE deny | OK |
| T-14 | Mass scraping | `get_public_campaigns` pagination kötüye | Sayfa boyutu limit + caching; ileride per-IP throttle | Kısmi |
| T-15 | CSRF | Aynı-origin server fn | Supabase auth Bearer header; cookie-only mutate yok | OK |
| T-16 | Reauth-less destructive admin | Audit/finansal silme | `ConfirmActionDialog` zorunlu gerekçe + tip-to-confirm | OK |
| T-17 | Ledger tampering | Update/delete | RLS: yalnız INSERT (servis), UPDATE/DELETE policy yok → reddedilir | OK |

## Kabul Edilen / Bilinen Açıklar

- **Backend rate-limit primitive yok.** Lovable Cloud için takip ediliyor;
  scanner uyarıları kapsam dışı.
- **`SECURITY DEFINER` + anon execute** ~120 fonksiyonda mevcut (Supabase
  linter). Hepsi by design: `get_public_*`, `has_role`, `is_admin`,
  `claim_username`, vb. fonksiyon gövdesi yetkilendirme yapar. Tetikleyici
  ve worker fonksiyonlarda anon/authenticated EXECUTE kaldırıldı
  (Faz 19 migration).
- **`public` şemasında `pg_trgm` ve benzeri extension.** Kullanım kapsamı
  okuma; risk düşük, accepted.

## Sonraki adımlar (Faz 19.5+)

- Per-user/IP rate-limit tablosu + Edge helper.
- DOMPurify boundary testleri + CSP header.
- Bundle build sonrası `grep -E "sk_(live|test)_|service_role"` CI check.
- Storage bucket policy regression test.
