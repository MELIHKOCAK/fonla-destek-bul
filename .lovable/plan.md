## Faz 8 — RLS/Yetkilendirme Sertleştirme Planı

Bu faz **sadece güvenlik** içindir: yeni özellik yok, mevcut UI/akış değişmez. Hâlihazırda yalnız `categories`, `profiles`, `user_roles` için politika tanımlı; diğer 16 tabloda RLS açık ama **politika yok → deny-by-default**. Bu plan eksik politikaları doldurur, mevcutları sıkılaştırır, storage'ı tamamlar ve testler ekler.

### 1. Dokümantasyon — `docs/security/rls-matrix.md`

Her tablo için tablo: `guest | auth-owner | auth-non-owner | creator-owner | admin | service_role` × `SELECT/INSERT/UPDATE/DELETE`. Her hücre: policy adı, amaç, test ID. Storage bucket'ları için ayrı bölüm. Helper fonksiyonların execute matrisi.

### 2. Role helper sertleştirme

Mevcut `public.has_role(uuid, user_role)` SECURITY DEFINER + `search_path=public` — yeterli. Ek:
- `public.is_admin()` wrapper (`auth.uid()` kullanır, parametre almaz).
- `revoke execute ... from public, anon` ve `grant execute ... to authenticated` — sadece bu iki helper.
- `user_roles` tablosuna **INSERT/UPDATE/DELETE policy eklenmez** (deny-by-default kalır → client role atayamaz). `service_role` zaten RLS'i bypass eder. Mevcut self_read policy korunur.

### 3. Campaigns RLS

Policy seti (`campaigns_*`):
- `public_read_visible` (SELECT, role `public`): `status IN ('live','successful')`.
- `creator_read_own` (SELECT, `authenticated`): `creator_id = auth.uid()`.
- `admin_read_all` (SELECT, `authenticated`): `public.is_admin()`.
- `creator_insert_draft` (INSERT, `authenticated`): `WITH CHECK creator_id = auth.uid() AND status = 'draft' AND submitted_at IS NULL AND approved_at IS NULL AND published_at IS NULL AND closed_at IS NULL`.
- `creator_update_editable` (UPDATE, `authenticated`): `USING creator_id = auth.uid() AND status IN ('draft','revision_requested')` + `WITH CHECK` aynı + status değişmez. **Status/timestamp/creator_id güvenliği** ek BEFORE UPDATE trigger `enforce_campaign_field_locks()` ile garanti (RLS WITH CHECK kolon-bazlı koruyamadığı için): trigger creator update'inde `status, creator_id, submitted_at, approved_at, published_at, closed_at, cancellation_reason, suspension_reason, lock_version` değişimini reddeder.
- DELETE policy yok (kimse silemez; cancel state machine ile).

### 4. Campaign child tabloları

Helper: `public.campaign_is_public(uuid)` (STABLE, `status IN ('live','successful')` lookup) ve `public.campaign_owned_by_me(uuid)` (creator_id check). Her ikisi SECURITY DEFINER, search_path sabit, sadece `authenticated`+`anon`'a execute.

**campaign_media**: 
- SELECT public: `campaign_is_public(campaign_id)`.
- SELECT creator: `campaign_owned_by_me(campaign_id)`.
- SELECT admin.
- INSERT/UPDATE/DELETE creator: own + parent status ∈ {draft, revision_requested}.

**reward_tiers**: aynı patern; public SELECT `is_active=true AND campaign_is_public`.

**campaign_updates**:
- SELECT public: `is_published=true AND campaign_is_public`.
- SELECT creator: own.
- INSERT/UPDATE/DELETE creator: own + `author_id=auth.uid()` + parent status live/successful (update'ler sadece yayınlanmış kampanya için).

**campaign_reviews** (admin-internal):
- `notes` alanı internal admin notu içerir → tabloya **public/creator hiçbir policy verilmez**. Creator-facing yayın notu için yeni alan **`creator_visible_notes text`** eklenir (migration). 
- SELECT creator: sadece `creator_visible_notes` görmek için `public.creator_campaign_reviews` view'ı (security_invoker=on, `campaign_owned_by_me`). Base table'da creator policy yok.
- SELECT admin.
- INSERT/UPDATE/DELETE: yok (yalnız service_role / SECURITY DEFINER function).

### 5. Profiles sertleştirme

Mevcut policies korunur. Public read'in PII sızdırmaması için:
- `profiles` tablosunda `is_public=true` zaten gerekiyor; ancak email vs. yok (auth.users'ta). Yine de güvenlik için `public.profiles_public` view (security_invoker, kolonlar: id, username, display_name, bio, avatar_path, website_url, location, created_at) eklenir; UI bu view'ı kullanır.
- `profiles_self_update` policy'sine kolon-lock trigger: `id, created_at, updated_at` (updated_at trigger by set_updated_at) değişemez (id zaten PK ama trigger ekstra savunma).
- UPDATE policy'de `WITH CHECK` `auth.uid()=id` korunur. `username` zaten `claim_username()` RPC'sinden geliyor; manual UPDATE allow edilir ama reserved/format kontrolü için BEFORE UPDATE trigger.
- INSERT/DELETE policy yok (trigger handle_new_user yapar).

### 6. Favorites
- SELECT/INSERT/DELETE: `user_id = auth.uid()`.
- UPDATE yok.

### 7. Notifications
- SELECT: `user_id = auth.uid()`.
- UPDATE: `user_id = auth.uid()` + kolon-lock trigger `notifications_lock_fields()` → yalnız `read_at` değişebilir.
- INSERT/DELETE policy yok (sadece service_role).

### 8. Admin/finans tabloları (deny-by-default + admin select)

`audit_logs`, `payment_transactions`, `refunds`, `payouts`, `platform_fees`, `financial_ledger_entries`, `idempotency_keys`, `webhook_events`:
- SELECT admin policy (sadece `is_admin()`).
- INSERT/UPDATE/DELETE policy YOK (service_role bypass).
- `audit_logs`, `financial_ledger_entries`, `webhook_events`, `idempotency_keys` zaten append-only trigger korumalı; admin update/delete dahi yok.

### 9. Contributions

- Base tabloya client policy yok (PII şifreli alanlar var; tabloyu doğrudan açma).
- `public.my_contributions` view (security_invoker): backer için `backer_id=auth.uid()`, kolonlar: id, campaign_id, reward_tier_id, amount_minor, currency, status, anonymous, created_at, updated_at (encrypted alanlar yok).
- `public.campaign_contributions_for_creator` view: creator için sınırlı projection (id, campaign_id, reward_tier_id, amount_minor, status, anonymous, display_name_snapshot, created_at) — WHERE `campaign_owned_by_me(campaign_id)`. PII (email/address) yok.
- Admin için ayrı bir admin view veya doğrudan admin SELECT policy: `is_admin()` (raw tablo).

### 10. Database function grants audit

Migration sonunda:
```sql
revoke execute on all functions in schema public from public, anon;
grant execute on function public.has_role(uuid, user_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.check_username_available(citext) to anon, authenticated;
grant execute on function public.claim_username(citext) to authenticated;
grant execute on function public.campaign_is_public(uuid) to anon, authenticated;
```
`handle_new_user`, `set_updated_at`, `prevent_mutation`, internal trigger fonksiyonları execute yetkisi alır almaz public'ten.

### 11. Storage RLS

**avatars** (private bucket — mevcut policies korunur):
- Mevcut `avatars_select_own` SELECT-self yalnızca path-prefix `auth.uid()` izniyle. Avatar genel görünür olduğu için: `avatars_select_public` SELECT policy `public` rolüne (bucket private, signed URL kullanılacak) eklenmez — UI zaten signed URL kullanıyor (Faz 7). Mevcut self-policy yeterli.

**campaign-media** (yeni bucket, private):
- `storage_create_bucket(name='campaign-media', public=false)`.
- Path konvansiyonu: `<campaign_id>/<uuid>.<ext>` (DB constraint dışı; policy `campaign_id`'yi `(storage.foldername(name))[1]::uuid` ile alır).
- INSERT/UPDATE/DELETE: `campaign_owned_by_me(...)` + parent status `draft|revision_requested`.
- SELECT public: `campaign_is_public(...)`.
- SELECT creator/admin: ownership/is_admin.

`campaign-documents` bu fazda **scope dışı** (henüz UI yok); ileri faza ertelenir, plan dokümantasyonuna not düşülür.

### 12. RLS testleri

pgTAP yerine **Node/Vitest + supabase-js** ile entegrasyon testleri (`src/test/security/rls.test.ts`):
- Test setup: 4 auth context → `anon`, `user_a`, `user_b`, `admin` (`signInWithPassword` + admin için `user_roles`'a service_role insert).
- Test fixture migration veya beforeAll'da minimal seed (draft + live kampanya per user).
- Tüm 11 senaryo + ek finance/notification/storage spoof testleri.
- Test komutu: `bun test src/test/security/rls.test.ts`.
- `.env.test` doğrudan `SUPABASE_SERVICE_ROLE_KEY` kullanır (yalnızca local).

Not: pgTAP Supabase shared cluster'da yok; supabase-js round-trip RLS'i gerçek Data API perspektifiyle doğrular — daha gerçekçi.

### 13. Çıktılar / dosyalar

**Yeni migration** `supabase/migrations/<ts>_rls_hardening.sql`:
1. `creator_visible_notes` kolonu `campaign_reviews`'a.
2. Helper fonksiyonlar: `is_admin()`, `campaign_is_public(uuid)`, `campaign_owned_by_me(uuid)`, trigger fonksiyonları `enforce_campaign_field_locks`, `notifications_lock_fields`, `enforce_profile_field_locks`.
3. Triggerlar.
4. Tüm tablolar için yukarıdaki policies (drop if exists + create).
5. Storage `campaign-media` policies (bucket önce `storage_create_bucket` ile).
6. View'lar: `profiles_public`, `my_contributions`, `campaign_contributions_for_creator`, `creator_campaign_reviews`.
7. Grant/revoke blok.

**Yeni dosyalar**:
- `docs/security/rls-matrix.md`
- `src/test/security/rls.test.ts` (+ küçük `src/test/security/helpers.ts`).

**Tool çağrı sırası**:
1. `supabase--storage_create_bucket` (campaign-media, public=false).
2. `supabase--migration` (tek büyük migration).
3. types regenere edilince frontend kodu **değişmez** (bu faz UI dokunmaz, sadece testler eklenir).
4. `supabase--linter` ve test çalıştırma.

### 14. Açık riskler

- `campaign-media` bucket'ı için public SELECT policy `campaign_is_public` lookup'ı her dosya isteğinde DB query yapar — performans için ileride CDN/signed URL gerekebilir; bu fazda kabul.
- Encrypted PII kolonları (`contact_email_encrypted` vs.) gerçek şifreleme henüz yok; sadece tablo erişimi kapatılıyor.
- Admin paneli yok → admin testleri yalnız doğrudan supabase-js ile yapılır.
- Workspace public-bucket policy'si `campaign-media`'yı private tutarsa Faz 9'da signed URL stratejisi gerekecek.
