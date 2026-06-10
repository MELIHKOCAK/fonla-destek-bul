# Faz 16 — Admin Operasyon Paneli

Kapsam çok geniş, riski düşük tutmak için onayınızla **4 alt-PR** olarak teslim ederim. Hiçbir adım finansal kayıtları doğrudan UPDATE eden bir CRUD üretmez — tüm kritik aksiyonlar mevcut state machine / Stripe komutları üzerinden, `reason` zorunlu, idempotent ve `audit_logs`'a yazılarak çalışır.

## Ön koşul kapısı

- `has_role(auth.uid(), 'admin')` zaten var (Faz 0). Tüm admin RPC ve route'lar bunu kullanır.
- `audit_logs`, `idempotency_keys`, `creator_transfers`, `provider_payouts`, `refunds`, `payment_transactions`, `webhook_events`, `campaign_reports` tabloları mevcut — yeniden oluşturulmaz.
- Mevcut state machine: `src/lib/payments/payment-state-machine.server.ts`, Stripe komutları `src/lib/payments/*.functions.ts`. Admin sadece bunları çağırır.

## Alt-PR 1 — Admin shell, guard, dashboard, audit, system-alerts (read-only temel)

**Migration:**
- `is_admin()` SECURITY DEFINER helper (varsa atla).
- `get_admin_dashboard_overview()` RPC: pending reviews, live campaigns, open reports, failed payment/refund/transfer/payout sayıları, unprocessed webhook, reconciliation mismatch, son 20 kritik audit.
- `get_admin_system_alerts()` RPC: reconciliation mismatch + webhook tekrarlı fail + transfer overdue + payout fail.
- `get_admin_audit_log(filters, cursor)` RPC: actor/action/entity/date filtre + maskeli before/after.
- `admin_audit_logs_immutable` trigger: UPDATE/DELETE blokla.

**Routes / dosyalar:**
- `src/routes/_authenticated/_admin/route.tsx` — pathless layout, `beforeLoad` `context.auth.hasRole('admin')` değilse `/unauthorized`.
- `src/routes/_authenticated/_admin/admin.tsx` — `AdminShell` (sidebar + breadcrumb + risk bildirimi).
- `src/routes/_authenticated/_admin/admin.index.tsx`, `admin.audit.tsx`, `admin.system-alerts.tsx`.
- `src/components/admin/AdminShell.tsx`, `AdminSidebar.tsx`, `ConfirmActionDialog.tsx` (reason + type-to-confirm + irreversible warn + loading), `StatCard`, `EmptyState`.
- `src/lib/admin/dashboard.functions.ts`, `audit.functions.ts`, `system-alerts.functions.ts` (hepsi `requireSupabaseAuth` + sunucuda `is_admin` kontrolü).

## Alt-PR 2 — Reviews, Users, Campaigns, Reports

**Migration (RPC + command fns):**
- `get_admin_pending_reviews`, `admin_review_campaign(campaign_id, decision, reason)` — sadece `pending_review` → `approved|rejected`, audit.
- `get_admin_users(query, cursor)` — güvenli alanlar (email maskesi, display_name, status, roles); password yok.
- `admin_set_user_role(user_id, role, action, reason)` — son admin koruması (eğer kaldırılacaksa `count(admin)>1` kontrolü), audit.
- `admin_set_user_status(user_id, status, reason)` — ban/suspend; `users_status` enum yoksa eklenir.
- `get_admin_campaigns(filters)`, `admin_suspend_campaign(id, reason)`, `admin_cancel_campaign(id, reason)` — mevcut campaign state machine fonksiyonunu çağırır, dropdown ile status set ETMEZ.
- `get_admin_reports(status)`, `admin_assign_report`, `admin_resolve_report(action, reason)`, `admin_hide_comment(comment_id, reason)`.

**Routes:** `admin.reviews.tsx`, `admin.users.tsx`, `admin.users.$id.tsx`, `admin.campaigns.tsx`, `admin.campaigns.$id.tsx`, `admin.reports.tsx`, `admin.reports.$id.tsx`.

## Alt-PR 3 — Payments / Refunds / Transfers / Payouts / Webhooks (read-only tablo + komutlar)

**Sadece okuma RPC'leri** (maskeli, internal stripe id yok kullanıcıya):
- `get_admin_payments`, `get_admin_refunds`, `get_admin_creator_transfers`, `get_admin_provider_payouts` (ayrı RPC), `get_admin_webhook_events`.

**Komut fonksiyonları (hepsi mevcut Faz 13 komutlarını sarar, idempotency key zorunlu, reason zorunlu):**
- `admin_retry_payment_sync(payment_id, reason)`
- `admin_create_refund(payment_id, amount, reason)` / `admin_retry_refund(refund_id, reason)`
- `admin_create_creator_transfer(campaign_id, reason)` / `admin_retry_creator_transfer(id, reason)`
- `admin_create_transfer_reversal(transfer_id, amount, reason)`
- `admin_replay_webhook(event_id, reason)` — sadece `signature_valid=true` ve idempotent path.
- Provider Payout için `admin_reconcile_provider_payout(id, reason)` — manuel `completed` YOK; sadece Stripe'tan sync.

**UI kuralı:** Hiçbir tabloda status dropdown YOK. Aksiyonlar `ConfirmActionDialog` ile.

**Routes:** `admin.payments.tsx`, `admin.refunds.tsx`, `admin.transfers.tsx`, `admin.payouts.tsx`, `admin.webhooks.tsx`. Raw payload default gizli, "Reveal" butonu audit'e yazar.

## Alt-PR 4 — Fees, Categories, Content

- `platform_fee_configs` tablosu (varsa kullan, yoksa migrate): `effective_from`, `fee_bps`, `created_by`, `reason`. Future-dated; geçmiş `campaign_settlements` snapshot etkilenmez (zaten kayıtlı).
- `admin_create_fee_config(effective_from, fee_bps, reason)` — `fee_bps 0..2000`, `effective_from > now()`, two-step confirm UI.
- Categories: `admin_create_category`, `admin_update_category`, `admin_deactivate_category` (silme yok; referans varsa deactivate). Slug unique.
- Static content: `static_pages` (slug, title, body, status: draft|published), `admin_save_static_page(reason)`. Legal "approved" Faz 20 onayına bağlı — UI'da uyarı.

**Routes:** `admin.fees.tsx`, `admin.categories.tsx`, `admin.content.tsx`.

## Sidebar nav linkleri (tüm PR'larda büyüyen)

Dashboard, Reviews, Users, Campaigns, Reports, Payments, Refunds, Transfers, Payouts, Webhooks, Fees, Categories, Content, Audit, System Alerts.

## Testler (Vitest)

- Normal user her admin RPC'sini çağırdığında 403/permission denied.
- `admin_review_campaign` reason boşsa reject; idempotent (aynı decision 2. çağrı no-op).
- `admin_set_user_role` son admin'i kaldırmaya çalışırsa reject.
- `admin_create_refund` aynı idempotency key ile 2. çağrı yeni Stripe call yapmaz, aynı refund_id döner.
- `admin_create_creator_transfer` ve `admin_reconcile_provider_payout` ayrı RPC; transfer kaydı payout tablosuna yazılmaz.
- `admin_replay_webhook` `signature_valid=false` reject; valid + zaten processed → ledger duplicate üretmez.
- `admin_create_fee_config` `effective_from <= now()` reject; mevcut settlement snapshot değişmez.
- Audit entry her başarılı/başarısız komutta yazılır (`status=success|failed`, masked diff).
- `audit_logs` UPDATE/DELETE trigger ile bloklu.
- Mobile: AdminShell drawer açılır, ConfirmActionDialog scroll'lanır.

## Kapsam dışı (bu fazda yapılmaz)

- MFA zorunlu (Faz 20/21), CSV export, e-posta bildirim, real-time push, KYC override, manuel ledger insert UI.

## Doğrulama

`bun run typecheck`, `bun run build`, `bun run lint`, `bunx vitest run src/lib/admin src/components/admin`.

## Manuel yapılacaklar

- Test kullanıcısına `admin` rolü atama (insert tool).
- Stripe sandbox'ta replay/refund/transfer komutlarını uçtan uca dene.
- `audit_logs` retention politikasını DBA ile netleştir (bu fazda 0 satır silme).

## Açık riskler

- Provider Payout komutu Stripe Connect account config'ine bağlı — bazı connected account'larda platform tarafından yönetilemez; UI o satırlarda "Read-only (Stripe-managed)" rozeti gösterir.
- `audit_logs` büyüme hızı izlenmeli; bu fazda partition eklenmez.

---

**Onay verirseniz Alt-PR 1 ile başlıyorum** (shell + guard + dashboard + audit + system-alerts). Her PR sonunda type-check/build/lint/test çalıştırıp rapor ederim, sonra bir sonrakine geçerim. Hepsini tek seferde ister misiniz, yoksa PR-by-PR onay mı tercih edersiniz?
