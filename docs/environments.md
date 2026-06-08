# Ortamlar

BeniFonla, geliştirme yaşam döngüsünde **üç ayrı ortam** kullanır.
Her ortamın kendi yapılandırması, secret seti ve veritabanı (ileride
bağlandığında) **ayrı** olur.

| Ortam            | Amaç                                              | Branch                     |
| ---------------- | ------------------------------------------------- | -------------------------- |
| `local`          | Geliştiricinin makinesinde yerel geliştirme       | her branch                 |
| `development`    | Paylaşımlı dev/preview (Lovable preview vb.)      | `feature/*`, `fix/*`       |
| `staging`        | Production öncesi entegrasyon ve QA               | `develop`                  |
| `production`     | Son kullanıcıya açık canlı ortam                  | `main`                     |

## Ortam ayrımı kuralları

- `local`, `staging` ve `production` **farklı Supabase projeleri** veya
  migration tabanlı kontrollü ortamlar olarak ayrılır. Aynı veritabanı
  birden fazla ortam tarafından paylaşılmaz.
- Test ve production **secret'ları ayrıdır**. Aynı API anahtarı birden
  fazla ortamda kullanılmaz.
- Production verisi **local geliştirmede kullanılmaz**. Gerektiğinde
  anonimleştirilmiş veya sentetik veri seti kullanılır.
- Lovable Cloud üzerinde yeni proje açıldığında sunulan **"Test/Live
  ortam" özelliğine güvenilmez**; ortam ayrımı bizim tarafımızda explicit
  Supabase projeleri / migration süreci ile sağlanır.

## Bu fazda (Faz 1)

- **Hiçbir Supabase projesi bağlanmaz.**
- `.env.example` yalnızca anahtar adlarını belgeler; gerçek değer içermez.
- Veritabanı, RLS, migration, edge function, auth ve ödeme entegrasyonu
  **yoktur**.
- Uygulama **publish edilmez**.

## Secret yönetimi (ileride)

- Frontend'de yalnızca `VITE_*` prefix'li, **publishable** anahtarlar
  bulunur. Hepsi bundle'a girer; gizli kabul edilmez.
- Service role key, ödeme private key'i vb. gizli anahtarlar yalnızca
  Lovable Cloud secrets üzerinde saklanır ve **yalnızca server function'lardan**
  `process.env` ile okunur.
- Hiçbir secret git'e commit edilmez; `.env.local` `.gitignore` ile
  hariç tutulur.
