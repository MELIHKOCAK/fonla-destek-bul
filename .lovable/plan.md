# Faz 15 — User & Creator Dashboard (Server-Side Projection)

Mevcut iskelete (`dashboard.tsx`, `dashboard.contributions.tsx`, `creator.*`, `settings.*`, `notifications.tsx`, `creator.payment-account.tsx`) ek olarak eksik route'ları, server function'ları ve RPC'leri ekleyeceğim. Tüm aggregate/finansal hesaplar Postgres tarafında, RLS + `auth.uid()` ile.

## 1. Database — yeni RPC'ler (migration)

Tüm fonksiyonlar `security definer`, `search_path=public`, parametre olarak `user_id`/`campaign_id` ALMAZ — `auth.uid()` kullanır (creator versiyonları campaign_id alır + ownership doğrular). Aggregate exact column projeksiyonu döner.

- `get_user_dashboard_overview()` → total_paid_minor, active_supported_count, pending_refund_minor, expected_rewards_count, unread_notifications
- `get_user_contributions(p_limit, p_offset, p_status_filter)` → campaign safe identity + amount + status + reward + payment safe state + sandbox/live flag
- `get_user_payments(p_limit, p_offset)` → payment attempt safe state, NO provider internal IDs
- `get_user_refunds(p_limit, p_offset)` → refund amount, status, requested_at
- `get_user_rewards()` → reward tier + campaign + estimated_delivery + fulfillment_status (varsa)
- `get_user_favorites(p_limit, p_offset)` (favori tablosu üzerinden)
- `get_creator_overview()` → owned campaign status dağılımı, active summary, verified raised, backer count, recent contributions safe feed, review action items, connected account readiness özeti, transfer/refund/payout summary
- `get_creator_campaign_overview(p_campaign_id)` (ownership check)
- `get_creator_campaign_analytics(p_campaign_id, p_from, p_to)` → günlük verified funding series + backer series + reward tier distribution. Sorgu indexli.
- `get_creator_campaign_backers(p_campaign_id, p_limit, p_offset)` → contribution amount, reward, public display name veya "Anonim Destekçi", safe status, fulfillment min info. Email/card/provider secret YOK.
- `get_creator_campaign_finance(p_campaign_id)` → gross_confirmed, stripe_refunds, provider_fee_estimated, provider_fee_final, platform_fee, net_creator_transferable, latest_transfer{status, amount, created_at}, latest_provider_payout{status, arrival_date} (ayrı alan). Estimate vs finalized flag.
- `get_creator_campaign_reviews(p_campaign_id)` → creator-facing revision notes + history (internal admin note FILTERED).
- `mark_notification_read(p_id)` / `mark_all_notifications_read()`
- `update_notification_preferences(p_prefs jsonb)`
- Index ekleri: `contributions(campaign_id, status, created_at)`, `creator_transfers(campaign_id, created_at desc)`, `notifications(user_id, read_at)`, `provider_payouts(connected_account_id, arrival_date)`.

Tüm RPC'lere `GRANT EXECUTE TO authenticated`; `revoke from anon`.

## 2. Server functions (`src/lib/dashboard/*.functions.ts`, `src/lib/creator/*.functions.ts`)

Hepsi `.middleware([requireSupabaseAuth])` ve sadece yukarıdaki RPC'leri çağırır. Hiçbir client param `user_id` kabul etmez. Creator fn'leri `p_campaign_id` alır; RPC ownership doğrular ve yetkisizse `unauthorized` döner → route 404'e map eder.

`src/lib/dashboard/queries.ts`, `src/lib/creator/queries.ts` — `queryOptions` tanımları (query key'ler implicit auth, user id YOK).

## 3. Yeni route'lar (`src/routes/_authenticated/`)

Eksik olanlar:
- `dashboard.payments.tsx`
- `dashboard.refunds.tsx`
- `dashboard.rewards.tsx`
- `dashboard.favorites.tsx`
- `settings.security.tsx` (parola değiştir, oturum sonlandır)
- `creator.index.tsx` (creator overview)
- `creator.campaigns.$campaignId.overview.tsx`
- `creator.campaigns.$campaignId.analytics.tsx`
- `creator.campaigns.$campaignId.backers.tsx`
- `creator.campaigns.$campaignId.finance.tsx`
- `creator.campaigns.$campaignId.review.tsx`

Mevcut `dashboard.tsx` overview kartlarına dönüştürülür; `dashboard.contributions.tsx`, `notifications.tsx`, `settings.*`, `creator.payment-account.tsx`, `creator.campaigns.*` korunur ve yeni projection RPC'leriyle güçlendirilir.

Her route Query default şablonu: loader `ensureQueryData(queryOptions)`, component `useSuspenseQuery`. `errorComponent` + `notFoundComponent` zorunlu. Loader'lar `createServerFn` çağırır.

Creator campaign route'larında ownership fail → `throw notFound()` (private campaign existence sızdırmamak için).

## 4. Shell & navigation (`src/components/dashboard/`)

- `DashboardShell.tsx` — responsive sidebar (desktop) + `Sheet` (mobile), `Breadcrumb`.
- `DashboardSidebar.tsx` — user link grubu + creator link grubu (creator role veya owned campaign varsa).
- `CreatorCampaignTabs.tsx` — `$campaignId` route'ları arası tab navigation.
- Klavye erişimi, görünür focus state, semantic `<nav>`, `aria-current="page"`.

## 5. UI bileşenleri

- `StatCard`, `EmptyState`, `LoadingSkeleton`, `ErrorState` — paylaşılan.
- `FundingSeriesChart`, `BackerSeriesChart`, `RewardTierDistribution` — Recharts + erişilebilir `<table>` text summary (sr-only veya expandable).
- `FinanceBreakdown` — Transfer / Payout AYRI başlık. Net etiketler: "Creator'a aktarılabilir net tutar", "Stripe hesabına Transfer", "Banka Payout'u". Estimate vs Finalized badge.
- `ContributionStatusBadge`, `PaymentEnvironmentBadge` (sandbox/live).
- `BackerRow` — anonymous handling.
- `NotificationItem` — mark-as-read mutation + deep link.

Para gösterimi `formatMinorAmount` (mevcut `src/lib/money.ts`); kuruş → TRY.

## 6. Privacy guard'ları

- Hiçbir response shape Stripe Checkout Session/PaymentIntent/Charge/Refund ID, webhook payload, fraud score, başka kullanıcı bilgisi, email içermez. TypeScript tip yalnız izinli alanları içerir.
- `select` kolon listeleri SQL'de explicit; `select *` yok.
- Backer list "Anonim Destekçi" label; anonymous contribution display_name döndürmez.

## 7. Test'ler (`src/**/__tests__`)

Vitest + RTL + mock Supabase RPC:
- `user_a` `user_b` dashboard RPC'sini çağıramaz (mock auth değişimi → boş set).
- `creator_a` kendi campaign analytics görür; `creator_b`'nin campaign_id'siyle çağrı 404.
- Finance toplamı ledger fixture'ı ile birebir eşleşir.
- Transfer vs Payout farklı kartlarda render.
- Connected account readiness yalnız owner.
- Anonymous contribution display_name "Anonim Destekçi".
- Response object snapshot'larda Stripe internal alan YOK (anahtar denetimi).
- Chart empty/loading/error state render.
- Mobile nav (`Sheet`) açılır.
- `mark_all_notifications_read` yalnız kendi notif'lerini etkiler.

## 8. Out of scope

- Kargo entegrasyonu.
- Admin raw ledger / webhook UI.
- Yeni ödeme akışları, yeni state machine (Faz 13'ün üzerine inşa).
- Sosyal paylaşım eklemeleri.
- Realtime push (notification listener yalnız refetch on focus).

## 9. Doğrulama

`bun run typecheck`, `bun run build`, `bun run lint`, `bunx vitest run src/lib/dashboard src/lib/creator src/components/dashboard`. Hatalar gizlenmeyecek.

## 10. Manuel adımlar

- Migration onayı.
- Creator role atama (mevcut `user_roles` üzerinden) — yeni creator için `creator` rolünün doğru atandığı doğrulanır.
- Stripe sandbox/live ortam değişiminde badge'in doğru göründüğünün QA'i.

## 11. Açık riskler

- Analytics RPC'sinin büyük campaign'lerde performansı; index'lere rağmen 30+ günlük seriye `EXPLAIN` koşulması gerekebilir.
- Finance summary'de Transfer henüz tamamlanmadan Payout observation eksik olursa UI "veri yok" şeklinde gösterir; sahte tahmin yapılmaz.
- Notification preference şeması ileride genişlerse JSON migration gerekli.

Onaylarsanız uygulamaya başlıyorum.
