# Ortam Topolojisi (BeniFonla)

> Lovable Cloud'un "Test/Live environments" özelliğine güvenilmez. Ortam
> ayrımı **ayrı Supabase projeleri** veya onaylanmış **Supabase Branching +
> migration workflow** ile sağlanır. Bu belge yalnız **isim/source/owner**
> içerir. Hiçbir secret değeri burada saklanmaz.

## Ortamlar

| Ortam | Supabase | Domain | Stripe modu | Email |
| --- | --- | --- | --- | --- |
| `local` | Geliştirici lokali (`supabase start`) ya da paylaşımlı dev branch | `localhost:5173` | Stripe **test** keys | Mailpit / restricted test recipient |
| `staging` | Ayrı Supabase projesi **veya** `staging` branch | `staging.benifonla.com` (placeholder) | Stripe **sandbox / test** keys + sandbox webhook | Sandbox / allow-list recipient |
| `production` | Ayrı Supabase projesi (`main`) | `benifonla.com` (placeholder) | Stripe **live restricted/secret** keys + live webhook(lar) | Verified email domain |

Aynı veritabanı birden fazla ortamca paylaşılmaz. Aynı API anahtarı birden
fazla ortamda kullanılmaz. Production verisi local'e indirilmez;
gerektiğinde anonimleştirilmiş veya sentetik veri kullanılır.

## Env değişken envanteri

> Değerler **buraya yazılmaz**. Yalnız isim, kaynak (storage), sahip listelenir.

### Frontend / build-time (`VITE_*`)

| İsim | Kaynak | Sahip | Notlar |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project | Backend lead | Publishable |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase project | Backend lead | Publishable |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project | Backend lead | Publishable |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard (account-spesifik) | Payments lead | Test key staging, live key prod |

### Server / runtime secrets (Lovable Cloud Secrets / Supabase Edge Secrets)

| İsim | Kaynak | Sahip | Yalnız ortam |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Supabase project | Backend lead | tümü |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase project | Backend lead | tümü |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project | Backend lead (vault) | tümü — server-only |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | Payments lead | staging=test, production=live (**restricted key tercih edilir**) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint | Payments lead | endpoint başına ayrı |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe Connect webhook | Payments lead | endpoint başına ayrı |
| `STRIPE_API_VERSION` | Sabit metin | Payments lead | Pinleme kararı release notlarında |
| `EMAIL_PROVIDER_API_KEY` | Email sağlayıcı | Comms lead | staging sandbox, prod verified domain |
| `EMAIL_FROM_ADDRESS` | Domain owner | Comms lead | prod verified |
| `LOVABLE_API_KEY` | Lovable AI Gateway | Backend lead | `rotate_lovable_api_key` |
| `WEBHOOK_SHARED_SECRET` | Internal HMAC | Backend lead | webhook endpoint imzalama |

### Stripe Connect / connected accounts

- **Sandbox connected accounts** yalnız staging Stripe sandbox hesabıyla
  oluşturulur ve production veritabanına yazılmaz.
- **Live connected accounts** yalnız production Stripe hesabında ve yalnız
  production veritabanında saklanır.
- `creator_payment_accounts.environment` veya benzeri ayırım kolonu eklenir
  (production'a sandbox kaydı sızmamalı).

## Sahiplik

- Secret rotasyon takibi: Backend lead (`docs/security/manual-scans.md` ile
  koordineli).
- Stripe key/webhook rotasyonu: Payments lead.
- Email domain DNS (SPF/DKIM/DMARC): Comms lead + DevOps.
- Domain/DNS/HTTPS: DevOps.
