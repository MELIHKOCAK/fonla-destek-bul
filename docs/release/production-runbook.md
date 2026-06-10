# Production Runbook

> Sahibi: **Deployment owner (rotates weekly)**. Her release için bu
> belge tag ID + migration listesi ile güncellenir.

## 0. Roller
- **Deployment owner**: süreci yürütür, commit/rollback yetkisi.
- **Payments lead**: Stripe key/webhook ve gate onayı.
- **Ops on-call**: monitoring + incident.
- **Hukuk** (gerekirse): live finansal akış kararı.

## 1. Prechecks
- [ ] `docs/release/production-checklist.md` tamamen yeşil.
- [ ] Açık P0/P1 incident yok.
- [ ] Backup/PITR son 24 saat içinde başarılı.
- [ ] Staging'de aynı commit en az 24 saat sorunsuz.
- [ ] Migration listesi gözden geçirildi; destructive değişiklik için
      expand-migrate-contract fazı doğru.

## 2. Komutlar (referans — gerçek değer/secret yok)
```bash
# 1) Migration uygula
supabase db push --linked --project-ref <prod-ref>

# 2) Frontend deploy — Lovable UI üzerinden Publish (Update),
#    veya GitHub main merge sonrası CI tetiklenir.

# 3) Smoke tests
bunx vitest run smoke
```

## 3. Migration ID'leri
Bu sürümde uygulanan migration dosyalarını burada listele:
```
supabase/migrations/<YYYYMMDDHHmmss>_<slug>.sql
```

## 4. Post-deploy smoke
`docs/release/smoke-tests.md` adımlarını **production owner** çalıştırır.

## 5. Kontrolsüz davranış → durdurma
Aşağıdaki durumlardan **biri** gerçekleşirse:
- Webhook backlog > 100 / 5 dk
- 5xx oranı > %1 / 5 dk
- Reconciliation mismatch
- Stripe veya hukuk onayı eksik raporu

Sırasıyla:
1. `kill_switch_new_contributions = false` (yeni katkı durdurulur).
2. `kill_switch_new_creator_transfers = false` (transfer durdurulur).
3. Gerekirse `production_payments_enabled = false`.
4. Incident channel açılır; `docs/operations/incident-response.md`.

## 6. Rollback / forward-fix

| Durum | Karar |
| --- | --- |
| Frontend regression | Önceki commit'i tekrar deploy; DB değişmez. |
| Yeni migration kırıldı, veri yazılmadı | Schema'yı düzelten **forward-fix** migration. Down kullanma. |
| Veri yazıldı, kurtarılamıyor | PITR / point-in-time restore kararı (ops + hukuk). |
| Stripe webhook hatası | Webhook endpoint'ini Stripe Dashboard'dan **pause**, undelivered event'leri **replay** sonrası resume. |

> Kör `down migration` çalıştırma. Veri kaybı riskini her seferinde
> deployment owner + ops birlikte değerlendirir.

## 7. Secret rotation
- Stripe restricted key rotation: Dashboard'da yeni key oluştur → Cloud
  secret güncelle → eski key revoke.
- Webhook secret rotation: endpoint başına ayrı; Stripe Dashboard rotate +
  Cloud secret güncelle (zero-downtime için kısa overlap penceresi).
- `LOVABLE_API_KEY`: `rotate_lovable_api_key` aracı (silme/ekleme değil).

## 8. Stripe webhook & event destination
- **Pause**: Stripe Dashboard → endpoint → disable.
- **Replay**: Dashboard → event → "Resend".
- Undelivered event recovery: `webhook_events` tablosunda `received_at` boş
  olanlar yoksa Stripe Dashboard "Failed deliveries" listesi üzerinden
  manuel resend; replay sonrası idempotency anahtarları aynı olduğundan
  güvenli.

## 9. İletişim
Incident contact placeholders (gerçek bilgiler vault'ta):
- Deployment owner: `<rotates>`
- Payments lead: `<placeholder>`
- Ops on-call: `<placeholder>`
- Hukuk: `<placeholder>`
- Stripe destek case: `<account-id>`
