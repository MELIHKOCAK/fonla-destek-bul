# Faz 13: Sosyal Etkileşim & Moderasyon (Favori, Takip, Update, Yorum, Şikâyet, Paylaşım, Bildirim)

## Kapsam
Yalnızca bu fazın kapsamı: favori, takip, kampanya update yayını, yorum + creator reply, şikâyet, paylaşım, in-app bildirim merkezi. Canlı sohbet / DM / mention / SEO Open Graph / UTM bu fazda yok.

## 1. Migration

### Yeni tablolar
- `campaign_follows(user_id, campaign_id, created_at)` — PK `(user_id, campaign_id)`, owner-only RLS, `authenticated` GRANT.
- `campaign_comments`:
  - `id, campaign_id, author_id, parent_id (nullable, self-FK)`, `body text`, `status comment_status enum('visible','hidden_by_admin','deleted_by_author')`, `edited_at`, `created_at`, `updated_at`.
  - Tek seviye thread: `parent_id` olan satır için `parent.parent_id IS NULL` trigger ile zorlanır.
  - `body` ham metin saklanır; render tarafı sanitize eder.
  - CHECK: `char_length(body) BETWEEN 2 AND 2000`.
- `campaign_reports`:
  - `id, reporter_id, campaign_id nullable, comment_id nullable, reason_code text, description text, status report_status enum('open','reviewing','resolved','dismissed'), assigned_admin_id nullable, resolution_note text, created_at, updated_at`.
  - CHECK: `(campaign_id IS NOT NULL) OR (comment_id IS NOT NULL)`.
  - Rate limit: partial unique `(reporter_id, coalesce(campaign_id, comment_id))` open report'lar için.

### RLS özet
- `campaign_follows`: owner select/insert/delete; servis tarafı follow inject için `service_role`.
- `campaign_comments`:
  - public SELECT: `status='visible' AND campaign_is_public(campaign_id)`.
  - INSERT authenticated: kampanya `live|successful`, body uzunluk RPC'de re-check, rate limit RPC'de.
  - UPDATE: yalnız `author_id = auth.uid()` ve `status='visible'`, edit penceresi (15 dk) RPC içinde.
  - DELETE: yok (soft-delete RPC).
  - Admin: select all + hide RPC.
- `campaign_reports`:
  - INSERT authenticated (reporter_id = auth.uid).
  - SELECT: reporter sadece kendi raporunun özet alanlarını görür (`resolution_note` hariç view ile); admin full.

### RPC'ler (SECURITY DEFINER, search_path=public)
- `toggle_favorite(_campaign_id)` — idempotent, unique violation = no-op, döner: `{favorited:boolean}`.
- `toggle_follow(_campaign_id)` — aynı şekil.
- `auto_follow_on_contribution()` — `contributions` row `status='captured'` olduğunda trigger ile follow eklenir; profilde `auto_follow_on_pledge boolean default true` opt-out.
- `create_comment(_campaign_id, _parent_id, _body)` — kampanya state + rate-limit (son 60 sn ≤ 5 yorum / user) + length.
- `update_comment(_comment_id, _body)` — 15 dk edit penceresi, `edited_at=now()`.
- `soft_delete_comment(_comment_id)` — author yalnız kendi yorumu, `status='deleted_by_author'`, body `''`.
- `admin_hide_comment(_comment_id, _reason)` — admin guard.
- `publish_campaign_update(_campaign_id, _title, _body)` — owner + `live|successful`, draft satırını publish; idempotent (`is_published=true` ise no-op); notification fan-out: distinct(`followers ∪ backers captured`), `dedupe_key='campaign_update:'||update_id||':'||user_id`.
- `creator_edit_update(_update_id, _title, _body)` — silmek yerine `edited_at` + history JSONB sütunu (`edit_history jsonb[]`); audit_logs entry.
- `report_target(_campaign_id, _comment_id, _reason_code, _description)` — duplicate open kontrol.
- `notify_on_comment` trigger: yorum eklendiğinde
  - parent_id NULL → kampanya creator'a `comment_on_campaign` (dedupe per (creator, comment_id)).
  - parent_id NOT NULL → orijinal author'a `creator_reply` (yalnız reply author == campaign creator ise).

### Auto-follow / opt-out
`profiles.auto_follow_on_pledge boolean default true` kolonu. Trigger okur.

## 2. Frontend

### Hooks (src/hooks/social/)
- `useFavorite(campaignId)` — TanStack mutation, optimistic toggle, rollback on error, query invalidation.
- `useFollow(campaignId)` — aynı.
- `useCampaignComments(campaignId)` — `useInfiniteQuery`.
- `useCreateComment`, `useEditComment`, `useDeleteComment`, `useReportTarget`.
- `useNotifications()` — list + mark-as-read.

### Bileşenler (src/components/social/)
- `FavoriteButton` — auth değilse login modal/redirect CTA.
- `FollowButton` — aynı.
- `ShareMenu` — `navigator.share` varsa kullan; yoksa clipboard copy + toast.
- `CommentList`, `CommentItem` (creator badge), `CommentComposer`, `CommentEditor`.
- `ReportDialog` — reason_code select (`spam|inappropriate|policy|fraud|other`) + textarea (min 10, max 500).
- `NotificationBell` + `NotificationList` dropdown (in-app feed).

### Sayfa entegrasyonları
- `campaigns.$slug.tsx`: FavoriteButton, FollowButton, ShareMenu, Updates sekmesi, Comments sekmesi, ReportDialog (creator + comment için).
- Creator dashboard `creator.campaigns.$campaignId.updates.tsx` yeni route: update draft/publish UI.
- Yeni `_authenticated/notifications.tsx` — bildirim merkezi.

### XSS güvenliği
Yorum body sanitize: client'ta `DOMPurify` ile render veya markdown-it + sanitize; `dangerouslySetInnerHTML` kullanılmayacak — düz metin + link auto-detect (escape edilmiş anchor).

## 3. Testler (Vitest)
- `social/favorites.test.ts` — duplicate insert RPC ile no-op.
- `social/comments.rls.test.ts` — user_a, user_b yorumunu edit edemez (anon supabase client iki kullanıcı).
- `social/comments-moderation.test.ts` — hidden comment public SELECT'ten gizlenir; creator hide edemez, admin edebilir.
- `social/reports.test.ts` — creator kendi kampanyasına yapılan raporu görmez; reporter kendi raporunun statüsünü görür; internal note görmez.
- `social/xss.test.tsx` — `<script>` payload render edilmez (CommentItem snapshot).
- `social/updates.test.ts` — publish çağrısı iki kez → ikinci no-op, notification sayısı sabit.
- `social/auth-gate.test.tsx` — anon yorum denemesi login'e yönlendirir.

## 4. Dokümantasyon / manuel adımlar
- Auto-follow davranışı + opt-out toggle Settings/Account sayfasına eklenir.
- README/docs: yorum edit penceresi 15 dk, rate limit 60 sn/5 mesaj.
- Admin moderation aksiyonları Faz 11 admin UI'ına eklenir (hide comment, resolve report).

## 5. Doğrulama
- `bunx tsc --noEmit`, `bunx vitest run`, `bun run lint`, build.
- Manuel: iki tarayıcı oturumu ile favorite/follow/comment/report/report-visibility/notification fan-out.

## Açık riskler / kapsam dışı
- DM, canlı sohbet, mention parsing → ileri faz.
- Notification e-mail kanalı → ileri faz; bu fazda yalnız in-app.
- Comment markdown / image upload yok; düz metin + auto-link.
- Rate limit DB tabanlı; gelişmiş anti-spam (captcha, IP) ileri faz.
- Edit history sınırsız büyüyebilir → ileride trim job.
