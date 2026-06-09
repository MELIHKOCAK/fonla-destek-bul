## Faz: Admin Kampanya Review Workflow

Bu faz; admin role koruması, güvenli state transition RPC'leri, review queue/detail UI, audit timeline, creator review status görünümü ve scheduled publish altyapısını ekler. Ödeme akışı, ledger ve admin user yönetimi kapsam dışıdır.

### 1. Admin gate (route + RPC)

`src/routes/_authenticated/_admin/route.tsx` (pathless layout):
- `beforeLoad`: `getAdminContext()` server fn çağır → admin değilse `/unauthorized`'a redirect.
- `component`: `<AdminLayout><Outlet/></AdminLayout>` — sidebar (Inceleme kuyruğu / Geçmiş), mevcut design tokens.
- Mevcut `_authenticated/admin.tsx` silinir; admin index `/admin` artık `_admin/index.tsx`.

Server fn katmanı `src/lib/admin/`:
- `admin.functions.ts`: tüm RPC çağrıları `requireSupabaseAuth` + `assertAdmin(context)` ile sarılır. assertAdmin: `is_admin()` RPC → false ise `throw new Error('FORBIDDEN')`.

### 2. Migration: state machine RPC'leri + scheduled status

Tek migration:
- `campaign_status` enum'a `scheduled` ekle (yoksa).
- `campaigns`'e `reject_reason_code text`, `suspension_reason text` (varsa atla), `review_checklist jsonb` opsiyonel.
- Tüm aşağıdaki fonksiyonlar `SECURITY DEFINER`, `search_path=public`, transaction güvenli, optimistic lock_version artırıcı, `campaign_reviews` + `audit_logs` + `notifications` insert ediyor:

  - `start_campaign_review(_campaign_id, _expected_lock_version)`
    - admin check, status submitted → under_review, idempotent (under_review ise no-op, başka admin claim ettiyse "BFL_CONFLICT_REVIEWER" warning data döner ama yine de devam — claim soft).
  - `request_campaign_revision(_campaign_id, _lock_version, _creator_note, _issues jsonb)`
    - admin, status under_review, note zorunlu (min 10 char), under_review → revision_requested, creator'a notification.
  - `approve_campaign(_campaign_id, _lock_version, _internal_note, _creator_note)`
    - admin, status under_review. Validation: `submit_campaign_for_review` aynı kuralları + cover + ≥1 reward kontrolü tekrarla.
    - start_at > now → status=`scheduled`, approved_at=now. Aksi → status=`live`, published_at=now.
    - Creator notification.
  - `reject_campaign(_campaign_id, _lock_version, _reason_code, _creator_note)`
    - admin, status under_review, reason_code whitelist (`policy`, `incomplete`, `duplicate`, `risk`, `other`), creator_note zorunlu.
  - `suspend_campaign(_campaign_id, _lock_version, _reason)`
    - admin, status live, reason zorunlu, live → suspended, suspension_reason set.
  - `publish_due_campaigns()` 
    - SECURITY DEFINER, herkese GRANT EXECUTE yok (sadece service_role). approved/scheduled + start_at<=now olan kampanyaları FOR UPDATE SKIP LOCKED ile çekip live'a alır; her biri için audit + notification; idempotent (zaten live ise atla).

Tüm RPC'ler `BFL_FORBIDDEN`, `BFL_CONFLICT`, `BFL_INVALID_STATUS`, `BFL_REASON_REQUIRED`, `BFL_VALIDATION:<fields>` errcode'larıyla.

`enforce_campaign_field_locks` zaten admin (is_admin) için bypass ediyor, bu RPC'ler admin context'inde çalışacak.

GRANT EXECUTE: yukarıdaki 5 RPC `authenticated`, `publish_due_campaigns` sadece `service_role`.

### 3. pg_cron + server route: publish_due_campaigns

- `src/routes/api/public/hooks/publish-due-campaigns.ts` server route — POST, `apikey` header ile gelen anon key'i doğrular, `supabaseAdmin.rpc('publish_due_campaigns')` çağırır, sayım döner.
- pg_cron job: her 5 dakikada bir `net.http_post` ile yukarıdaki URL'yi çağırır (cron job SQL ayrı `supabase--insert` çağrısı ile uygulanır, migration değil).

### 4. Server functions (`src/lib/admin/`)

- `listReviewQueue({ status[], categoryId?, search?, cursor, limit })` — projection: id, title, creator (display_name, username), category, submitted_at, goal_amount_minor, status, has_cover, rewards_count, lock_version. Server fn admin guard.
- `getCampaignForReview(campaignId)` — kampanya + media + reward tiers + creator public profile + review_history + audit_history + computed validation summary.
- `getCampaignAuditHistory(campaignId)` — audit_logs filter entity_type='campaign'.
- `startReview`, `requestRevision`, `approve`, `reject`, `suspend` — RPC wrapper'ları, Zod input validation, hata normalizasyonu.
- `getMyCampaignReviewSummary(campaignId)` — creator için `creator_campaign_reviews` view'ı + computed status/reason.

### 5. Admin UI

`src/routes/_authenticated/_admin/`:
- `index.tsx` — `/admin` özet: bekleyen sayıları (submitted, under_review), son aksiyonlar.
- `campaign-reviews.index.tsx` — `/admin/campaign-reviews` queue: filter (status, category, search), pagination, "Eksik kapak/ödül" rozet, "Başka admin inceliyor" ipucu (son review row reviewer_id farklı ve <30dk).
- `campaign-reviews.$campaignId.tsx` — `/admin/campaign-reviews/:id` detay: kampanya içerik tab'ları, media, rewards, creator özeti, validation panel, review history, audit timeline; aksiyonlar: "İncelemeye al" (status=submitted ise), "Düzeltme iste" (form: creator_note + issues checkbox listesi), "Onayla" (internal_note + creator_note + checklist tamam), "Reddet" (reason_code select + creator_note), "Askıya al" (yalnız live, iki aşamalı confirm dialog).
- `campaigns.$campaignId.history.tsx` — `/admin/campaigns/:id/history` audit + review timeline.

Components `src/components/admin/`:
- `AdminLayout`, `ReviewQueueTable`, `ReviewDetailTabs`, `ValidationSummary`, `ReviewHistoryList`, `AuditTimeline`, `RequestRevisionDialog`, `ApproveDialog`, `RejectDialog`, `SuspendDialog` (two-step), `ReviewerLockNotice`.

### 6. Creator dashboard güncellemesi

`src/components/creator/CreatorCampaignList.tsx` ve detay/edit ekranlarına:
- Review status rozeti (submitted/under_review/revision_requested/approved/scheduled/rejected/live/suspended).
- `revision_requested` veya `rejected` ise creator_visible_note + reason_code göster ("Düzenle ve tekrar gönder" CTA).
- Mini review history (createReview row'ları, `creator_campaign_reviews` RPC).
- Notification → ilgili route mapping (edit veya detail).

### 7. Testler (Vitest)

`tests/admin/`:
- `state-transitions.test.ts` — happy path submitted→under_review→revision_requested→submitted→under_review→approved + reject + suspend (mock supabase client'la).
- `validation.test.ts` — reason zorunluluk, reason_code whitelist.
- `route-guard.test.tsx` — non-admin `/admin` → unauthorized redirect.
- `rls-attacker.sh` (mevcut script'i extend): non-admin user direkt RPC çağrısı → `BFL_FORBIDDEN`; creator kendi kampanyasını approve denemesi → fail; duplicate approve idempotent kontrolü.
- `creator-visibility.test.ts` — creator internal_note alanını görmüyor.

### 8. Notifications

Yeni type'lar: `campaign_revision_requested`, `campaign_approved`, `campaign_rejected`, `campaign_suspended`, `campaign_scheduled`, `campaign_live`. Dedupe key: `<type>:<campaign_id>:<lock_version>`.

### 9. Doğrulama (kapanışta)

`bun run tsc --noEmit` (harness otomatik), `bunx vitest run tests/admin`, `scripts/test-rls-attacker.sh`, manuel: admin kullanıcı seed (test admin user_role insert SQL örneği komutta gösterilecek), preview'da queue → review → approve akışı.

### Kapsam dışı

- Payments/refund integration suspend sonrası
- Admin user yönetimi UI (role assign)
- Bulk approve/reject
- Review SLA, otomatik atama
- Audit detay diff viewer (sadece liste; ileride genişler)

### Manuel adımlar

- Admin user seed: `INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin');` — kullanıcıya hatırlatılır.
- pg_cron job'u migration sonrası `supabase--insert` ile kurulacak (anon key + preview URL).
