# BeniFonla — Security Findings (Faz 19)

Format: id | source | severity | evidence | affected | remediation | verification | status | owner/expiry

## Açık / İzlenen

| id | source | sev | evidence | affected | remediation | status | owner/expiry |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SF-001 | supabase-linter `0028_anon_security_definer_function_executable` | low | 121 SECURITY DEFINER fonksiyonu anon execute hakkına sahip | `get_public_*`, `has_role`, `is_admin`, `claim_username` … | by design — gövdede auth/owner kontrolü; tetikleyici/iç fonksiyonlar Faz 19 migration ile kaldırıldı | accepted | platform / yıllık review |
| SF-002 | supabase-linter `0014_extension_in_public` | low | `pg_trgm` vb. extension `public` şemasında | `public` schema | sonraki ana migration penceresinde `extensions` schema'ya taşı | accepted | platform / Faz 20 |
| SF-003 | code-review | medium | `src/components/ui/chart.tsx` `dangerouslySetInnerHTML` (theme CSS) | shadcn chart bileşeni | kullanıcı girdisi içermiyor; input sadece config token rengi (`#...` regex doğrulama eklendi) | mitigated | frontend / Faz 19 |
| SF-004 | manual | high | Backend rate-limit primitive yok | tüm Edge / RPC | Faz 19.5 — `rate_limit` tablosu + `enforce_rate_limit` RPC | open | backend / Faz 19.5 |
| SF-005 | manual | medium | Per-IP/per-user spam throttle yok (`create_comment`, `campaign_reports`) | community modülleri | RPC içinde 30 sn min interval + günlük cap | open | backend / Faz 19.5 |
| SF-006 | manual | low | `.env` git'e commit edilebilir | repo | yalnızca publishable + project_id var; Lovable Cloud bunu yönetir; gerçek sırlar Edge secret'ta | accepted | platform |

## Kapatılmış

| id | sev | fix | doğrulama |
| --- | --- | --- | --- |
| SF-100 | high | Webhook/outbox iç fonksiyonlarda anon/auth EXECUTE kaldırıldı | migration `20260610..._security_hardening` |
| SF-101 | high | Trigger fonksiyonlarına (handle_new_user, auto_follow_on_contribution, …) anon execute hakkı kaldırıldı | aynı migration |
| SF-102 | high | Live mode transfer guard (`creator_transfers_live_guard`) yalnız servis | aynı migration |
| SF-103 | high | Stripe object ID karışması | unit test `id-guards.test.ts` |
| SF-104 | high | Live vs test Stripe key isolation | aynı test + CI guard |
| SF-105 | medium | Production DB'de test koşma riski | `src/test/setup.ts` `assertNotProductionDb` |

## Yeni finding ekleme şablonu

```
| SF-XXX | source | sev | tek cümle delil | etkilenen tablo/route/dosya | nasıl çözülecek | open/mitigated/accepted/fixed | sahibi / son tarih |
```

Kritik/High açık iken `npm run build` deploy'a gönderilmez. Branch
protection: `CI / test` zorunlu.
