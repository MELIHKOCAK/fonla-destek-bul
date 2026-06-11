Demo/placeholder olarak işaretlenmiş tüm akışları gerçek implementasyonlarla değiştireceğim. Kapsam büyük olduğu için fazlara böldüm; her faz bağımsız test edilebilir bir milestone'dur.

## Faz 1 — Veritabanı & altyapı (1 migration + e-posta altyapısı)
- `contact_messages` tablosu: ad, e-posta, konu, mesaj, status (`new|read|resolved`), `user_id` (opsiyonel), IP/UA. RLS: insert herkese açık, select sadece admin (`has_role(auth.uid(),'admin')`).
- `campaign_comments` zaten var → insert/select RLS politikalarını gözden geçir; yorum yazma için authenticated kullanıcıya insert izni.
- `campaign_reports` zaten var → kullanıcı insert akışı için RLS doğrula.
- E-posta altyapısı: `email_domain--setup_email_infra` + Lovable Emails ile iletişim formu için "yöneticiye bildirim" + "kullanıcıya teşekkür" şablonları (`scaffold_transactional_email` + `scaffold_auth_email_templates`).

## Faz 2 — İletişim formu (gerçek e-posta + DB kaydı)
- `src/lib/contact/api.ts`: `submitContactMessage` serverFn — Zod doğrulama, `contact_messages` insert (service role), `sendTransactionalEmail` ile teyit e-postası.
- `ContactForm.tsx`: `useDemoSubmit` kaldırıldı, gerçek mutation + toast.
- `use-demo-submit.ts` artık başka yerde kullanılmıyorsa kaldırılacak.

## Faz 3 — Şikâyet (ReportDialog)
- `src/lib/reports/api.ts`: `submitCampaignReport` serverFn (auth zorunlu), `campaign_reports` insert.
- `ReportDialog.tsx`: `campaignId` prop ekle, gerçek mutation; demo metni temizle.
- `CampaignDetailPage.tsx`: dialog'a kampanya ID'sini geçir.

## Faz 4 — Yorum yazma (CampaignDetailPage)
- `src/lib/comments/api.ts`: `addCampaignComment` serverFn (auth zorunlu, kampanya bekleyen/aktif kontrolü, length kontrolü).
- `CampaignDetailPage` "Yorumlar" bölümüne yorum formu (sadece giriş yapmış kullanıcılara; misafire "Yorum yapmak için giriş yapın" CTA).
- Yorumları gerçek zamanlı yenilemek için React Query invalidate.

## Faz 5 — Hesap silme + e-posta değiştirme
- `src/lib/account/api.ts`:
  - `requestEmailChange` serverFn → `supabase.auth.updateUser({ email })` admin client + onay e-postası (Supabase yerleşik akışı kullanır).
  - `deleteAccount` serverFn → kullanıcı onayı (e-postasını yazmak), admin client ile `auth.admin.deleteUser(userId)`.
- `settings.account.tsx`: "yakında" kaldır; e-posta değiştirme formu + onay dialog'lu hesap silme.

## Faz 6 — Ödeme UI'sini aktif et (sandbox kal)
- `SupportCtaDialog`: "Demo aşaması" başlığını kaldır; misafir → giriş CTA, giriş yapmış → ödeme akışına yönlendir (mevcut `/contributions/...` veya `/checkout` route'u).
- `CampaignDetailPage`: "Demo aşaması: gerçek ödeme alınmaz" metnini "Test modu — sandbox ödeme" şeklinde yumuşat (ödeme entegrasyonu hâlihazırda sandbox).
- `HomePage`: "Demo aşamasında sandbox..." metnini düz "Sandbox modda güvenli ödeme test edilir." şeklinde yeniden yaz.
- `creator.payment-account.tsx`: mevcut Stripe sandbox onboarding'i UI'de açık göster.

## Faz 7 — Mock servis katmanı temizliği
- `src/services/campaigns.service.ts`, `categories.service.ts`, `creators.service.ts` mock döndüren fonksiyonlar gerçek `src/lib/*/api.ts` çağrılarına proxy olacak.
- Test dışı `src/services/mock/` ve `src/mocks/` kullanımları kaldırılacak (DesignSystem hariç tutulmaz — bu sayfa renk paletini sergilediği için sadece statik veriyle güncellenecek).

## Faz 8 — Doğrulama
- `bunx vitest run` (etkilenen test dosyaları).
- Manuel: iletişim formu, şikâyet, yorum, hesap silme onayı, e-posta değiştirme isteği, kampanya destek butonu.
- Build sağlığı.

## Teknik notlar
- Service role isteyen tüm yazma işlemleri `createServerFn` + `requireSupabaseAuth` içinde, `client.server` handler-içi `await import()` ile.
- Tüm input'lar Zod ile (uzunluk + format).
- TR copy, sentence case, "Mesajı gönder" / "Şikâyeti gönder" / "Hesabı kalıcı olarak sil" gibi spesifik aksiyonlar.
- Hesap silme onayı: kullanıcı e-postasını yazıp "Hesabı sil" butonuna basmadan aktifleşmez.

## İlk dokunulacak dosyalar (özet)
- migration (Faz 1)
- src/lib/contact/api.ts (yeni)
- src/lib/reports/api.ts (yeni)
- src/lib/comments/api.ts (yeni)
- src/lib/account/api.ts (yeni)
- src/components/forms/ContactForm.tsx
- src/components/common/ReportDialog.tsx
- src/components/common/SupportCtaDialog.tsx
- src/components/campaign/CampaignCommentForm.tsx (yeni)
- src/pages/CampaignDetailPage.tsx
- src/pages/HomePage.tsx
- src/routes/_authenticated/settings.account.tsx
- src/services/campaigns.service.ts, categories.service.ts, creators.service.ts
- src/hooks/use-demo-submit.ts (silinecek)
