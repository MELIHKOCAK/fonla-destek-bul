# Faz 5 — Supabase Bağlantısı + Şema V1 (Migration-Tabanlı)

## Hedef
Harici Supabase projesini Lovable Cloud ile bağlamak ve veritabanı şeması V1'i tek tutarlı migration zinciri olarak kurmak. UI hâlâ mock data kullanmaya devam edecek; auth, ödeme ve gerçek sorgular bu fazda bağlanmayacak.

## Ön koşul (manuel adım)
Lovable Cloud henüz etkin değil. Build moduna geçişten sonra ilk iş `supabase--enable` çağrısı olacak. Bu adım kullanıcı onayı gerektirebilir. Proje hazır olunca `src/integrations/supabase/` ve `.env` otomatik oluşur; `SUPABASE_URL`, `VITE_SUPABASE_*` değişkenleri sağlanır.

## Migration Zinciri (`supabase/migrations/`)

Tek temiz zincir, sırayla:

1. `00000000000001_extensions_and_enums.sql`
   - `create extension if not exists pgcrypto, citext, pg_trgm`
   - Tüm enum tipleri: `campaign_status`, `campaign_media_type`, `user_role`, `review_decision`, `contribution_status`, `payment_status`, `refund_status`, `payout_status`, `ledger_entry_type`, `financial_environment`
   - `campaign_status` 17 değer: draft, submitted, under_review, revision_requested, approved, scheduled, live, successful, failed, cancelled, suspended, payout_pending, paid_out, refunding, refunded, rejected

2. `00000000000002_shared_functions.sql`
   - `public.set_updated_at()` trigger fonksiyonu
   - `public.has_role(uuid, user_role)` SECURITY DEFINER fonksiyonu (Faz 6 için hazır)
   - `public.prevent_mutation()` ledger/audit append-only trigger

3. `00000000000003_identity_tables.sql`
   - `profiles` — id PK = auth.users.id, citext username unique, display_name, bio, avatar_path, website_url, location, is_public, email/marketing toggles, timestamps
   - `user_roles` — (user_id, role) composite PK, assigned_by, RLS on
   - GRANT'lar (authenticated SELECT/UPDATE kendi satırı; user_roles authenticated SELECT)
   - RLS enable + minimum policy: kendi profilini görme/güncelleme, public profilleri okuma
   - updated_at trigger

4. `00000000000004_catalog_tables.sql`
   - `categories` — slug lowercase/kebab check, is_active, sort_order
   - GRANT SELECT anon+authenticated (public okunur)
   - RLS enable; herkes aktif kategorileri okuyabilir; yazma yasak (admin Faz 6)

5. `00000000000005_campaign_tables.sql`
   - `campaigns` — tüm alanlar, status default 'draft', lock_version, currency check = 'TRY', goal_amount_minor > 0, end_at > start_at check (her ikisi de varsa)
   - `campaign_media` — partial unique index `(campaign_id) where is_cover`
   - `reward_tiers` — amount_minor>0, quantity_limit>0 nullable
   - `campaign_updates`
   - `campaign_reviews` — append-only (prevent_mutation trigger update/delete'te)
   - `favorites` — (user_id, campaign_id) composite PK
   - `notifications` — dedupe_key partial unique
   - GRANT'lar + RLS enable, **deny-by-default** policy yok (Faz 6'da eklenecek). Service_role full erişim.
   - updated_at trigger'ları

6. `00000000000006_financial_tables.sql`
   - `contributions`, `payment_transactions`, `refunds`, `payouts`, `platform_fees`, `financial_ledger_entries`, `webhook_events`, `idempotency_keys`
   - Para alanları `bigint check >= 0` (veya >0 uygun yerlerde)
   - Currency char(3) check = 'TRY'
   - FK'ler `on delete restrict` (cascade YOK)
   - Unique: `webhook_events(provider, provider_event_id)`, `idempotency_keys(scope, key)`, `payment_transactions(provider, provider_payment_id) where provider_payment_id is not null`
   - `payouts.net_amount_minor = gross - refund - provider_fee - platform_fee - other` check
   - **Ledger append-only**: `prevent_mutation` trigger on UPDATE/DELETE; sadece service_role insert
   - RLS enable, hiçbir policy yok (Faz 6/7'de)
   - GRANT yalnızca service_role; authenticated'a finans tablolarına erişim verilmez

7. `00000000000007_audit_table.sql`
   - `audit_logs` — actor_user_id nullable, action, entity_type/id, before_data/after_data jsonb, reason, correlation_id
   - Append-only trigger
   - RLS enable; sadece service_role

8. `00000000000008_seed_categories.sql` (seed migration — idempotent `on conflict do nothing`)
   - 9 Türkçe kategori: Teknoloji, Tasarım, Oyun, Film & Video, Müzik, Yayıncılık, Sanat, Yemek & İçecek, Topluluk

## Seed (`supabase/seed.sql`)
- Yalnızca kategoriler için tekrarlı `insert ... on conflict do nothing`.
- Profile/campaign seed YOK — `auth.users` bağımlı. README'de yöntem belgelenecek (Faz 6 sonrası local seed user akışı).

## TypeScript Entegrasyonu
- Lovable Cloud aktive olduğunda `src/integrations/supabase/client.ts` ve `types.ts` otomatik üretilir.
- `Database` tipi tek kaynak; mock layer'ı bozmuyoruz — Faz 4 mock servisleri olduğu gibi kalır.
- README'ye type üretme komutu eklenecek: `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
- UI bağlantısı YOK.

## Doğrulama Adımları
- `supabase db reset` (lokal) ile zincir tek seferde kurulabilmeli — komut README'ye eklenecek
- Migration sonrası kontrol query'leri (manuel doğrulama notları):
  - `select typname from pg_type where typname like '%_status'` enum'ları gösterir
  - `select tablename, rowsecurity from pg_tables where schemaname='public'` RLS açık doğrulanır
  - ledger insert → ok; update → error (trigger)
- `bun run typecheck`, `bun run build`, `bun run lint`, `bunx vitest run`

## Kapsam Dışı (Bu Fazda Yapılmayacak)
- Auth UI bağlantısı, login akışı
- RLS policy yazımı (deny-by-default kalır; Faz 6)
- Edge function, payment provider, webhook handler
- Mock servislerin Supabase'e taşınması
- Storage bucket oluşturma (Faz 6 medya yükleme ile)

## Açık Riskler / Notlar
- `auth.users`'a bağlı seed yapılamaz → demo kullanıcılar Faz 6'da auth bağlandıktan sonra script ile oluşturulacak.
- `pg_trgm` extension'ı arama için kurulu ama henüz kullanılmıyor; index'ler Faz 7 search bağlanırken eklenecek.
- Type generation için CLI projeye link gerekir (`supabase link --project-ref ...`); Lovable Cloud bunu otomatik yapıyorsa README'de uyarı bırakılacak.
- `financial_ledger_entries` için signed amount_minor kullanılacak (debit/credit yönü işaretle ifade) — `entry_type` ile tutarlılık check constraint'i Faz 6 finance logic'i ile birlikte eklenecek.

## Raporlanacaklar
Build moduna geçince son cevapta: oluşturulan migration listesi, eklenen enum/tablo özeti, çalıştırılan doğrulamalar, kullanıcının yapması gereken manuel adımlar (Cloud onayı, type gen komutu), açık riskler.
