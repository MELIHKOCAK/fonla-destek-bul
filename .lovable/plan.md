
# BeniFonla — AppHeader & Profil Menüsü İyileştirmesi

## Hedef
Mevcut `AppHeader` + `UserMenu` + `NotificationBell` + `MobileNavigation` yapısı korunarak; rol bazlı (user / creator / admin) profil menüsü, "Kampanya Başlat" CTA'sı ve içerik dolu bir mobil drawer eklenir. Paralel auth/profile state veya ikinci navbar oluşturulmaz.

## Mevcut altyapı (yeniden kullanılacak)
- Auth/profile/role: `src/app/auth/AuthProvider.tsx` (`useAuth` → `status`, `user`, `profile`, `isAdmin`, `signOut`)
- Bildirim: `NotificationBell` + `useMyNotifications` (zaten gerçek veriye bağlı)
- Avatar imzalı URL: `src/lib/auth/avatar.ts` `getAvatarUrl`
- shadcn `DropdownMenu`, `Sheet`, `Avatar`, `Button`, `Badge`
- Tema: `ThemeToggle`
- Route'lar: `/`, `/discover`, `/how-it-works`, `/about`, `/login`, `/register`, `/notifications`, `/_authenticated/dashboard(.contributions|.favorites|.payments|.refunds|.rewards)`, `/_authenticated/settings(.profile|.security|.notifications|.account)`, `/_authenticated/creator(.index|.campaigns(.index|.new)|.payment-account)`, `/_authenticated/admin(.index|.campaign-reviews.index|.system-alerts|.audit)`, `/creators/$username`

## Rol tespiti
- `isAdmin`: zaten `useAuth` üzerinden `user_roles` tablosundan güvenli okunuyor — aynen kullan.
- Creator: ayrı bir `user_roles.role = 'creator'` kontrolü mevcut değil; bu görev kapsamında yeni rol sistemi kurulmayacak. Bunun yerine `AuthProvider`'a hâlihazırdaki sorguya ek olarak `isCreator` türetilecek: `user_roles.role IN ('creator','admin')` varsa true; aksi halde `campaigns` tablosunda kullanıcıya ait kayıt olup olmadığı **yerine** sadece rol tablosuna dayanılır. Eğer `creator` enum değeri yoksa `isCreator = false` döner ve creator menü öğeleri herkese gizlenir — bu durum raporda "eksik" olarak bildirilir, yeni enum eklenmez. (Bu yalnız UI gizlemesidir; route'ların kendi guard'ları korunur.)

## Değişiklikler

### 1. `src/app/auth/AuthProvider.tsx`
- `loadProfile` içinde role satırlarından `isCreator` türet (`roles.includes('creator') || roles.includes('admin')`).
- Context value'ya `isCreator: boolean` ekle.

### 2. `src/components/layout/NavLinks.tsx`
- NAV_LINKS'e iki yeni öğe ekle: `Kategoriler` → `/discover` (kategori index route'u yok, en yakın eşleşmeye bağlanır, raporda belirtilir), `Kampanya Başlat` → authenticated ise `/creator/campaigns/new`, değilse `/login?redirect=/creator/campaigns/new`.
- `Kampanya Başlat` görsel olarak ayrı (outline veya primary-subtle variant ile) ama agresif olmayan bir vurgu.
- Mobil/desktop tek konfigden render edilir.

### 3. `src/components/layout/UserMenu.tsx` (genişletilir)
- Header'da: avatar + display_name + username + (kendi menüsü olduğu için) e-posta + rol rozeti (Kullanıcı / Proje Sahibi / Admin).
- Standart öğeler: Profilim (`/creators/$username` — username varsa), Profilimi Düzenle (`/settings/profile`), Desteklediğim Projeler (`/dashboard/contributions`), Favorilerim (`/dashboard/favorites`), Bildirimler (`/notifications`), Hesap Ayarları (`/settings/account`), Güvenlik (`/settings/security`).
- `isCreator` ise ayraç + Creator Paneli (`/creator`), Kampanyalarım (`/creator/campaigns`), Yeni Kampanya (`/creator/campaigns/new`), Ödeme Hesabı (`/creator/payment-account`). "İnceleme Durumu" için ayrı route yok → Kampanyalarım altında ele alınır, raporda not düşülür.
- `isAdmin` ise ayraç + Admin Paneli (`/admin`), Kampanya İncelemeleri (`/admin/campaign-reviews`), Sistem Uyarıları (`/admin/system-alerts`), Denetim Kaydı (`/admin/audit`). "Şikâyetler" / "Ödeme Operasyonları" için ayrı route yok → gizlenir, raporda belirtilir.
- Username yoksa "Profilim" gizlenir (onboarding gate zaten yönlendirir).
- Menü konfigürasyonu tek `getMenuConfig({ isCreator, isAdmin, username })` fonksiyonundan üretilir; mobil drawer da aynı kaynağı tüketir.
- Çıkış: mevcut `signOut` (zaten cache.clear + auth signOut yapıyor) sonrası `toast.success` + `/` adresine `replace` navigasyon. Hatada `toast.error`.
- Loading status'unda ufak skeleton (h-9 w-9 rounded-full) render, guest butonları flaş etmesin.

### 4. `src/components/layout/MobileNavigation.tsx`
- `MobileAuthActions` yerine `useAuth` ile durum bazlı içerik:
  - Loading: skeleton.
  - Guest: Giriş Yap / Kayıt Ol.
  - Authenticated: profil başlığı (avatar + ad + rol), ardından `getMenuConfig` ile profil + creator + admin bağlantıları, sonda Çıkış Yap (destructive renk tonu).
- Ana nav linkleri zaten `NavLinks variant="vertical"` ile render ediliyor — korunur.
- Route değiştiğinde drawer kapanır (`onNavigate`).

### 5. `src/components/layout/AppHeader.tsx`
- Üç bölümlü grid'i koru. Sticky zaten var.
- Loading state için sağ tarafta skeleton.
- Uzun display_name için `max-w-[140px] truncate`.

### 6. Yeni yardımcı
- `src/components/layout/userMenuConfig.ts`: `ProfileMenuItem` tipi + `getProfileMenuItems({ isCreator, isAdmin, username })` saf fonksiyon. Lucide ikon referansları içerir, `action: 'logout'` destekler.

### 7. Testler
- `src/components/layout/__tests__/UserMenu.test.tsx`: guest/auth/creator/admin görünürlüğü, logout signOut çağırıyor, avatar fallback initials, uzun ad truncate.
- `src/components/layout/__tests__/userMenuConfig.test.ts`: rol bazlı liste filtreleme.
- Mevcut `MobileNavigation.test.tsx` güncellenir (auth bazlı render).

## Yapılmayacaklar
- Yeni route, sayfa, tablo, RPC, RLS, edge function.
- `categories` index, "şikâyetler", "ödeme operasyonları" route'ları (yok, raporda eksik olarak belirtilir).
- Auth sisteminin değiştirilmesi; yeni `useAuth` kopyası.
- `user_roles` enum'una `creator` eklenmesi (kapsam dışı).

## Doğrulama
- Bun typecheck + vitest + build (harness).
- Manuel: mobil 320px taşma, dark mode, klavyeyle dropdown gezintisi, logout sonrası cache temizliği.

## Çıktı raporu (10 başlık)
İmplementasyon sonunda istenen formatta rapor verilecek; eksik route'lar ("kategoriler index", "creator inceleme durumu", "şikâyetler", "ödeme operasyonları") ve `user_roles` içinde `creator` enum değerinin yokluğu açıkça belirtilecek.
