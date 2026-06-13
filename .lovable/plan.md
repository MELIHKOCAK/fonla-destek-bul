## Sorun

Destek ol akışındaki formlar dar ekranda bozuluyor:
- Layout header (`campaigns.$slug.back.tsx`): `flex flex-wrap justify-between` + uzun kampanya başlığı → başlık taşıyor, badge yan yana sıkışıyor.
- `StepIndicator`: 5 adım + ok karakterleri tek satıra sığmıyor, kötü kırılıyor.
- `back.index.tsx`: tek butonlu form mobil için tam genişlik değil.
- `back.reward.tsx`: ödül kartı başı `flex justify-between` — uzun başlık fiyatı dışarı itiyor; "Geri/Devam et" satırı dar ekranda dar kalıyor.
- `back.details.tsx`: Şehir/Posta kodu her zaman `grid-cols-2` (mobilde sıkışık); buton satırı mobilde tam genişlik değil.
- `back.review.tsx`: özet satırlarında uzun değerler ekrandan taşıyor (`flex justify-between` + `min-w-0` yok); butonlar mobilde tam genişlik değil.

## Yapılacaklar (yalnız sunum)

1. `src/routes/campaigns.$slug.back.tsx`
   - Header'ı `grid grid-cols-[minmax(0,1fr)_auto] gap-3 sm:flex sm:flex-wrap sm:justify-between` yap; sol blok `min-w-0`, başlık `truncate sm:text-xl text-lg`, badge `shrink-0`.

2. `src/components/back/StepIndicator.tsx`
   - `<ol>`'u mobilde yatay kaydırılabilir yap: `flex flex-nowrap overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:flex-wrap sm:mx-0 sm:px-0`.
   - Adım öğelerine `shrink-0` ekle.

3. `src/routes/campaigns.$slug.back.index.tsx`
   - Submit butonuna `w-full sm:w-auto`.

4. `src/routes/campaigns.$slug.back.reward.tsx`
   - Kart başlığı satırına `min-w-0`; başlık `truncate`; fiyat `shrink-0`.
   - Buton satırı `flex flex-col-reverse gap-2 sm:flex-row sm:gap-3`; her iki butona `w-full sm:w-auto`.

5. `src/routes/campaigns.$slug.back.details.tsx`
   - Şehir/Posta kodu grid'i `grid-cols-1 sm:grid-cols-2`.
   - Buton satırı `flex flex-col-reverse gap-2 sm:flex-row sm:gap-3`; butonlar `w-full sm:w-auto`.

6. `src/routes/campaigns.$slug.back.review.tsx`
   - `Row` bileşeni: `flex items-baseline justify-between gap-3`, `dt` `shrink-0`, `dd` `min-w-0 text-right break-words`.
   - Buton satırı `flex flex-col-reverse gap-2 sm:flex-row sm:gap-3`; butonlar `w-full sm:w-auto`.

Akış, mantık ve state değişmeyecek. Mobil viewport (676px ve daha dar) ve sm/md kırılma noktalarında görsel doğrulama yapılacak.
