# Production Hazırlık Checklist

Her item için: **owner**, **kanıt link/ek**, **tarih**.

## Veri ve şema
- [ ] Production DB temiz; demo/test kullanıcı, demo kampanya, test contribution yok.
- [ ] Tüm migration'lar staging'de tested ve sıralı uygulandı.
- [ ] RLS politikaları production'da aktif (`docs/security/threat-model.md`).
- [ ] Storage bucket policy'leri production'da uygulandı.
- [ ] `src/integrations/supabase/types.ts` mevcut şema ile güncel.

## Stripe
- [ ] **Sandbox/test** keys production secrets içinde **yok**.
- [ ] **Live secret / restricted** keys client bundle'da **yok** (build
      sonrası `dist/` içinde `sk_live_` / `rk_live_` grep boş).
- [ ] Live webhook endpoint(leri) ve Connect webhook endpoint(leri) prod
      domain'inde; her endpoint **kendi signing secret**'ı ile.
- [ ] Stripe **test/sandbox** ve **live** objeleri (PI, Customer, Connected
      Account) production veri tablosunda karışmıyor (`environment` kolonu
      veya prefix kontrolü).
- [ ] Stripe API version **pinlenmiş** (release notunda yazılı).
- [ ] Restricted key scope'ları yalnız ihtiyaç duyulan resource'lara açık.

## Hukuk / iş kapıları (`release_gates`)
- [ ] `legal_documents_approved`
- [ ] `stripe_business_model_approved`
- [ ] `stripe_platform_country_verified`
- [ ] `stripe_connect_model_verified`
- [ ] `stripe_live_account_verified`
- [ ] `creator_agreement_approved`
- [ ] Country / crowdfunding regülasyonu hukuk onayı (docs ile bağlı).

## Domain / network
- [ ] Production domain canlı, HTTPS yeşil, sertifika ≥ 30 gün geçerli.
- [ ] Supabase Auth redirect URL allow-list production domain'i içerir.
- [ ] CORS allowed origins yalnız production + staging.
- [ ] Email domain SPF, DKIM, DMARC sağlayıcı gereksinimine göre.

## Operasyon
- [ ] Cron / scheduled finalization & reconciliation job'ları kayıtlı ve
      sağlıklı (`docs/operations/provider-payout-monitoring.md`).
- [ ] Backup / PITR aktif (`docs/operations/backup-restore.md`).
- [ ] Monitoring + error tracking devrede (source map gizliliği korunur).
- [ ] Alert routing: payments / fraud / infra ayrı kanal.
- [ ] Admin hesapları MFA zorunlu; test admin hesapları kaldırıldı.
- [ ] `robots.txt`, `sitemap.xml`, canonical tag'ler doğru.
- [ ] Privacy/legal sayfaları published.
- [ ] Rate limit'ler (auth, contribution oluşturma, webhook) aktif.
- [ ] Güvenlik taraması **0 critical / 0 high**.

## Feature flag varsayılanları (production)
| Flag (`release_gates.key`) | Varsayılan | Açma onayı |
| --- | --- | --- |
| `production_payments_enabled` | **false** | Payments lead + hukuk |
| `production_creator_transfers_enabled` | **false** | Payments lead + ops |
| `production_refund_command_enabled` | **false** | Payments lead, vaka-bazlı |
| `production_transfer_reversal_enabled` | **false** | Payments lead, vaka-bazlı |
| `kill_switch_new_contributions` | **true** (açık) | — kapatıldığında contribution durur |
| `kill_switch_new_creator_transfers` | **true** (açık) | — kapatıldığında transfer durur |

> Kill switch'ler **sunucu tarafında** zorlanır. Sadece UI flag yeterli değildir.
