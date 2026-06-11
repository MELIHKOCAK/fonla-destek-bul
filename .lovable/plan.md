# Plan: AppHeader'ı tüm sayfalara taşı + guest görünümünü sadeleştir

## Hedef
1. Yeni `AppHeader` (ile `AppShell`) **istisnasız tüm sayfalarda** en üstte yer alsın.
2. Guest (oturum açmamış) kullanıcılar için header'da şunlar **gizlensin**:
   - "Kampanya başlat" CTA (desktop + mobile drawer)
   - Bildirim çanı (`NotificationBell`)
   - Profil avatarı / `UserMenu`
   - Yalnızca: logo, ana nav linkleri, tema toggle, "Giriş yap" + "Kayıt ol", mobil menü düğmesi görünür.
3. User ve Admin görünümünde değişiklik yok.

## Yaklaşım — Tek noktadan AppShell

Şu an shell sarmalama dağınık: bazı sayfa route'ları (`about`, `contact`, `faq`, `how-it-works`, `unauthorized`) `AppShell` kullanıyor, çoğu (`index`, `discover`, `search`, `campaigns/$slug`, `creators/$username`, `categories/$slug`, legal sayfaları, design-system, `$`, `campaigns/$slug/back/*`) hiç sarmıyor. `_authenticated/route.tsx` kendi içinde `AppShell` kullanıyor. Auth sayfaları (`login`, `register`, `forgot-password`, `reset-password`, `auth/callback`) `AuthLayout` kullanıyor.

Kullanıcı **tüm sayfalarda** (auth + back flow dahil) yeni navbar'ı istiyor. En temiz çözüm: `__root.tsx` içindeki `<Outlet />`'i tek `AppShell` ile sarmak ve diğer sarmaları kaldırmak.

### Değişiklikler

1. **`src/routes/__root.tsx`** — `RootComponent` içinde `<Outlet />` `AppShell` ile sarılır. `NotFoundComponent` ve `ErrorComponent` artık iç içe shell vermemek için `AppShell` sarmalını kaldırır (zaten root'tan gelecek).

2. **`src/routes/_authenticated/route.tsx`** — İçerideki `AppShell` kullanımı kaldırılır, `<Outlet />` doğrudan render edilir (oturum kontrolü ve onboarding yönlendirme korunur). "Oturum kontrol ediliyor…" placeholder'ı da shell'siz döner.

3. **`AuthLayout` (`src/components/layout/AuthLayout.tsx`)** — Kendi mini header'ı (logo + tema) kaldırılır; `<main>` sarmalayıcısı korunur (kart düzeni aynı kalır), `min-h-screen` yerine sayfa içeriğine uygun düzen. Böylece root'tan gelen `AppHeader` üstte tek başına görünür ve auth sayfalarında çift header oluşmaz.

4. **Sayfa-bazlı `AppShell` kullanımlarını temizle** (artık root sağlıyor):
   - `src/routes/about.tsx`, `contact.tsx`, `faq.tsx`, `how-it-works.tsx`, `unauthorized.tsx` — `AppShell` import + sarmalı kaldır, içerik doğrudan döner.

5. **`AppHeader` (`src/components/layout/AppHeader.tsx`)** — guest sadeleştirmesi:
   - "Kampanya başlat" `Button` artık yalnızca `status === "authenticated"` ise render edilir.
   - `NotificationBell` ve `UserMenu` zaten authenticated dalında — değişiklik yok.
   - Guest dalı sade kalır: "Giriş yap" + "Kayıt ol" + tema + mobil menü.
   - `loading` durumunda küçük skeleton görünmeye devam eder; ancak guest sadeleştirmesi gereği yalnızca avatar skeleton'ı yerine boş tutulabilir (mevcut davranış korunur, sadece CTA gizlenir).

6. **`MobileNavigation` (`src/components/layout/MobileNavigation.tsx`)** — guest drawer sadeleştirmesi:
   - "Kampanya başlat" butonu yalnızca authenticated ise gösterilir (auth bölümünden önce yerine, üstte koşullu render).
   - Guest dalı: ana nav linkleri + "Giriş yap" / "Kayıt ol". CTA yok, profil bloğu yok (zaten yok).
   - Authenticated davranış aynı kalır.

7. **Testler** — `MobileNavigation.test.tsx` güncellenir: guest durumunda "Kampanya başlat" butonunun render edilmediği assert edilir; authenticated durumda hâlâ render edildiği doğrulanır. Mümkünse `AppHeader` için minimal bir render testi eklenir (guest → CTA/bell yok, authenticated → CTA var).

## Kapsam dışı
- Yeni route, sayfa, RPC, RLS, tablo, edge function eklenmez.
- `NotificationBell`, `UserMenu`, `userMenuConfig`, `NavLinks` davranışları değişmez.
- Tema, auth altyapısı, rol türetimi değişmez.

## Riskler / dikkat
- `_authenticated/route.tsx`'in shell'i kaldırıldığında root shell devreye girer; korumalı sayfalarda görünüm değişmemeli (aynı `AppHeader` + `AppFooter`).
- `AuthLayout`'tan header kaldırılınca giriş/kayıt sayfalarının üstünde tek bir global navbar görünür — kullanıcı bunu onayladı.
- `__root.tsx` `ErrorComponent`/`NotFoundComponent` artık çift shell oluşturmamalı; sarmalar kaldırılacak.

## Doğrulama
- `bunx tsc --noEmit`, `bunx eslint`, `bunx vitest run`, prod build.
- Preview üzerinde: guest olarak `/`, `/discover`, `/login`, `/about`, `/campaigns/$slug` ve `/campaigns/$slug/back` — navbar üstte, CTA + bell + avatar yok. Authenticated olarak aynı sayfalar — CTA + bell + avatar var. Mobil drawer her iki durumda doğru.
