
## Amaç

Kampanya detay sayfasındaki tüm metin bölümlerini "Medium/Substack" benzeri rahat bir okuma diline taşımak: ~17–18px gövde, gevşek satır aralığı, sınırlı satır genişliği (~65–75 karakter), net başlık/liste hiyerarşisi. Mevcut tasarım dili (renk tokenları, kart yapısı) korunur — yalnız tipografi ve ritim güçlenir.

## Yapılacaklar

### 1) `RichTextViewer` — okuma tipografisi (tek kaynak)
`src/components/common/RichTextViewer.tsx`:
- Varsayılan sınıfı `prose prose-lg` (≈18px, geniş leading) olarak değiştir; `prose-sm` kaldır.
- `max-w-prose` (≈65ch) varsayılan olsun; tüketici `className`'le `max-w-none` geçebilsin.
- `dark:prose-invert` kalsın.
- Element bazlı ince ayarlar (Tailwind v4 prose modifier'ları ile):
  - `prose-headings:font-semibold prose-headings:tracking-tight`
  - `prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl`
  - `prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-lg`
  - `prose-p:leading-relaxed prose-p:my-4`
  - `prose-li:my-1 prose-ul:my-4 prose-ol:my-4 marker:text-muted-foreground`
  - `prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:not-italic`
  - `prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:opacity-80`
  - `prose-hr:my-8 prose-hr:border-border`
  - `prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:hidden prose-code:after:hidden`

### 2) Detay sayfası — boyut zorlamalarını kaldır
`src/pages/CampaignDetailPage.tsx` içindeki 4 `RichTextViewer` çağrısından `className="text-sm"` ve `className="text-sm sm:text-base"` kaldırılsın; viewer'ın kendi okuma stili kullanılsın. Hikâye dahil hepsi aynı dil.

### 3) Section ritmi
`Section` bileşeninin başlığı ve içerik üst boşluğu okuma ritmiyle uyumlu olsun: section başlığı `text-lg font-semibold tracking-tight`, içerik `mt-3 sm:mt-4`. Bölümler arası dikey ritim `space-y-8 sm:space-y-10` (mevcut `space-y-*` değeri buna eşitlenir; daha küçükse büyütülür).

### 4) Diğer metin alanlarını aynı dile çek (kapsam: tüm detay sayfası)
- **Ödül paketleri** (`reward-tiers`):
  - Kart başlığı `text-base font-semibold` (sm yerine), açıklama `text-sm leading-relaxed text-muted-foreground`, "Tahmini teslim" satırı `text-xs uppercase tracking-wide text-muted-foreground` etiketi + `text-sm text-foreground` değer ile yeniden düzenle.
  - Kartlar arası boşluk `gap-4`.
- **Güncellemeler / yorumlar / SSS** gibi metin bloklarında body `text-base leading-relaxed`, meta satırları `text-xs text-muted-foreground` olsun. (Bu bölümler dosyada tespit edilecek; yalnızca tipografi rötuşu.)
- **AI özet kartı**: gövde `text-base leading-relaxed`, başlık `text-lg font-semibold` — kart yapısına dokunulmaz.

### 5) Mobile-first kontrol
- `prose prose-lg` mobilde `text-[17px]` civarı oturur; çok geniş hissedilirse `prose-base sm:prose-lg` ile mobilde 16px / desktop 18px ayarına çekilir (eşik karar verme: tek bir manuel preview kontrolünden sonra netleşir).
- `max-w-prose` sayesinde geniş ekranda satır 65ch ile sınırlanır; sticky destek paneli zaten sağda olduğu için ana sütun ortalanmaz, sola hizalı kalır.

### 6) Doğrulama
- Build sonrası kampanya detayını mobil (375px) ve desktop (1440px) genişliklerinde göz at; uzun paragraflarda satır uzunluğu, başlık ↔ paragraf boşluğu, liste girinti/marker okunabilirliği teyit edilsin.
- Görsel regresyon: AI özet kartı, ödül kartları, metrik kartı yan yana hâlâ düzgün hizalı olmalı.

## Teknik notlar

- Tailwind v4 + `@plugin "@tailwindcss/typography"` zaten yüklü; ekstra paket gerekmiyor.
- `RichTextViewer` API'si (props) değişmiyor; sadece varsayılan className zenginleşiyor. Mevcut çağıranlar `className` ile override edebilir; gerçek override gerekirse `max-w-none` ile geçilebilir.
- Renk/spacing/shadow tokenları aynı kalıyor — `text-white` / `bg-black` gibi sabit renk kullanılmıyor.
- Erişilebilirlik: kontrast oranı `--foreground` token'ı zaten karşılıyor; `prose-a:underline-offset-4` link odak/hover ipucunu güçlendirir.

## Dokunulacak dosyalar

- `src/components/common/RichTextViewer.tsx`
- `src/pages/CampaignDetailPage.tsx`
- Olası küçük rötuş: `Section` bileşeni aynı dosyada yer alıyorsa orada; ayrıysa kendi dosyasında.
