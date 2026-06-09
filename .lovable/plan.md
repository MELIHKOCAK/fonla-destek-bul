
# Faz 10 — Creator Kampanya Sihirbazı

Bu faz creator'ın kampanya draft'ını oluşturup adım adım doldurabildiği,
otomatik kaydeden, güvenli submit eden ve listeleyebildiği wizard'ı kurar.
Admin review, ödeme ve canlı kampanya operasyonları bu fazda yok.

## 1. Domain config

`src/lib/campaign/config.ts` — domain kuralları tek yerde:

- `MIN_TITLE=5`, `MAX_TITLE=80`
- `MIN_SHORT_DESC=40`, `MAX_SHORT_DESC=200`
- `MIN_STORY=300`, `MAX_STORY=20000` (markdown)
- `MIN_FUNDS_USAGE=100`, `MIN_TIMELINE=100`, `MIN_RISKS=100`
- `MIN_GOAL_MINOR=100000` (1.000 TL), `MAX_GOAL_MINOR=500000000` (5 mn TL)
- `MIN_DURATION_DAYS=7`, `MAX_DURATION_DAYS=60`
- `MAX_GALLERY_ITEMS=10`, `MAX_REWARD_TIERS=20`
- Image: jpeg/png/webp, max 5MB, min 800x600

## 2. Veritabanı / SQL migration

Yeni migration `..._campaign_wizard.sql`:

1. **Slug generation**: kullanılan sluğun unique kalması için
   `public.generate_unique_campaign_slug(_base text)` fonksiyonu
   (SECURITY DEFINER, `slug-1`, `slug-2` …).
2. **Draft create RPC** `public.create_campaign_draft(_category_id uuid, _title text)`:
   - `auth.uid()` zorunlu
   - kategori `is_active=true` doğrulanır
   - title min/max validate
   - slug üretilir
   - INSERT `creator_id=auth.uid(), status='draft', goal_amount_minor=100000` placeholder
   - return: `campaigns` satırı
3. **Submit RPC** `public.submit_campaign_for_review(_campaign_id uuid, _lock_version int)`:
   - ownership + status ∈ {draft, revision_requested}
   - lock_version eşitliği (optimistic concurrency)
   - tüm zorunlu metin / kategori / goal / tarih / cover media / en az 1 active reward tier doğrulanır
   - typed error code: `BFL_VALIDATION` + JSON detay; `BFL_ALREADY_SUBMITTED` (idempotent: zaten submitted ise no-op)
   - `audit_logs` insert + `notifications` event (admin için)
   - SECURITY DEFINER, transaction içinde
4. **Field locks**: mevcut `enforce_campaign_field_locks` korunur. Wizard yalnız
   güvenli kolonları (title, short_description, story_content, funds_usage_content,
   timeline_content, risks_content, goal_amount_minor, start_at, end_at,
   category_id) update edebilir — RLS update policy zaten kilidi uyguluyor.
5. **lock_version**: her wizard update'inde `+1` yapılır; concurrent edit için
   `WHERE lock_version = expected` kontrolü RPC `update_campaign_draft(...)`
   içinde merkezi yapılır.

## 3. Server functions (`src/lib/campaigns/`)

Tümü `.functions.ts` + `requireSupabaseAuth`. Admin client KULLANILMAZ
(RLS + creator session yeterli):

- `createCampaignDraft.functions.ts` — `create_campaign_draft` RPC çağrısı,
  idempotency: aynı user'ın son 60 sn'de oluşturduğu boş draft varsa onu döner
  (double-click koruması).
- `updateCampaignDraft.functions.ts` — adım bazlı patch + lock_version check
- `listMyCampaigns.functions.ts` — creator'ın tüm kampanyaları, status filtresi
- `getCampaignForEdit.functions.ts` — owner-only kampanya + media + reward_tiers
- `submitCampaign.functions.ts` — submit RPC çağrısı, hata mapping
- `reward-tiers.functions.ts` — CRUD (create/update/reorder/deactivate)
- `media.functions.ts` — upload sonrası DB row create, delete (storage object da temizler), reorder, set cover

Tümü Zod input validation + typed error envelope.

## 4. Routes

```
src/routes/_authenticated/
  creator.campaigns.tsx              (layout, Outlet)
  creator.campaigns.index.tsx        (creator listing — sekmeler)
  creator.campaigns.new.tsx          (kategori seç + başlık → draft create → redirect)
  creator.campaigns.$campaignId.tsx  (wizard layout: sidebar + Outlet + ownership/status guard)
  creator.campaigns.$campaignId.edit.$step.tsx
  creator.campaigns.$campaignId.preview.tsx
```

`$step` ∈ `basics|funding|story|funds-usage|timeline|risks|media|rewards|submit`.
Wizard layout loader getCampaignForEdit çağırır; non-owner / non-editable status
için 403/redirect.

## 5. UI bileşenleri (`src/components/creator/`)

- `WizardLayout.tsx` — sidebar (adım listesi + completion ✓), top progress, "Önizleme" + "İncelemeye gönder" CTAs
- `WizardStepNav.tsx` — Geri/İleri, "Kaydet ve devam et"
- `SaveStatusIndicator.tsx` — Saving / Saved / Error / Conflict (lock_version)
- `useCampaignAutosave.ts` — RHF + 800ms debounced patch, retry, conflict toast
- Step formları:
  - `BasicsStepForm.tsx` (title, short_description, category)
  - `FundingStepForm.tsx` (goal TL input + kuruş conv, start_at, end_at)
  - `StoryStepForm.tsx` (markdown textarea + preview)
  - `FundsUsageStepForm.tsx` / `TimelineStepForm.tsx` / `RisksStepForm.tsx` (markdown)
  - `MediaStepForm.tsx` (`CampaignMediaUploader` + galeri grid + reorder + cover seç + opsiyonel external video URL)
  - `RewardsStepForm.tsx` + `RewardTierEditor.tsx` (add/edit/reorder/`is_active=false`)
  - `SubmitStepForm.tsx` (eksik alan checklist, "İncelemeye gönder")
- `CreatorCampaignList.tsx` — Tabs (Taslak, Düzeltme bekliyor, İncelemede, Yayında/planlı, Kapalı)
- `CampaignStatusActions.tsx` — status'a göre action (Düzenle / Görüntüle / Yönet)

## 6. Validation (`src/lib/campaigns/validation.ts`)

Adım bazlı Zod schema'ları + `submitCampaignSchema` (tüm alanlar). Aynı schema
client form + server function input'unda kullanılır. TL ↔ kuruş dönüşümü
`src/lib/money.ts` (`tryToMinor`, `minorToTry`) — integer math, hassasiyet
kaybı olmadan.

## 7. Storage / media

- `campaign-media` bucket zaten private, RLS hazır.
- Path: `<campaign_id>/<crypto.randomUUID()>.<ext>`. User filename `metadata.original_name`.
- `CampaignMediaUploader.tsx`: client-side MIME/boyut check → signed upload →
  başarıda DB row insert; başarısızsa storage object'i temizle.
- Delete: DB row sil + storage object sil (server function transactional best-effort).
- Reorder: `sort_order` toplu update. Cover seç: tek `is_cover=true` (partial unique index zaten var).
- Video bu fazda sadece external URL (YouTube/Vimeo); direct upload kapsam dışı.

## 8. Preview

`creator.campaigns.$campaignId.preview.tsx` mevcut Campaign Detail
bileşenlerini (`src/components/common/`) draft data ile yeniden kullanır.
Owner-only guard (loader 403). Eksik alanlar için belirgin placeholder
("Hikâye henüz yazılmadı — `Hikâye` adımını tamamlayın").

## 9. Testler (`src/test/campaigns/`)

- `validation.test.ts` — her adım schema'sı + submit schema'sı
- `money.test.ts` — TL↔kuruş edge case (0.01, büyük sayı, ondalık)
- `wizard-autosave.test.tsx` — RTL: debounced save, error retry, conflict
- `submit-rpc.test.ts` — backend (psql/RLS): eksik field reject, valid draft submit, idempotent re-submit, ownership
- `creator-list.test.tsx` — sekme filtreleri
- `media-uploader.test.tsx` — MIME/boyut reject, cover unique

## 10. Tamamlanma / doğrulama

- `bunx tsc --noEmit`
- `bunx vitest run src/test/campaigns`
- Lint
- Manuel preview smoke (yeni draft → adımlar → submit reddi → eksikleri doldur → submit kabul)

## Kapsam dışı (sonraki fazlar)

- Admin review UI
- Ödeme / contribution akışı
- Public campaign sayfası gerçek query'leri (Faz 11+)
- Direct video upload
- Slug değiştirme UI (otomatik üretilir, MVP'de sabit)
