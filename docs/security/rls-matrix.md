# BeniFonla — RLS / Yetkilendirme Matrisi (Faz 8)

Bu doküman, `public` şemasındaki tüm tablolar ve Storage bucket'ları için
Row-Level Security politikalarını, amaçlarını ve regresyon testlerini
belgeler. Matris **deny-by-default** prensibine dayanır: politika
tanımlanmayan her işlem reddedilir.

## Roller

| Rol | Tanım |
| --- | --- |
| `anon` / guest | Giriş yapmamış ziyaretçi (PostgREST `anon` rolü). |
| `auth-owner` | Giriş yapmış; sorgulanan kaydın sahibi (`auth.uid() = ...`). |
| `auth-non-owner` | Giriş yapmış; sahibi olmadığı bir kaydı sorguluyor. |
| `creator-owner` | Kampanya sahibi (`campaigns.creator_id = auth.uid()`). |
| `admin` | `user_roles` tablosunda `role = 'admin'` olan kullanıcı. |
| `service_role` | Edge Function / sunucu tarafı; RLS bypass eder. |

> Notasyon: ✅ izinli, ❌ reddedildi, 🔒 yalnız view/RPC üzerinden,
> ⚙️ trigger ile kolon kilidi uygulanır.

## Helper fonksiyonlar

| Fonksiyon | Tip | Amaç | Execute |
| --- | --- | --- | --- |
| `public.has_role(uuid, user_role)` | SECURITY DEFINER, STABLE | Rol kontrolü; `user_roles` üzerinde recursion'a girmez. | `authenticated` |
| `public.is_admin()` | SECURITY DEFINER, STABLE | `has_role(auth.uid(), 'admin')` kısayolu. | `authenticated` |
| `public.campaign_is_public(uuid)` | SECURITY DEFINER, STABLE | Kampanya `status IN ('live','successful')` mı? | `anon, authenticated` |
| `public.campaign_owned_by_me(uuid)` | SECURITY DEFINER, STABLE | Çağıran kampanyanın creator'ı mı? | `authenticated` |
| `public.campaign_status(uuid)` | SECURITY DEFINER, STABLE | Storage policy'lerinde kullanılır. | `authenticated` |
| `public.check_username_available(citext)` | SECURITY DEFINER, STABLE | Onboarding | `anon, authenticated` |
| `public.claim_username(citext)` | SECURITY DEFINER | Onboarding | `authenticated` |

Diğer tüm `public.*` fonksiyonlardan `EXECUTE` `public, anon`'dan kaldırılır.

---

## Tablo bazında matris

### `categories` (public referans)

| İşlem | anon | auth | admin | Policy |
| --- | --- | --- | --- | --- |
| SELECT | ✅ (is_active=true) | ✅ | ✅ | `categories_public_read_active` |
| INSERT/UPDATE/DELETE | ❌ | ❌ | 🔒 service_role | – |

Test: `RLS-CAT-01` guest aktif kategori görür; pasif kategoriyi göremez.

### `profiles`

| İşlem | anon | self | other-public | other-private | admin |
| --- | --- | --- | --- | --- | --- |
| SELECT | ❌ (yalnız view) | ✅ self | 🔒 `profiles_public` view | ❌ | ✅ |
| INSERT | ❌ | ❌ (trigger) | – | – | – |
| UPDATE | ❌ | ✅ ⚙️ kolon kilidi | ❌ | ❌ | – |
| DELETE | ❌ | ❌ | – | – | – |

`profiles_public` view (security_invoker): id, username, display_name, bio,
avatar_path, website_url, location, created_at. Yalnız `is_public=true` satırlar.

Kolon kilidi trigger'ı (`enforce_profile_field_locks`): `id`, `created_at`
değiştirilemez. `username` formatı doğrulanır (reserved/regex).

Testler: `RLS-PROF-01..05`.

### `user_roles`

| İşlem | anon | self | other | admin |
| --- | --- | --- | --- | --- |
| SELECT | ❌ | ✅ self | ❌ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ❌ | ❌ (yalnız service_role) |

Policy: `user_roles_self_read`, `user_roles_admin_read`. Yazma yok.

Test: `RLS-ROLE-01` kullanıcı kendine admin rolü insert edemez.

### `campaigns`

| İşlem | anon | creator-owner | auth-non-owner | admin |
| --- | --- | --- | --- | --- |
| SELECT (live/successful) | ✅ | ✅ | ✅ | ✅ |
| SELECT (diğer statüler) | ❌ | ✅ | ❌ | ✅ |
| INSERT | ❌ | ✅ (status=draft, timestamp'lar NULL) | – | – |
| UPDATE | ❌ | ✅ ⚙️ kolon kilidi (yalnız draft/revision_requested) | ❌ | ❌ (state machine ile) |
| DELETE | ❌ | ❌ | ❌ | ❌ |

Policies:
- `campaigns_public_read_visible` — SELECT `public`: `status IN ('live','successful')`.
- `campaigns_creator_read_own` — SELECT `authenticated`: `creator_id = auth.uid()`.
- `campaigns_admin_read_all` — SELECT `authenticated`: `is_admin()`.
- `campaigns_creator_insert_draft` — INSERT `authenticated`: WITH CHECK draft + creator_id self + timestamp'lar NULL.
- `campaigns_creator_update_editable` — UPDATE `authenticated`: USING + WITH CHECK creator self + status ∈ {draft, revision_requested}.

Trigger `enforce_campaign_field_locks`: creator update'inde `creator_id, status,
submitted_at, approved_at, published_at, closed_at, cancellation_reason,
suspension_reason, lock_version` değişimi reddedilir. Admin/service_role
muaftır (`current_setting('role')` veya `is_admin()` kontrolü ile değil;
trigger sadece `auth.uid() = creator_id` olduğunda kilidi uygular —
service_role'de `auth.uid()` NULL'dur).

Testler: `RLS-CAMP-01..08`.

### `campaign_media`

| İşlem | anon | creator-owner | other-creator | admin |
| --- | --- | --- | --- | --- |
| SELECT (parent live/successful) | ✅ | ✅ | ✅ | ✅ |
| SELECT (parent draft vb.) | ❌ | ✅ | ❌ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ✅ (parent draft/revision_requested) | ❌ | ❌ |

Policies: `campaign_media_public_read`, `campaign_media_owner_read`,
`campaign_media_admin_read`, `campaign_media_owner_write`,
`campaign_media_owner_update`, `campaign_media_owner_delete`.

Testler: `RLS-MEDIA-01..03`.

### `reward_tiers`

| İşlem | anon | creator-owner | admin |
| --- | --- | --- | --- |
| SELECT | ✅ (is_active AND parent public) | ✅ tümü | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ✅ (parent draft/revision_requested) | ❌ |

Testler: `RLS-REWARD-01..02`.

### `campaign_updates`

| İşlem | anon | creator-owner | admin |
| --- | --- | --- | --- |
| SELECT | ✅ (is_published AND parent public) | ✅ tümü | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ✅ (parent live/successful, author_id=self) | ❌ |

Testler: `RLS-UPDATE-01`.

### `campaign_reviews` (admin-internal)

| İşlem | anon | creator | admin |
| --- | --- | --- | --- |
| SELECT raw | ❌ | ❌ | ✅ |
| SELECT creator_visible_notes | – | 🔒 `creator_campaign_reviews` view | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ❌ (yalnız service_role / SECURITY DEFINER) |

Yeni kolon: `creator_visible_notes text`. `notes` alanı internal kalır.
View `creator_campaign_reviews` security_invoker; `campaign_owned_by_me`
filtresi.

Test: `RLS-REVIEW-01` non-admin internal `notes`'a erişemez.

### `favorites`

| İşlem | anon | self | other |
| --- | --- | --- | --- |
| SELECT | ❌ | ✅ | ❌ |
| INSERT | ❌ | ✅ (user_id=self) | ❌ |
| UPDATE | ❌ | ❌ | ❌ |
| DELETE | ❌ | ✅ | ❌ |

Composite PK `(user_id, campaign_id)` duplicate'i engeller.

Test: `RLS-FAV-01..02`.

### `notifications`

| İşlem | anon | self | other | admin |
| --- | --- | --- | --- | --- |
| SELECT | ❌ | ✅ | ❌ | ❌ (servis tarafı) |
| UPDATE | ❌ | ✅ ⚙️ yalnız `read_at` | ❌ | ❌ |
| INSERT/DELETE | ❌ | ❌ | ❌ | 🔒 service_role |

Trigger `notifications_lock_fields`: `user_id, type, title, body, data,
dedupe_key, created_at` değiştirilemez.

Test: `RLS-NOTIF-01..02`.

### `contributions` (PII içerir → raw erişim kapalı)

| İşlem | anon | backer-self | creator-of-campaign | admin |
| --- | --- | --- | --- | --- |
| SELECT raw | ❌ | ❌ | ❌ | ✅ |
| SELECT via view | – | 🔒 `my_contributions` | 🔒 `campaign_contributions_for_creator` | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ❌ | 🔒 service_role |

View projection'larında `contact_email_encrypted, shipping_address_encrypted,
idempotency_key` yer almaz.

Test: `RLS-CONTRIB-01..03`.

### Finans tabloları

`payment_transactions`, `refunds`, `payouts`, `platform_fees`,
`financial_ledger_entries`, `webhook_events`, `idempotency_keys`.

| İşlem | anon / auth | admin | service_role |
| --- | --- | --- | --- |
| SELECT | ❌ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |

`financial_ledger_entries`, `webhook_events`, `idempotency_keys` zaten
append-only trigger ile korunur (admin dahi update edemez).

Test: `RLS-FIN-01..03`.

### `audit_logs`

| İşlem | anon / auth | admin | service_role |
| --- | --- | --- | --- |
| SELECT | ❌ | ✅ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ insert; update/delete trigger ile yasak |

Test: `RLS-AUDIT-01`.

---

## Storage bucket matrisi

### `avatars` (private)

| İşlem | anon | self-path | other-path |
| --- | --- | --- | --- |
| SELECT | ❌ | ✅ | ❌ |
| INSERT/UPDATE/DELETE | ❌ | ✅ (`<uid>/...`) | ❌ |

Avatar görüntüleme signed URL üzerinden yapılır (Faz 7).

### `campaign-media` (private)

Path konvansiyonu: `<campaign_id>/<uuid>.<ext>`. Policy `(storage.foldername(name))[1]::uuid`
ile `campaign_id` çıkartır.

| İşlem | anon | creator-owner | other-creator | admin |
| --- | --- | --- | --- | --- |
| SELECT (parent public) | ✅ | ✅ | ✅ | ✅ |
| SELECT (parent draft) | ❌ | ✅ | ❌ | ✅ |
| INSERT/UPDATE/DELETE | ❌ | ✅ (parent draft/revision_requested) | ❌ | ❌ |

Test: `RLS-STORAGE-01..03` (path spoofing, draft sızıntısı).

---

## Test ID dizini

`src/test/security/rls.test.ts` içindeki testler bu ID'leri describe/it
adlarında kullanır:

- `RLS-CAT-01`
- `RLS-PROF-01..05`
- `RLS-ROLE-01`
- `RLS-CAMP-01..08`
- `RLS-MEDIA-01..03`
- `RLS-REWARD-01..02`
- `RLS-UPDATE-01`
- `RLS-REVIEW-01`
- `RLS-FAV-01..02`
- `RLS-NOTIF-01..02`
- `RLS-CONTRIB-01..03`
- `RLS-FIN-01..03`
- `RLS-AUDIT-01`
- `RLS-STORAGE-01..03`

## Açık riskler

- `campaign_is_public` çağrısı her storage SELECT'te DB hit'i üretir;
  ileride CDN/signed URL stratejisine geçilebilir.
- `contact_email_encrypted` ve `shipping_address_encrypted` alanları
  şu anda yalnız isim olarak şifreli; gerçek şifreleme Faz 10+'a bırakıldı.
  RLS bu fazda tabloya erişimi tamamen kapatır.
- `campaign-documents` bucket'ı henüz tanımsız; ileri fazda creator+admin
  kapalı bir bucket olarak eklenecek.
- Admin paneli UI yok; testler doğrudan supabase-js ile koşulur.
