# Backup Restore

> Taslak prosedür. Hukukçu / operasyon lead onayı olmadan publish değildir.

| Alan | Değer |
| --- | --- |
| Trigger | TBD — bu prosedürü başlatan olay |
| Owner | TBD (rol) |
| SLA | TBD |
| Approval status | draft |
| Audit requirement | Her aksiyon `audit_logs` tablosuna kaydedilir; gerekçe zorunlu |

## Adımlar

1. Olay sınıflandır ve önceliklendir.
2. İlgili tabloda durum güncelle (yalnız ilgili RPC üzerinden).
3. Karşı tarafa standart Türkçe iletişim şablonunu gönder.
4. `audit_logs` kaydını doğrula.
5. Kapanış / takip görevi aç.

## Evidence

- Stripe nesne ID'leri (cs_/pi_/ch_/re_/tr_/po_)
- Audit log id
- İletişim kayıtları (e-posta thread id)

## Açık sorular

- Profesyonel onay alındı mı?
- SLA mutabakatı var mı?
