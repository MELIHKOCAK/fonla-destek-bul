# Plan: Lovable AI ile Çok Dilli Kampanya Özetleme

## Mevcut proje analizi (özet)
- **Detay sayfası**: `src/pages/CampaignDetailPage.tsx` — route `src/routes/campaigns.$slug.tsx`, `slug` ile veri çekiyor. Şu an `services/campaigns.service.ts` üzerinden gerçek DB'ye bağlı (mock değil; `get_public_campaign_by_slug` RPC).
- **Campaigns tablosu**: `title`, `short_description`, `story_content`, `funds_usage_content`, `timeline_content`, `risks_content`, `goal_amount_minor`, `currency`, `start_at`, `end_at`, `status`, `category_id`, `creator_id`, `slug`.
- **Reward tiers**: ayrı tablo, `is_active`, `amount_minor`, `title`, `description`, `sort_order`.
- **Campaign status enum**: `draft, submitted, under_review, revision_requested, approved, scheduled, live, successful, failed, cancelled, suspended, payout_pending, paid_out, refunding, refunded, rejected` — özetlenebilir: `live, successful, failed` (spec'e uyumlu).
- **Backend**: Edge function yok; pattern olarak `src/routes/api/public/hooks/*` altında TanStack server routes kullanılıyor.
- **AI**: `LOVABLE_API_KEY` server env'de mevcut. AI gateway henüz kurulu değil — `ai_gateway--create` ile etkinleştirilecek.
- **i18n**: yok — yeni `summary` özelliği için merkezi allowlist (`tr`, `en`) oluşturulacak.
- **TanStack Query**: aktif; query keys ve service pattern var.
- **UI primitives**: shadcn Card, Accordion, Skeleton, Alert, Toast, Select hazır.

## Yapılacaklar

### 1. Migration (`supabase/migrations/<ts>_campaign_ai_summaries.sql`)
- Enum `campaign_ai_summary_status` ekle: `generating, completed, failed, stale`.
- `campaign_ai_summaries` tablosu (spec'teki alanlarla): `id, campaign_id (fk cascade), language_code, source_version bigint, source_hash text, prompt_version text, schema_version int, model_identifier text, status enum, summary_json jsonb, word_count int, failure_code text, failure_message_masked text, generation_started_at, generated_at, stale_at, created_at, updated_at`.
- Partial unique index: `(campaign_id, language_code) WHERE status='generating'` — eş zamanlı tek generating.
- Unique index: `(campaign_id, language_code, source_hash, prompt_version, schema_version) WHERE status IN ('completed','stale')`.
- `campaign_ai_summary_rate_limits` tablosu: `actor_key_hash, campaign_id (unique birlikte), last_generation_request_at, created_at, updated_at`.
- `campaign_ai_summary_audit` (opsiyonel minimal): `campaign_id, language_code, actor_type, cache_hit, result_type, created_at`.
- `campaigns` tablosuna `ai_summary_source_version bigint not null default 1` ekle.
- **GRANT'lar**: spec gereği frontend doğrudan summary/rate-limit yazmaz; `authenticated`/`anon` rolleri için yalnız `SELECT` yok — tablo tamamen Edge Function (service_role) üzerinden okunup yazılır. `GRANT ALL ... TO service_role`. RLS aç + tüm policy'leri reddet (no rows for client).
- Trigger'lar: `campaigns` tablosunda `BEFORE UPDATE` — özetlenen alanların biri değiştiğinde `ai_summary_source_version = ai_summary_source_version + 1`. `AFTER UPDATE` — eski `completed` summary'leri `stale + stale_at=now()` yap.
- `reward_tiers` `AFTER INSERT/UPDATE/DELETE` trigger — kampanyanın `ai_summary_source_version`'ı artır ve summary'leri stale et.
- `updated_at` trigger'ları.
- **DB function**: `claim_campaign_ai_summary_generation(_campaign_id, _language_code, _source_hash, _prompt_version, _schema_version, _actor_key_hash, _rate_limit_seconds)` — `SECURITY DEFINER`, transaction içinde:
  1) completed + non-stale cache varsa `cache_hit` (+ summary_id).
  2) generating kayıt varsa `generation_in_progress`.
  3) Rate limit check (`last_generation_request_at + interval`).
  4) Yeterliyse `INSERT generating` + rate-limit upsert + `generation_started` döner.
  - Frontend bu fonksiyonu doğrudan çağıramaz (yalnız service_role).

### 2. Server-side modüller (`src/lib/ai/`)
- `src/lib/ai/campaign-summary/schema.ts` — Zod schema:
  - `CampaignSummarySectionKey` enum (8 değer).
  - `CampaignSummarySourceField` enum (11 değer).
  - `CampaignSummaryOutput` (schemaVersion=1, languageCode, sections[], missingInformation[], disclaimer).
  - Section yapısı, word-count, kötü amaçlı HTML reddi.
- `src/lib/ai/campaign-summary/languages.ts` — `SUPPORTED_LANGUAGES = ['tr','en']` allowlist + label map.
- `src/lib/ai/campaign-summary/normalize.ts` — HTML→düz metin (script/style/iframe/event-handler temizliği, görünmez karakter normalize), canonical JSON üretici + SHA-256 source hash.
- `src/lib/ai/campaign-summary/prompt.ts` — `PROMPT_VERSION = 'v1'`, `SCHEMA_VERSION = 1`, system instruction (spec'teki metin), `MAX_CAMPAIGN_SUMMARY_SOURCE_CHARS` sabiti.
- `src/lib/ai/campaign-summary/types.ts` — yardımcı type'lar (status, response).
- `src/lib/ai/campaign-summary/disclaimers.ts` — tr/en uyarı metinleri.

### 3. Server route (Edge Function eşdeğeri)
- `src/routes/api/public/ai/generate-campaign-summary.ts` — `POST` handler:
  1) HTTP method + body schema validation (`{ campaignId: uuid, languageCode }`).
  2) Optional auth: `Authorization: Bearer` varsa Supabase JWT doğrula (publishable key), kullanıcı id'sini çıkar. Sahte/expired JWT → 401.
  3) Service-role client (`client.server.ts`) ile `campaigns` + `reward_tiers` oku — yalnız izinli kolonlar.
  4) Erişim kontrolü: kampanya var mı? status `live|successful|failed` mı? authenticated user `creator_id` ile eşleşiyorsa 403 + `code: CREATOR_FORBIDDEN`.
  5) Normalize + canonical JSON + source hash. Content > `MAX_CAMPAIGN_SUMMARY_SOURCE_CHARS` → 413 + `CONTENT_TOO_LARGE`.
  6) Actor key: authenticated → `user:<uuid>`; guest → `ip:HMAC_SHA256(salt=AI_RATE_LIMIT_HASH_SECRET, msg=trusted_ip)`. Güvenilir IP header (`cf-connecting-ip`/`x-forwarded-for`'un ilk değeri) yoksa daha kısıtlı `ip:none` (rapora not).
  7) `claim_campaign_ai_summary_generation` RPC çağır:
     - `cache_hit` → completed summary'i sterilize edip dön.
     - `generation_in_progress` → 202 + `code: GENERATION_IN_PROGRESS`.
     - `rate_limited` → 429 + `retryAfterSeconds`.
     - `generation_started` → adım 8.
  8) Lovable AI Gateway çağrısı (`structured output` / JSON schema). Düşük temperature. `LOVABLE_API_KEY` yalnız server-side.
     - 402 → completed kaydı `failed` (`AI_BALANCE_UNAVAILABLE`), 503 + güvenli mesaj.
     - 429 (provider) → `AI_PROVIDER_RATE_LIMITED`, 503/429.
     - Diğer hata → `AI_PROVIDER_ERROR`, 502.
  9) Output validation (Zod + ek kurallar: word_count 300–500, language match, sourceFields allowlist, HTML reddi).
     - Başarısız → kaydı `failed` + `INVALID_STRUCTURED_OUTPUT|WORD_COUNT_OUT_OF_RANGE|UNSAFE_OUTPUT` vs.
  10) Cache write: kayıt `completed`, `generated_at=now()`, `word_count`, `model_identifier`.
  11) Response: yalnız güvenli alanlar (sections, languageCode, schemaVersion, generatedAt, source: 'fresh'|'cache', disclaimer). Internal alanlar gizli.
- Yeni secret: `AI_RATE_LIMIT_HASH_SECRET` (Lovable Cloud secret olarak eklenir).

### 4. Frontend
- **Service hook** (`src/lib/ai/campaign-summary/api.ts`): `fetchCampaignSummaryStatus({campaignId, languageCode})` (GET status — opsiyonel) ve `generateCampaignSummary(...)` (POST mutation). Sadece bu endpoint'i çağırır, doğrudan DB yok.
- **TanStack hook** `useCampaignAiSummary(campaignId, languageCode)`:
  - Query key `['campaign-ai-summary', campaignId, languageCode]`.
  - Status sorgusu açık aksiyon ile başlar (otomatik AI üretimi yok).
  - `generation_in_progress` durumunda kontrollü polling (2s → 4s → 8s, max 60s, unmount'ta iptal).
- **Component** `src/components/campaign/CampaignAiSummaryCard.tsx`:
  - Mevcut Card/Accordion/Skeleton/Alert/Select/Button kullanır.
  - States: kapalı / hazır / loading / generating-in-progress / başarılı (8 section + kaynaklar + dil + üretim tarihi + disclaimer) / stale / rate-limited (countdown) / creator-restricted / error.
  - Creator kısıtı: `useAuth` ile `user.id === creatorId` ise buton kapalı, mesaj.
  - Status sırf `live|successful|failed` olduğunda render.
  - Dil seçici (`tr`/`en`) — değişiklik otomatik AI çağrısı yapmaz, status sorgusu tetikler.
  - Kaynak chip'leri tıklanınca `#campaign-story`, `#fund-usage`, `#campaign-timeline`, `#risks-and-challenges`, `#reward-tiers` anchor'larına kaydırır. Sayfada olmayan anchor için chip pasif.
  - Output'u **düz metin** olarak render — `dangerouslySetInnerHTML` yasak.
- **Detay sayfasına entegrasyon**: `CampaignDetailPage.tsx` içine `c.id` ve `c.creator.id` ile karta veri akışı. Mevcut Section'lara `id="campaign-story"` vb. anchor ekle (kaynak chip linkleri için).
- **i18n metinleri**: UI metinleri Türkçe; AI özet içeriği seçilen dilde.

### 5. AI Gateway
- `ai_gateway--create` ile Lovable AI connector etkinleştirilir. Model: hızlı/cost-controlled default (örn. Gemini 2.5 Flash). `MODEL_IDENTIFIER` server-side tek dosyada.

### 6. Testler
- **Unit** (`vitest`):
  - `normalize.test.ts`: aynı içerik farklı whitespace → aynı hash; field değişikliği hash değişir; HTML/script temizlenir; reward sıralaması deterministic.
  - `schema.test.ts`: geçerli output kabul; eksik section/unknown key/unknown sourceField reddedilir; word count < 300 / > 500 reddedilir; HTML reddedilir; geçersiz language code reddedilir.
  - `prompt.test.ts`: prompt versioning sabit, language allowlist enforce.
- **Component test** (`CampaignAiSummaryCard.test.tsx`):
  - Creator için buton disabled + mesaj.
  - Guest için buton aktif.
  - Dil değiştirme otomatik mutation tetiklemez.
  - Rate-limited countdown gösterilir.
  - Stale durumda eski içerik gösterilmez.
  - 8 section + kaynak chip'leri render.
- **Server route test** (handler unit; service-role client mock'lu):
  - Geçerli guest cache hit / generating / rate-limit / creator-403 / draft-403 / invalid language-400 / invalid jwt-401 / AI provider 402 → 503 mapping / invalid AI output → failed.
- Edge Function E2E: spec'in 37 senaryosunun mümkün olanları otomatize, deploy bağımlı olanlar manuel raporlanacak.

### 7. Doğrulama
- `bunx tsc --noEmit`, ESLint, `bunx vitest run`, prod build.
- Preview: guest olarak live kampanya aç → AI kartı görünür → "Yapay Zekâ ile Özetle" butonu çalışır.

## Kapsam dışı (spec'e uygun)
- Yeni admin panel, fraud, scoring, RAG/embedding, kampanya yeniden yazımı, SEO/OG için AI özet kullanımı, otomatik üretim, AI chatbot, kampanya karşılaştırma. Mevcut detay sayfası/auth/payment sistemine dokunulmaz.

## Açık riskler / manuel adımlar
- `AI_RATE_LIMIT_HASH_SECRET` secret olarak eklenmeli (manuel).
- Lovable AI connector etkinleştirme + bakiye doğrulaması (manuel rapor).
- Cloudflare/Lovable edge'den `cf-connecting-ip` veya benzeri güvenilir IP header'ı sağlanmıyorsa guest rate-limit fallback kısıtlı çalışır.
- Detay sayfasındaki bazı UI alanları (FAQ, comments, milestones detayları, fundingPlan) gerçek DB'de tek text alan; AI server-side ham metni özetler. UI'daki mock yapılar değiştirilmez.

## Teknik detay (özet)
- `prompt_version='v1'`, `schema_version=1`. Model identifier ENV ile değişebilir.
- Source hash: SHA-256, sıralı keys, UTC ISO tarihler, normalize edilmiş düz metin.
- Rate limit: 60s/actor/campaign, dil bağımsız.
- Disclaimer her response'a server'dan eklenir (Türkçe/İngilizce sabit metin).
