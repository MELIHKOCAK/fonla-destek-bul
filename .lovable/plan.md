# Faz 6 — Gerçek Authentication + Profil Akışı

## Hedef
Mock auth formlarını gerçek Lovable Cloud auth'a bağlamak; profiles şemasını canlı kullanmak; route guard altyapısı + onboarding + avatar yükleme kurmak. Kampanya/ödeme bağlanmayacak; admin paneli yapılmayacak (sadece guard hazırlanır).

## Önkoşullar (manuel adımlar)
1. **Auth ayarları**: `supabase--configure_auth` ile `auto_confirm_email: false` (e-posta doğrulama açık), `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true`.
2. **Google sign-in**: `supabase--configure_social_auth` providers `["google"]` — yönetilen credentials.
3. **Avatar bucket**: `supabase--storage_create_bucket` `avatars`, public=true (avatar görünürlüğü için, RLS write sahibi kontrolü).
4. **Email confirm URL**: Cloud → Auth → URL Configuration; site URL = preview URL, redirect allowlist = `/auth/callback`, `/reset-password`. Kullanıcının dashboard'da bir kez kontrol etmesi gerekir.

## Migration (V2 — auth bağlama)

Tek migration:

1. **Reserved usernames helper** + **handle_new_user trigger**:
   - `public.is_username_reserved(text)` — sabit liste (admin, support, benifonla, api, auth, login, register, settings, profile, dashboard, root, system, help, info).
   - `public.handle_new_user()` SECURITY DEFINER, search_path=public:
     - Insert `profiles(id, display_name)` — display_name yalnızca `raw_user_meta_data->>'display_name'` (max 100), username ASLA trigger içinde set edilmez (atomik onboarding'de kullanıcı seçer).
     - Insert hatalı olursa `EXCEPTION WHEN unique_violation THEN null`; auth user bozulmaz.
   - Trigger `on auth.users after insert`.
2. **Username availability RPC**: `public.check_username_available(_username citext) returns boolean` SECURITY DEFINER — reserved + tablo lookup. Authenticated rolüne grant.
3. **Atomic username claim RPC**: `public.claim_username(_username citext) returns void` SECURITY DEFINER — caller `auth.uid()`; format check, reserved kontrol, profile UPDATE WHERE id = auth.uid() AND (username IS NULL OR username = _username). Çakışmada unique violation → "kullanılıyor" hatası.
4. **Storage RLS policies** (`storage.objects`, bucket=`avatars`):
   - SELECT: herkese açık (public bucket).
   - INSERT/UPDATE/DELETE: `auth.uid()::text = (storage.foldername(name))[1]` (kullanıcı sadece kendi `<user_id>/...` klasörüne yazabilir).
5. **profiles GRANT genişletme**: zaten OK; ekstra yok.

> RLS politikaları Faz 5'te tanımlı (`profiles_self_update`, `profiles_public_read`, `profiles_self_read`, `user_roles_self_read`). Yeniden yazılmayacak.

## Frontend Mimarisi

### Auth merkez
- `src/integrations/supabase/client.ts` (auto-gen) zaten mevcut — kullanılacak.
- `src/hooks/use-auth.tsx` (React context provider):
  - `onAuthStateChange` subscriber root'ta bir kez (`__root.tsx`).
  - `session`, `user`, `profile`, `loading`, `signOut`, `refreshProfile`.
  - Profil `profiles` tablosundan single-row fetch.
  - **Sign-out hijyeni**: `cancelQueries → clear → signOut → navigate('/auth', replace)` (knowledge'tan).
  - Auth state listener event'leri filtreli: SIGNED_IN/SIGNED_OUT/USER_UPDATED.

### Route grupları
- `src/routes/_authenticated/route.tsx` — entegrasyon yönetiminde (mevcut değilse, ssr:false + getUser redirect /auth pattern).
  - **NOT**: TanStack Supabase entegrasyon yönergesi bu dosyayı "managed" sayıyor; oluşturulurken auth-callback flow ile çakışmamalı. Bu projede henüz yok → oluşturulacak, knowledge'taki tam şablonla.
- Yeni route dosyaları (flat dot-notation):
  - `auth.tsx` — login/register sekmeli sayfa (TanStack Supabase yönergesi `/auth` redirect kullanıyor; mevcut `/login` ve `/register` linklerini de korumak için her ikisi de var olacak).
  - `login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `auth.callback.tsx`, `unauthorized.tsx`.
  - `_authenticated/route.tsx` (gate).
  - `_authenticated/dashboard.tsx` (basit hoşgeldin + profil özeti).
  - `_authenticated/onboarding.tsx` (username yoksa yönlendirilir).
  - `_authenticated/settings.tsx` (layout, Outlet).
  - `_authenticated/settings.profile.tsx`, `_authenticated/settings.account.tsx`.
  - `_authenticated/_admin/route.tsx` — admin guard pathless layout (`has_role(uid, 'admin')` kontrolü; başarısız → `/unauthorized`). **İçi boş** — sadece guard altyapısı.

### Form bağlama (mevcut dosyalar güncellenir, gereksiz yeniden yazılmaz)
- `LoginForm.tsx` → gerçek `supabase.auth.signInWithPassword`. `useDemoSubmit` kaldırılır. Google butonu eklenir (`lovable.auth.signInWithOAuth("google")`).
- `RegisterForm.tsx` → schema güncellenir:
  - `email`, `password` (min 10, en az 1 büyük + 1 küçük + 1 rakam), `passwordConfirmation`, `displayName` (2–100), `username` (^[a-z0-9_]{3,30}$ + reserved check via RPC debounced), `termsAccepted: literal(true)`, `marketingConsent: boolean default false`.
  - `signUp({ email, password, options: { data: { display_name, marketing_consent }, emailRedirectTo: <origin>/auth/callback } })`.
  - Submit sonrası "E-posta doğrulama gönderildi" ekranı (account enumeration sızdırmadan generic mesaj).
- `ForgotPasswordForm.tsx` → `resetPasswordForEmail(email, { redirectTo: <origin>/reset-password })`. Generic başarı mesajı her durumda.
- Yeni `ResetPasswordForm.tsx` → recovery token kontrolü, `updateUser({ password })`.
- Yeni `OnboardingForm.tsx` → username + displayName, `claim_username` RPC çağrısı.
- Yeni `ProfileForm.tsx` → display_name, bio, location, website, is_public, avatar.
- Yeni `AvatarUploader.tsx` → MIME (image/jpeg|png|webp), max 5MB, path `<uid>/<uuid>.<ext>`, eski silme best-effort, hata yutmadan toast.

### Korumalı bileşenler
- `ProtectedRoute` — pratikte gerekmiyor; route gate yapıyor. Sadece component-level conditional render için `useAuth().user` kullanılır.
- `AdminRoute` — admin layout `beforeLoad` server fn `has_role` çağırır.

### Server functions (createServerFn)
- `src/lib/auth.functions.ts`:
  - `checkUsernameAvailable({ username })` — public (anon ok); RPC çağrısı.
  - `claimUsername({ username })` — `requireSupabaseAuth`, RPC.
  - `isAdmin()` — `requireSupabaseAuth`, `has_role(uid, 'admin')`.
- `src/lib/profile.functions.ts`:
  - `getMyProfile()` — `requireSupabaseAuth`.
  - `updateMyProfile(...)` — `requireSupabaseAuth`, profiles update WHERE id = auth.uid() (RLS de korur).

### Header güncellemesi
- `AppHeader` — `useAuth()` ile signed-in durumda avatar dropdown (Profil, Ayarlar, Çıkış); aksi halde "Giriş Yap" + "Kayıt Ol".

### Error UX
- Tüm auth callbacks: invalid/expired token, already verified, rate limit, network → toast + sayfa içi panel. Teknik hata yutulmaz, kullanıcıya generic Türkçe mesaj + console'a debug log.
- Forgot password ve register: "varsa e-posta gönderildi" (enumeration koruması).

## Testler (vitest)
- `useAuth` provider: loading → authenticated/unauthenticated geçişleri (mock supabase).
- Register Zod schema (parola gücü, eşleşme, username format, reserved).
- Onboarding form: username debouncing happy path.
- Profile mapper (db row → UI type).
- `_authenticated/route` guard birim testi: getUser null → redirect.

## Browser doğrulama (10 senaryo)
1–10 (görev metnindeki tüm senaryolar) browser tool ile preview üzerinde çalıştırılacak. Test e-postası kullanıcının kendi adresi ile. E-posta doğrulama bağlantısı geliyorsa otomatik test edilemez → bilgi olarak raporlanır.

## Faz dışı bırakılanlar
- Admin paneli içeriği (sadece guard).
- Kampanya/ödeme bağlama.
- Hesap silme (danger zone yalnızca taslak, devre dışı buton).
- E-posta adresi değiştirme akışı (placeholder UI).
- 2FA, magic link.

## Açık riskler
- Lovable yönetimli `_authenticated` layout şablonu otomatik üretilmezse manuel oluşturulur (knowledge'tan birebir).
- E-posta doğrulaması Lovable Emails domain'i kurulu değilse default şablonla gider. Bu fazda **özel auth email scaffold'u yapılmayacak**; gerekirse ayrı fazda.
- Önceki Faz 4'ten kalan lint hataları ve 2 başarısız test bu faz scope'unda dokunulan dosyalarda kalmışsa düzeltilecek; geri kalanlar Faz 7'ye kalır.

## Raporlanacak
Çalışan ve çalışmayan browser senaryoları, eklenen route'lar, formlar, server fn'leri, migration özeti, manuel adımlar (auth ayarları, bucket onayı, redirect URL), açık riskler.
