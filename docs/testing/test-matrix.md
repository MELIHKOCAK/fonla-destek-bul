# BeniFonla Test Matrisi

Bu doküman, kritik ürün gereksinimlerini test türlerine eşleştirir. Her satır
otomasyona alındıkça `Durum` kolonu güncellenmelidir. Faz 18 kapsamında
işaretli `auto` satırlar Vitest paketinde uygulandı; `pgTAP`, `E2E` ve
`manual-stripe` satırları sonraki fazlarda altyapı kurulduğunda
genişletilecektir.

Türler:
- **unit** — saf fonksiyon (Vitest)
- **component** — React Testing Library + Vitest
- **db** — pgTAP / Supabase migration smoke
- **edge** — Deno test / TanStack server fn entegrasyon
- **e2e** — Playwright (Faz sonrası)
- **manual-stripe** — Stripe sandbox/test mode, insan eliyle koşulur

## Finans / Para

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| TRY kuruş parse (tr-TR & en-US) | unit | `src/test/campaigns/money.test.ts` | auto |
| Kuruş -> input formatlama | unit | `src/test/campaigns/money.test.ts` | auto |
| `formatMoneyMinor` lokalizasyon | unit | `src/lib/__tests__/format.test.ts` | auto |
| Progress hesabı clamp davranışı | unit | `src/lib/__tests__/format.test.ts` | auto |
| BPS yuvarlama (banker / floor) | unit | `src/lib/payments/__tests__/fees.test.ts` | auto |
| Settlement net/komisyon | edge | TODO Faz 19 | gap |
| Refund tutar limit | edge | TODO Faz 19 | gap |
| Ledger append-only | db (pgTAP) | TODO | gap |

## Ödeme / Stripe

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| Checkout Session status map | unit | `src/lib/payments/__tests__/stripe-status-mapper.test.ts` | auto |
| PaymentIntent status map | unit | aynı dosya | auto |
| Bilinmeyen status -> `unknown` | unit | aynı dosya | auto |
| Webhook raw-body imza | edge | TODO (Stripe fixture) | gap |
| Replay & duplicate event | edge | TODO | gap |
| Out-of-order event | edge | TODO | gap |
| Session expiration & delayed payment | edge | TODO | gap |
| ID karışmaması (cs_/pi_/ch_/re_/tr_/po_) | unit | `src/lib/payments/__tests__/id-guards.test.ts` | auto |
| Transfer eligibility | edge | TODO | gap |
| Transfer Reversal limit | edge | TODO | gap |
| Provider Payout observation | edge | TODO | gap |
| Idempotency-Key replay | edge | TODO | gap |
| Test/Live key isolation | unit | `src/lib/payments/__tests__/id-guards.test.ts` | auto |

## Kampanya

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| Basics Zod | unit | `src/test/campaigns/validation.test.ts` | auto |
| Funding tarih sınırı | unit | aynı dosya | auto |
| Süre min/max gün | unit | aynı dosya | auto |
| Ödül tier şeması | unit | `src/lib/campaigns/__tests__/reward.test.ts` | auto |
| State transition tablosu | unit | `src/lib/campaigns/__tests__/transitions.test.ts` | auto |
| Submit eksik alan reddi | edge | TODO | gap |
| Admin transition yetki | edge | TODO | gap |
| Reward quantity concurrency | db | TODO | gap |
| Kendi kampanyana destek bloğu | edge | TODO | gap |
| Kalan süre boundary / timezone | unit | `src/lib/__tests__/format.test.ts` | auto |

## Auth / Roller / RLS

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| `has_role` security definer | db | TODO | gap |
| Owner-only campaign update | db | TODO | gap |
| Anonim canlı kampanya okuyabilir | db | TODO | gap |
| Anonim draft göremez | db | TODO | gap |
| `financial_ledger_entries` direct write deny | db | TODO | gap |
| Audit log update/delete deny | db | TODO | gap |
| Tüm public tablo RLS açık | db | TODO | gap |
| Function execute grants | db | TODO | gap |
| Storage policy | edge | TODO | gap |

## UI / Bileşen

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| CampaignCard render | component | `src/components/common/__tests__/CampaignCard.test.tsx` | auto |
| CampaignProgress clamp | component | `src/components/common/__tests__/CampaignProgress.test.tsx` | auto |
| MoneyDisplay formatlama | component | `src/components/common/__tests__/MoneyDisplay.test.tsx` | auto |
| Theme persistence | component | `src/components/common/__tests__/ThemeToggle.test.tsx` | auto |
| Mobile navigation aktif route | component | `src/components/layout/__tests__/MobileNavigation.test.tsx` | auto |
| Status badge mapping | component | TODO | gap |
| Role-controlled UX | component | TODO | gap |
| URL filter state | component | TODO | gap |
| Error / empty / loading | component | TODO | gap |
| Wizard autosave / conflict | component | TODO | gap |
| Notification read state | component | TODO | gap |

## Bildirim

| Gereksinim | Tür | Konum | Durum |
| --- | --- | --- | --- |
| Template render & maskeleme | unit | `src/lib/notifications/__tests__/templates.test.ts` | auto |
| Preferences default | unit | `src/lib/notifications/__tests__/preferences.test.ts` | auto |
| Format helpers | unit | `src/lib/notifications/__tests__/format.test.ts` | auto |
| Dedupe (DB unique) | db | TODO | gap |
| Retry backoff | edge | TODO | gap |

## E2E Senaryoları (Playwright — Faz 19+)

Tüm akışlar bağımsız test datasıyla, `vite preview` veya hosted preview üzerinde:

1. Misafir canlı kampanyayı keşfeder.
2. Kayıt + e-posta doğrulama (test mailbox).
3. Creator taslak oluşturur ve autosave eder.
4. Eksik taslak submit reddedilir.
5. Geçerli submit + admin revision döngüsü.
6. Admin onay + zamanlama + yayın.
7. Backer Stripe sandbox ödemesi.
8. Başarılı kampanya kapanışı.
9. Başarısız kampanya kapanışı + Refund.
10. Creator Transfer + opsiyonel Reversal.
11. Provider Payout observation.
12. Unauthorized route + direct API girişimi.
13. Comment / report / moderation.
14. Bildirim dedupe.

E2E paketi `pnpm test:e2e` komutu eklendiğinde bu satırlar `auto` olur.

## Manuel Stripe Sandbox Matrisi

`docs/testing/README.md` içindeki manual matris ile koşulur. Bu kayıtlar
release-checkliste girer; CI bu testleri çalıştırmaz.

- 4242 4242 4242 4242 — succeeded
- 4000 0027 6000 3184 — 3DS action_required
- 4000 0000 0000 9995 — insufficient_funds
- 4000 0000 0000 0341 — chargeback dispute
- Refund full / partial
- Transfer + Reversal pair
- Connected account requirements due

> Üretim canlı key'i CI'da kullanılmaz. Live davranış sadece fixture'larla
> doğrulanır; gerçek live ödeme yalnız Faz 21 manuel release kapısında
> yapılır.
