
# Faz 14 — Destek (Contribution) Akışı + Test Ödeme Simülasyonu

Gerçek ödeme sağlayıcı entegre edilmeden, contribution domain akışı uçtan uca kurulur. Test modunda payment attempt'ler güvenli simülasyonla üretilir; production'da simülasyon endpoint'i reddedilir.

## 1. Veritabanı (yeni migration)

Mevcut `contributions`, `payment_transactions`, `reward_tiers` tabloları zaten uygun. Sadece eklenecekler:

- `reward_tiers.claimed_count` int default 0 (counter; transaction içinde artırılır).
- `contributions.shipping_*` minimum fulfillment alanları (recipient_name, line1, city, postal_code, country, phone) — pgcrypto ile şifrelenmiş veya plain ama RLS sıkı. PII; public DTO'ya girmez.
- `contribution_environment_idx` partial index (`campaign_id, status`) where `environment='test'` ve `'live'` — agregasyon ayrımı için.
- Aşağıdaki `SECURITY DEFINER` fonksiyonlar:
  - `create_contribution(_campaign_id, _reward_tier_id, _amount_minor, _anonymous, _risk_ack, _shipping jsonb, _idempotency_key)` — tüm uygunluk kurallarını transaction içinde uygular, reward `claimed_count` artırır (quantity limit aşıldıysa `BFL_REWARD_SOLD_OUT`), idempotency key ile çakışmada mevcut kaydı döner. Status `pending`.
  - `simulate_test_payment(_contribution_id, _scenario text)` — yalnız `environment='test'` ve `current_setting('app.environment','t') <> 'production'` kontrolü. `succeeded|failed|cancelled` senaryosu üretir, attempt_number'ı artırarak `payment_transactions` insert eder, başarılıysa `_finalize_contribution_paid` çağrılır.
  - `_finalize_contribution_paid(_contribution_id, _payment_transaction_id)` — internal trusted function; status `pending|failed -> captured` transition, ledger entry kaydı (mevcut tablo varsa), audit log.
  - `get_contribution_status(_id)` — sadece backer/admin görür; latest payment attempt status + contribution status döner.
  - `get_my_contributions()` — dashboard listesi (campaign info + amount + reward + status + latest attempt + created_at + environment).
  - `get_campaign_progress(_campaign_id)` — yalnız `status='captured' AND environment='test'` (MVP'de test çünkü production payment yok) toplamı, distinct backer count, percent (capped 999).
- `public.get_public_campaigns` ve `get_public_campaign_by_slug` aggregate'i bu yeni RPC mantığına bağlanır (environment='test' captured).
- Mevcut `auto_follow_on_contribution` trigger korunur.

## 2. Backend simülasyon koruması

Test endpoint sadece `process.env.APP_ENV !== 'production'` ise tetiklenir. Bunu DB'de de garanti etmek için `simulate_test_payment` içinde `current_setting('app.environment',true)` okunur ve `production` ise `BFL_SIMULATION_DISABLED` fırlatılır. Migration `ALTER DATABASE ... SET` yapamadığı için bu setting Lovable Cloud preview/published ortamında `production` olarak ayarlanır — manuel adım olarak rapor edilir.

## 3. Server functions (TanStack Start)

`src/lib/contributions/` dizini:

- `contributions.functions.ts`:
  - `getContributionCheckoutContext({ slug })` — kampanya + aktif rewards + eligibility (kullanıcı, status, tarih, kendi kampanyası mı).
  - `createContribution({ campaignId, rewardTierId, amountMinor, anonymous, riskAck, shipping, idempotencyKey })` → RPC çağırır.
  - `simulateTestPayment({ contributionId, scenario })` → RPC çağırır; sadece test env.
  - `getContributionResult({ contributionId })` — status polling için.
  - `listMyContributions()` — dashboard.
- `requireSupabaseAuth` middleware zorunlu.
- Tüm Zod `inputValidator` ile min/max ve uuid kontrolleri.

## 4. Frontend route'lar

`src/routes/campaigns.$slug.back.tsx` (layout, `<Outlet/>`) + leaf route'lar:

- `campaigns.$slug.back.index.tsx` → miktar adımı
- `campaigns.$slug.back.reward.tsx`
- `campaigns.$slug.back.details.tsx` (shipping + risk ack)
- `campaigns.$slug.back.review.tsx`
- `campaigns.$slug.back.result.tsx` (polling, URL "success" parametresine güvenmez)

Step state: Zustand veya React Context `BackFlowProvider` — refresh'te sessionStorage'dan idempotency key + seçimler restore edilir; ancak kritik veriler (amount validity, reward availability) her adımda backend'den yeniden okunur.

`/dashboard/contributions` rotası: `_authenticated/dashboard.contributions.tsx`. Mevcut `dashboard.tsx`'i layout'a çevirme; ayrı leaf yeterli.

## 5. UI bileşenleri

`src/components/back/`:
- `AmountStep`, `RewardStep`, `ShippingStep`, `ReviewStep`, `ResultStep`
- `StepIndicator`, `RiskDisclosureCheckbox`
- `TestPaymentSimulator` — açık "Test ödeme simülasyonu" başlığı, kart UI taklit etmez; 3 buton: Başarılı / Başarısız / İptal
- `ContributionStatusBadge`, `TestEnvironmentBadge`

Mevcut shadcn bileşenleri kullan (Card, Button, RadioGroup, Form, Stepper paterni).

## 6. Idempotency

Client `crypto.randomUUID()` ile checkout başında üretip sessionStorage'a `back:${campaignId}:idempotencyKey` olarak kilitler. Step başına aynı key. `createContribution` unique `(backer_id, idempotency_key)` üzerine düşerse mevcut row döner. Double click için button disabled + mutation `mutationKey` ile dedup; ama backend tek otorite.

## 7. Testler (Vitest)

`tests/contributions/`:
- `create-contribution.eligibility.test.ts` — own campaign, ended, suspended, invalid reward, cross-campaign reward.
- `create-contribution.idempotency.test.ts` — aynı key iki çağrı tek row.
- `create-contribution.reward-quantity.test.ts` — concurrency claim.
- `simulate-test-payment.test.ts` — failed→retry→paid, production rejection.
- `progress-aggregate.test.ts` — sadece captured sayılır, initiated/failed sayılmaz.
- `result-polling.test.ts` — URL `?success=true` görmezden gelinir.

## 8. Public aggregate güncelleme

`get_public_campaigns` ve `get_public_campaign_by_slug` halihazırda `status='captured'` filtresi kullanıyor; environment ayrımı (test/live) eklenir. MVP'de test sayılır; production switch'i sonraki fazda.

## 9. Değişecek/yeni dosyalar

```text
supabase/migrations/<ts>_contribution_flow.sql
src/lib/contributions/contributions.functions.ts
src/lib/contributions/types.ts
src/lib/contributions/query-keys.ts
src/lib/contributions/back-flow-store.ts
src/components/back/* (yukarıdaki bileşenler)
src/routes/campaigns.$slug.back.tsx (+ 5 leaf)
src/routes/_authenticated/dashboard.contributions.tsx
src/integrations/supabase/types.ts (regen)
tests/contributions/* (6 dosya)
```

`campaigns.$slug.tsx` detay sayfasına "Destekle" CTA → `/campaigns/$slug/back`.

## 10. Açık riskler / manuel adımlar

- `app.environment` Postgres setting Lovable Cloud preview'da `development`, published'da `production` olarak elle ayarlanmalı (rapor edilecek).
- Şifreleme: pgcrypto + symmetric key gerekiyorsa secret eklenmeli; bu fazda plain text + sıkı RLS yeterli (PII docs notu).
- Gerçek ödeme provider entegrasyonu sonraki faz.
- Test→live data temizliği için future migration gerekecek.
- Refund/ledger detayı ileride.

Kabul kriterleri: para çekilmeden domain akışı tamam, contribution/payment ayrı, idempotency çalışır, own/ended kampanya bloklu, progress yalnız captured agregasyonu, test/live ayrı.
