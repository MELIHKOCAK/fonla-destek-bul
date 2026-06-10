# Faz 17 — In-app bildirim ve transactional email (outbox tabanlı, retry-safe)

## Ön koşul kapısı

- `notifications` tablosu mevcut (`dedupe_key` unique index var) — yeniden oluşturulmaz, sadece okunur ve INSERT'lenir.
- Mevcut RLS: kullanıcı sadece kendi bildirimlerini okur/günceller — korunacak.
- Faz 15'te `mark_notification_read` / `mark_all_notifications_read` zaten yazıldı (varsayım: var; yoksa eklenecek).
- E-posta sağlayıcısı için **Lovable Cloud built-in e-posta** kullanılacak (Resend/SendGrid değil). Domain doğrulanmamışsa: scaffold yapılır ama gerçek gönderim durmuş kalır; `email_deliveries.status = 'pending_provider'` ile beklemede tutulur, e-posta hatası business state'i geri almaz.

## Mimari özet

```
business txn ──► outbox row (notification_events) ──┐
                                                     │
                                          claim worker (server fn + pg_cron)
                                                     │
                            ┌────────────────────────┴────────────┐
                            │                                     │
                    insert notifications row              insert email_deliveries
                    (dedupe key unique)                   (dedupe key unique)
                                                                  │
                                                          provider send (idempotent)
                                                                  │
                                                  success → status=sent
                                                  retriable → backoff
                                                  permanent → status=dead_letter
```

Outbox INSERT business transaction içindedir; her şey ondan sonra ayrı işlemde çalışır. E-posta hatası ödeme/kampanya state'ini etkilemez.

## Migration (tek dosya)

1. `notification_event_type` enum (kapsamdaki 24 olay).
2. `notification_channel` enum: `in_app`, `email`.
3. `notification_outbox` tablosu:
   - `id`, `event_type` (enum), `entity_type`, `entity_id`, `recipient_user_id`, `payload jsonb` (minimum/maskelenmiş), `dedupe_key text UNIQUE`, `status` (`pending`|`processing`|`done`|`failed`|`skipped`), `attempt_count`, `next_attempt_at`, `last_error`, `correlation_id`, `created_at`, `updated_at`.
   - Indexes: `(status, next_attempt_at)`, `(entity_type, entity_id)`.
4. `email_deliveries` tablosu:
   - `id`, `outbox_id` FK, `recipient_email` (maskelenecek logda), `template_name`, `template_data jsonb`, `dedupe_key UNIQUE`, `status` (`queued`|`sent`|`failed`|`dead_letter`|`bounced`|`suppressed`|`pending_provider`), `attempt_count`, `next_attempt_at`, `provider_message_id`, `last_error`, `sent_at`, `created_at`, `updated_at`.
5. `notification_preferences` tablosu:
   - `user_id PK`, `transaction_email boolean default true` (kritik finansal sınıfı override edilemez — uygulama katmanında zorlanır), `campaign_updates_email boolean default true`, `marketing_email boolean default false`, `updated_at`.
   - Trigger: yeni `auth.users` insert'inde default satır.
6. **RPC'ler:**
   - `notify_enqueue(event_type, entity_type, entity_id, recipient_user_id, payload, dedupe_key, correlation_id)` — SECURITY DEFINER, idempotent INSERT (`ON CONFLICT (dedupe_key) DO NOTHING`), service_role + business RPC'ler tarafından çağrılır.
   - `notify_claim_batch(p_limit)` — SELECT ... FOR UPDATE SKIP LOCKED, status='processing' set; sadece `service_role`.
   - `notify_mark_done(p_id)`, `notify_mark_failed(p_id, p_error, p_retriable)` — sadece `service_role`.
   - `get_notification_preferences()` ve `update_notification_preferences(...)` — auth.uid scoped.
   - `get_unread_notification_count()` — zaten dashboard'da olabilir; yoksa eklenir.
   - `mark_notification_read(p_id)` / `mark_all_notifications_read()` — varsa skip.
7. GRANT'ler: tüm tablolarda authenticated için yalnız okuma (kendi preferences/notifications), service_role tam erişim. RLS aç. Outbox/email_deliveries için **authenticated rolüne hiçbir policy yok** — sadece service_role / SECURITY DEFINER ile erişilir. Admin için ayrı admin policy (`is_admin()`).
8. Business RPC entegrasyonu — bu fazda **wire'lanan olaylar (önce kritik 8):**
   - `payment_succeeded`, `payment_failed`, `payment_action_required`
   - `refund_started`, `refund_completed`
   - `creator_transfer_completed`, `creator_transfer_failed`
   - `campaign_approved`, `campaign_rejected`, `campaign_revision_requested`, `campaign_published`
   - `campaign_update_published`
   
   Her biri mevcut state-transition fonksiyonu içine `PERFORM notify_enqueue(...)` çağrısı eklenir, **payload maskelenmiş**: Stripe internal id, card brand, charge id, customer email yok; sadece `campaign_id`, `amount_minor`, `currency`, kullanıcıya görünür slug/title.
   
   Geriye kalan olaylar (`registration_completed`, `contribution_created`, `payment_session_expired`, `campaign_goal_reached`, `campaign_failed`, `transfer_reversal_*`, `provider_payout_*`, `creator_comment_reply`) sonraki alt-PR olarak işaretlenir; şu an enum'a girer ama emitter yazılmaz. Plan'da açıkça belirtilir.

## Worker (server route — cron-callable)

`src/routes/api/public/hooks/process-notification-outbox.ts`:
- `apikey` header = Supabase anon ile gate (cron pattern).
- `supabaseAdmin` ile `notify_claim_batch(25)` çağırır.
- Her event için:
  - In-app: `notifications` INSERT (`dedupe_key` = `<event>:<entity>:<user>:in_app`). Conflict → skip ama outbox done.
  - Email: preference kontrolü (`transaction_email` + critical override list). `email_deliveries` INSERT (`dedupe_key` = `<event>:<entity>:<user>:email`). Sonra adapter `sendEmail(...)`.
- Sonuç → `notify_mark_done` veya `notify_mark_failed(retriable=true|false)` (HTTP 4xx → permanent, 5xx/timeout → retriable, exponential backoff: `next_attempt_at = now() + (attempt_count^2 * 1 min)`, max 6).
- E-posta hata yutmaz; **outbox done olur** (notification yapıldı) ama `email_deliveries.status` ayrı izlenir. Email failure asla business state'i etkilemez.

`pg_cron` her dakikada bir worker'ı çağırır (anon key ile).

## Email adapter

`src/lib/notifications/email-provider.ts`:
- `LOVABLE_EMAIL_FROM` env + Lovable email infra varsa send route (`/lovable/email/transactional/send`) çağırır.
- Yoksa `console.info` ile log + status `pending_provider` (faz 17.5 için manuel queue). Asla "gönderildi" demez.
- Adapter çıktısı: `{ outcome: 'sent'|'retriable'|'permanent'|'skipped_no_provider', providerMessageId?, error? }`.

## Email template registry

`src/lib/notifications/templates/`:
- `payment-succeeded.ts`, `payment-failed.ts`, `payment-action-required.ts`, `refund-started.ts`, `refund-completed.ts`, `creator-transfer-completed.ts` (**banka Payout DEĞİL** — net Türkçe: "platformdan hesabınıza aktarım tamamlandı"), `creator-transfer-failed.ts`, `campaign-approved.ts`, `campaign-rejected.ts`, `campaign-revision-requested.ts`, `campaign-published.ts`, `campaign-update-published.ts`.
- Her şablon: `{ subject, preheader, text, html }` (Türkçe, brand token'lar, semantic HTML, hiçbir Stripe id yok, formatlanmış tutar). Sandbox modda subject `[TEST]` prefix.
- Marketing footer YOK. Kritik bildirimlerde unsubscribe linki YOK.

## In-app UI

- `src/components/notifications/NotificationBell.tsx` — header'da unread badge, popover ile son 10. Mevcut header'a takılır (varsa)
- `src/routes/_authenticated/notifications.tsx` mevcut — sayfalama + mark all read + tip ikonu + deep link genişletilir.
- `src/components/notifications/NotificationItem.tsx` — tip → ikon eşlemesi.

## Settings entegrasyonu

- `/settings/notifications` yeni route — `notification_preferences` formu. Kritik finansal bildirim toggle'ı disabled + açıklama: "Yasal/güvenlik nedeniyle kapatılamaz".

## Testler (Vitest)

- `notify_enqueue` aynı `dedupe_key` ile 2 kez → 1 outbox satırı.
- Outbox processed → 1 notifications + (preference açıksa) 1 email_deliveries; tekrar processed → INSERT conflict, duplicate yok.
- E-posta provider 500 → outbox done, email_deliveries `failed` + attempt+1; retry; 6. attempt → `dead_letter`.
- E-posta provider 4xx (invalid email) → permanent `dead_letter`, retry yok.
- `marketing_email=false` → `payment_succeeded` email yine gönderilir (kritik override).
- `transaction_email=false` → kritik finansal (payment/refund/transfer) yine gönderilir, ama `campaign_update_published` skip.
- Yanlış kullanıcı SELECT → RLS reject.
- Payload masking: template'ler `stripe_*` / `customer_email` / `pan` / `cvv` içermez (snapshot test).
- `creator_transfer_completed` template'i "banka" / "payout" kelimelerini içermez.
- `payment_session_expired` enum'da var, emitter yok (tracked TODO, test sadece var olduğunu kontrol eder).
- Sandbox flag → subject `[TEST]` prefix.
- Business RPC: e-posta provider throw → ödeme transaction commit olur (mock provider ile integration test).
- `mark_notification_read` başka user'ın id'siyle → reject.

## Out of scope

- Bounce/complaint webhook adapter (Faz 17.5).
- Push notification.
- Geriye kalan 12 event emitter (Faz 17.5).
- Admin UI'dan manuel retry — `/admin/system-alerts` zaten failed transfer/payout gösteriyor; ayrı notification retry UI Faz 17.5.

## Manuel adımlar

- E-posta domain doğrulamasını Lovable Cloud → Emails altında tamamla. Doğrulanmamışsa `email_deliveries.status = 'pending_provider'` kalır.
- `pg_cron` job: `select cron.schedule('process-notification-outbox', '* * * * *', $$select net.http_post(...)$$);` — migration içinde yer alır.

## Doğrulamalar

`bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bunx vitest run src/lib/notifications`.

## Açık riskler

- E-posta domain yokken gerçek gönderim olmaz — `pending_provider` rows birikir; faz 17.5'te re-queue mekanizması.
- `pg_cron` her dakikada bir çağrılır; yüksek yük altında batch limit (25) yeterli olmayabilir.
- Geriye kalan 12 event emitter eklenene kadar UX eksik.

---

Onayla devam edeyim mi? Onay sonrası tek mesajda migration + worker + adapter + templates + UI + tests'i uygularım.
