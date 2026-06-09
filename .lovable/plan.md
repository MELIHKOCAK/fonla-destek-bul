## Hedef

`src/services/{campaigns,categories,creators}.service.ts` içindeki mock repository'i public sayfalardan tamamen kaldır ve gerçek Supabase verisine bağla. Sadece güvenli, projeksiyonlu DTO döndüren RPC'ler üzerinden okuma yap; `select('*')` ile iç alanları sızdırma. Bu fazda yeni özellik eklemiyoruz — yalnızca veri katmanını değiştirip eksik public route'ları açıyoruz.

## Kapsam dışı

- Yeni ödeme/contribution/comment/FAQ feature'ları (bu faz mock CampaignDetail'in `comments`/`faq`/`updates` alanlarını boş diziyle döndürür; published `campaign_updates` haricinde DB'de bu tablolar henüz yok)
- Admin & creator wizard akışlarının yeniden yazımı
- i18n, SEO sitemap, OG image generation
- Realtime/subscription

## 1. Migration — güvenli public RPC'ler

`supabase/migrations/<ts>_public_campaign_projections.sql`:

1. **Indexler** (varsa skip):
   - `campaigns(status, published_at DESC)` partial `WHERE status IN ('live','successful')`
   - `campaigns(end_at)` partial `WHERE status='live'`
   - GIN `pg_trgm` on `campaigns.title`, `campaigns.short_description`
2. **`get_public_campaigns(_q text, _category_slugs text[], _funded_min numeric, _funded_max numeric, _ending_within_days int, _statuses campaign_status[], _sort text, _limit int, _offset int)`** — `SECURITY DEFINER`, `STABLE`, `SET search_path = public`:
   - `_statuses` whitelist edilir; izinli set yalnızca `{live, successful}`. Hariç olanlar atılır; boşsa `{live}` default.
   - `_sort` whitelist: `newest|popular|ending-soon|near-goal`; default `newest`.
   - `_limit` 1..48 clamp, `_offset >= 0`.
   - `_q` trim, max 80 char; `unaccent` yok — `lower(title) LIKE '%'||lower(q)||'%' OR similarity > 0.2`.
   - `RETURNS TABLE(id, slug, title, short_description, cover_url, creator_username, creator_display_name, creator_avatar_path, category_slug, category_name, goal_amount_minor, raised_amount_minor, backer_count, currency, start_at, end_at, status, total_count)` — total_count window function ile aynı çağrıda.
   - `raised_amount_minor` / `backer_count`: bu fazda `contributions` tablosundan `status='paid'` agregasyonu. Yoksa 0.
   - `cover_url`: `campaign_media` üzerinden `is_cover=true` satırı; `external_url` varsa onu, yoksa `storage_path` ile `'campaign-media/' || path` döner (signed URL üretimini server-fn katmanında yapacağız — RPC sadece relative path verir).
3. **`get_public_campaign_by_slug(_slug text)`** — yukarıdaki alanlar + `story_content`, `funds_usage_content`, `timeline_content`, `risks_content`, `published_at`. Yalnız `status IN ('live','successful','paid_out')` döner; aksi halde `NULL` (NOT NULL row hiç dönmez).
4. **`get_public_campaign_rewards(_campaign_id uuid)`** — sadece `is_active=true` reward tier'ları, kampanya public ise.
5. **`get_public_campaign_updates(_campaign_id uuid)`** — sadece `is_published=true`, kampanya public ise.
6. **`get_public_campaign_media(_campaign_id uuid)`** — tüm media (cover hariç ek görseller), kampanya public ise.
7. **`get_public_creator_profile(_username citext)`** — `profiles` is_public=true filtresi; campaign listesi public statülere kısıtlı. Email, notification ayarları, role hiç dönmez.
8. **`get_public_categories()`** — `is_active=true`, sort by `sort_order`. (`categories` zaten public read için kullanılabilir ama tutarlılık adına RPC.)
9. **`GRANT EXECUTE ... TO anon, authenticated`** her RPC için. Tablolara doğrudan `anon` GRANT yok.

Tüm RPC'ler `SECURITY DEFINER` + `SET search_path = public` + input validation.

## 2. Storage — cover URL stratejisi

`campaign-media` bucket private. Bu faz için en basit ve cache uyumlu yol: live kampanyalar için bucket'ı `public=true` yapmak yerine, **server-fn katmanında `supabaseAdmin.storage.from('campaign-media').createSignedUrls(paths, 3600)`** ile 1 saatlik signed URL üretip TanStack Query `staleTime: 5dk` ile cache'le. `external_url` (placeholder dönem için) doğrudan kullanılır.

`get_public_campaign_by_slug` ve `_campaigns` yalnız `storage_path` döner; URL imzalama application katmanında.

## 3. Server functions (TanStack Start)

Yeni dosyalar `src/lib/public/`:

- `campaigns.functions.ts`:
  - `listPublicCampaigns(query: PublicCampaignQuery)` → RPC çağrısı + cover signed URL batch
  - `getPublicCampaignBySlug(slug)` → detail RPC + media/rewards/updates RPC'leri paralel
  - `getPublicCategoryCampaigns(slug, query)`
- `creators.functions.ts`: `getPublicCreatorProfile(username)`
- `categories.functions.ts`: `listPublicCategories()`

Her biri `createServerFn({ method: "GET" }).inputValidator(zodSchema).handler(...)`. Handler içinde `await import("@/integrations/supabase/client.server")` ile `supabaseAdmin` yüklenir; signed URL imzalama burada. RPC çağrılarında RLS bypass admin ile yapılır çünkü RPC'ler zaten güvenli projection sağlıyor — `anon` rolüyle de aynı sonuç döner; admin kullanmamızın tek nedeni signed URL.

**Alternatif**: signed URL'i ayrı server-fn'e `signCampaignMediaUrls(paths)` çıkarmak ve liste RPC'sini `anon` browser client ile çağırmak. Bu daha güvenli (admin yükünü azaltır). Bu yolu seçeceğiz:

- RPC çağrıları → `supabase` (browser client, anon) üzerinden direkt
- `signCampaignMediaUrls` server-fn → `supabaseAdmin` ile batch sign

## 4. Frontend — service katmanı

`src/services/campaigns.service.ts`, `categories.service.ts`, `creators.service.ts` tamamen yeniden yazılır:

- Mock import yok
- `supabase.rpc("get_public_campaigns", {...})` çağırır
- Sonra `useServerFn(signCampaignMediaUrls)` ile path'leri URL'e çevirir
- Eski `Campaign`/`CampaignDetail`/`Creator`/`Category` shape'leri korunur (`CampaignCard` ve diğer komponentler aynı kalır); RPC sonucundan adapter ile dönüştürülür.
- `CampaignDetail`'in DB'de karşılığı olmayan alanları (`fundingPlan`, `milestones`, `comments`, `faq`) boş dizi döner; `story` ← `story_content`, `risks` ← `risks_content`. `updates` published satırlardan, `rewardTiers` aktif satırlardan.

## 5. Route'lar (eksik public route'lar)

Bu sayfalar var ama route dosyaları yok — link'ler 404 vermiş:

- `src/routes/discover.tsx` → `DiscoverPage`
- `src/routes/campaigns.$slug.tsx` → `CampaignDetailPage` (loader prefetch + head meta)
- `src/routes/categories.$slug.tsx` → `CategoryDetailPage`
- `src/routes/u.$username.tsx` → `CreatorProfilePage`

Her route TanStack Query pattern: `loader` `ensureQueryData`, component `useSuspenseQuery`. `errorComponent` + `notFoundComponent` zorunlu. Detail/category/creator route'larında dynamic `head()` loader datasından title/description/og:image.

## 6. SearchPage / DiscoverPage / HomePage

- `getCampaigns(query)` → yeni `listPublicCampaigns` çağrısı
- Query key factory `src/lib/public/query-keys.ts`:
  ```ts
  publicQueryKeys = {
    campaigns: { all: ['public','campaigns'], list: (q) => [...all, 'list', q], detail: (slug) => [...all, 'detail', slug] },
    creators: { profile: (u) => ['public','creator', u] },
    categories: { list: ['public','categories'] },
  }
  ```
- `staleTime: 60_000` liste, `staleTime: 5*60_000` detail, `placeholderData: keepPreviousData` pagination geçişi
- `retry: (count, err) => count < 2 && !isClientError(err)`
- SearchPage URL state korunur; `search.cats`/`fundedMin`/`fundedMax`/`ending` parametreleri RPC argümanına map'lenir. Zod schema'ya ek `cats` whitelist filtresi yok (RPC zaten doğrular).

## 7. Mock kaldırma

- `src/mocks/`, `src/services/mock/` referansları yalnızca `DesignSystemPage` ve `src/components/**/__tests__/` içinde kalır. Public sayfalardan tüm import silinir.
- ESLint kuralı: `src/routes/**`, `src/pages/{Home,Discover,Search,CampaignDetail,CategoryDetail,CreatorProfile}Page.tsx` içinden `@/mocks/*` ve `@/services/mock/*` importu yasak (eslint `no-restricted-imports`).

## 8. Testler

`src/test/public/`:

- `public-rpc.test.sql` (psql script): anon connection ile
  - `get_public_campaigns` yalnız `live`/`successful` döndürür
  - draft/submitted/suspended kampanya hiç görünmez
  - invalid `_sort='__hack__'` güvenli default'a düşer
  - SQL injection denemesi `_q=' OR 1=1 --` literal arama
- `validation.test.ts`: SearchPage zod schema invalid → safe default
- `adapter.test.ts`: RPC row → `Campaign` DTO mapping
- `no-mock-import.test.ts`: regex tarama, public sayfalarda `@/mocks` import yok
- Mevcut `CampaignCard.test.tsx` mock fixture kullanmaya devam eder (komponent kontratı değişmiyor)

## 9. Doğrulama

- `bun x tsc --noEmit`
- `bun x vitest run`
- `bun run build`
- Manuel: anon olarak `/discover`, `/search?q=...`, `/campaigns/<slug>`, `/categories/<slug>`, `/u/<username>` — network'te `select('*')` yok, sadece `rpc/get_public_*` çağrıları
- supabase linter

## Manuel adımlar

- Migration onayı sonrası DB'de seed kampanya (live status) yoksa testler boş döner. Mevcut seed durumunu kontrol et; gerekirse manuel seed önerisi.
- `campaign-media` bucket private kalır; signed URL stratejisi aktiftir.

## Riskler

- Signed URL TTL (1 saat) vs Query staleTime (5 dk) uyumsuzluğu: TTL > staleTime olduğu için sorun değil; ama tarayıcıda 1 saatten uzun açık kalan sekme `<img>` 403 alabilir. Bu fazda kabul edilebilir.
- `raised_amount_minor`/`backer_count` agregasyonu her sorguda hesaplanıyor — küçük veri setinde sorun yok; ileride materialized view veya `campaigns` üzerinde counter kolonu gerekebilir.
- Mock CampaignDetail'in `fundingPlan`/`milestones`/`comments`/`faq` alanları DB'de yok → public detay sayfası bu bölümleri boş gösterir. UI bunu empty-state olarak ele alacak.