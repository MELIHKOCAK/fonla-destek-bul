# BeniFonla — Manuel Tarama Adımları

Otomatik komut çıktısı yoksa scan yapılmış sayılmaz. Aşağıdaki adımlar
release-checkliste girer ve `docs/security/scan-runs/<tarih>.md` altına
sonuçlarıyla commit edilir.

## 1. Lovable Basic Security Scan

1. Lovable → Sol panel → **Cloud** → **Security**.
2. **Run basic scan** düğmesine bas.
3. Sonuçları aşağıdaki şablonla kaydet:

```
date:
total:
high:
medium:
low:
new-findings:
```

## 2. Lovable Deep Security Scan

1. Aynı ekran → **Run deep scan**.
2. Süre ~5-10 dk; bitince yine şablonla kaydet.
3. Yeni high/critical varsa `docs/security/security-findings.md` içine SF-XXX
   olarak ekle.

## 3. Supabase Security Advisor

1. Cloud → **Database** → **Advisors → Security**.
2. WARN/ERROR sayılarını kaydet; her ERROR için ticket aç.

## 4. Supabase Performance Advisor

1. Cloud → **Database** → **Advisors → Performance**.
2. Slow query veya missing index uyarılarını `docs/performance-runs/<tarih>.md`
   altına yaz.

## 5. npm dependency audit

```
bunx npm audit --production --audit-level=high
```

CI'da `code--dependency_scan` çalışır; lokalde aynı çıktı beklenir.

## 6. Secret / git history scan

```
# Çalışan dizinde sızıntı taraması
grep -rE "sk_(live|test)_[A-Za-z0-9]{16,}|service_role|SUPABASE_SERVICE_ROLE_KEY" src/ public/ || echo "clean"

# Git geçmişi (yerel klon gerekir)
git log -p -- '*.ts' '*.tsx' '*.env*' | grep -E "sk_live_|service_role" || echo "clean"
```

Sızıntı bulunursa: anahtarı **rotate et**; git history rewrite yetmez.

## 7. RLS regresyon testi

`supabase test db` veya Faz 21'de eklenecek pgTAP suite. Manuel için:

```
psql -tAc "SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity=false"
```

Çıktı boş olmalı.

## 8. Storage policy review

1. Cloud → **Storage** → bucket başına **Policies** sekmesi.
2. `draft-media` bucket → yalnız owner upload/select.
3. `public-campaign-media` bucket → public read, owner write.

## Sonuç şablonu

`docs/security/scan-runs/2026-06-10.md`:

```
# Scan run 2026-06-10

| Scan | Total | High | Critical | Yeni finding |
| --- | --- | --- | --- | --- |
| Lovable basic | … | 0 | 0 | — |
| Lovable deep | … | 0 | 0 | — |
| Supabase security | 121 | 0 | 0 | by design accepted |
| Supabase performance | … | — | — | — |
| npm audit | … | 0 | 0 | — |
| Secret grep | clean | — | — | — |

Notlar:
- …
```
