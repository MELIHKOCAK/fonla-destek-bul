
## Sorun analizi

Konsoldaki en kritik hata, ana sayfanın boş kalmasının doğrudan nedeni:

```
A tree hydrated but some attributes of the server rendered HTML didn't match...
<html lang="tr"
-  style={{color-scheme:"light"}}
```

### Kök neden

`src/app/theme/theme-script.ts` içindeki `themeInitScript`, `<head>`'te senkron çalışıp `document.documentElement.style.colorScheme = 'light' | 'dark'` yazıyor (FOUC önlemek için, doğru davranış). Ancak:

- SSR HTML'i `<html lang="tr">` — `style` yok.
- Tarayıcıda, React hydrate olmadan **önce** inline script `colorScheme` style'ını ekliyor.
- React 19 + TanStack Start, `<html>` üzerindeki bu DOM/SSR farkını "hydration mismatch" sayıyor. React 19'da kök elementteki uyumsuzluk, ağacın hydrate olamamasına ve istemcide tamamen yeniden render denemesine yol açıyor — bu da preview'da blank/SSR error olarak görünüyor.

### Yan etki

Önceki turda `ThemeProvider`'da yapılan "ilk render her zaman `system` + `light` ile başlasın" düzeltmesi React tree mismatch'ini çözdü, ama gerçek mismatch React tree'de değil, **`<html>` elementinde** — onu inline script üretiyor. Bu yüzden hata tekrar etti.

## Çözüm

### Tek dosya değişikliği: `src/routes/__root.tsx`

`RootShell`'deki `<html>` (ve emniyet için `<body>`) elementine `suppressHydrationWarning` ekle:

```tsx
<html lang="tr" suppressHydrationWarning>
  <head><HeadContent /></head>
  <body suppressHydrationWarning>
    {children}
    <Scripts />
  </body>
</html>
```

`suppressHydrationWarning` sadece **o elementin kendi attribute'larında** uyarıyı bastırır — alt ağaçtaki gerçek mismatch'leri gizlemez. Bu, "tema initleyen inline script" deseni için React'in resmi olarak önerdiği yaklaşımdır.

### Neden ek değişiklik gerekmiyor

- `themeInitScript` doğru çalışıyor, FOUC'u önlüyor — kaldırmak istemiyoruz.
- `ThemeProvider`'daki "ilk render `system`+`light`" geçici hack'i artık gereksiz; ama bunu **bu turda dokunmadan bırakıyorum** (kullanıcı sadece ana sayfa için düzeltme istedi, davranışı bozma riski yok). İstenirse ayrı bir turda geri sadeleştirilebilir.

## Diğer kontrol edilen olası sorunlar

İncelediğim ve **şu an müdahale gerektirmeyen** durumlar:

- AI chat 503 hatası: önceki turlarda `AI_CHAT_ENABLED=true` ile çözüldü; hata mesajı oturum tekrarı (session replay) eski olduğu için görünüyor.
- `/notifications`, `/creator` ve `/back` ile ilgili önceki turlarda yapılan düzeltmeler etkilenmiyor.
- Routing, root layout (`__root.tsx`), `_authenticated` gate ve `getRouter` doğru kurulu — başka SSR-kıran kod yolu bulamadım.

## Doğrulama

Düzeltmeden sonra:
1. Preview'da `/` yüklenmeli, hydration mismatch uyarısı kaybolmalı.
2. Tema değiştirme (light/dark/system) hâlâ çalışmalı, FOUC olmamalı.
3. Diğer rotaların (`/discover`, `/dashboard`, `/campaigns/...`) etkilenmediği gözle kontrol edilecek.
