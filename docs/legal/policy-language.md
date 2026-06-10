# Platform Dili Politikası

UI metinleri ve marketing içeriği için:

## Yasak / Kaçınılacak

| Terim | Neden |
| --- | --- |
| yatırım yap, invest | Yatırım/menkul kıymet algısı yaratır. |
| kazanç garantisi | Yanıltıcı; finansal getiri vaat eder. |
| getiri, return | Yatırım dili. |
| faiz, kâr payı | Finansal ürün dili; ürün modeline aykırı. |
| risksiz | Tüketici aldatıcı iddia. |
| fon garanti altında | Doğrulanmamış escrow/bloke iddiası. |

## Tercih edilen

| Terim |
| --- |
| projeyi destekle |
| ödül seç |
| katkıda bulun |
| kampanya hedefi |
| riskleri incele |

## Rol tanımları

- **Creator** — ürün/fikir/proje sahibi.
- **Backer** — destekçi. Finansal yatırımcı **değildir**.
- **BeniFonla** — aracı platform; ürünü üretmez, satmaz, garanti vermez.

## Uygulama

`src/lib/marketing/forbidden-terms.ts` listesi içerikte tarama yapan basit
bir lint kuralının kaynağıdır. PR review sırasında manuel kontrol şarttır.
