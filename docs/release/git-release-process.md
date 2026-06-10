# Git / Release Süreci

## Branch akışı

```
feature/* ─┐
fix/*     ─┴─► develop ──► release/x.y ──► main ──► tag vX.Y.Z
```

- `develop` her zaman staging ile uyumludur.
- `release/x.y` PR'ı `main`'e açılır; production'a yalnız `main` deploy eder.
- Hotfix: `hotfix/*` doğrudan `main`'e PR + `develop`'a geri merge.

> Lovable ↔ GitHub iki yönlü senkronu **branch davranışını** garanti
> etmez; release PR ve merge'ler **GitHub üzerinde manuel** yapılır.
> "Lovable otomatik production'a merge etti" iddiası yapılmaz.

## Zorunlu CI check'leri (main / release PR)

- `bunx tsc --noEmit`
- `bun run lint`
- `bunx vitest run`
- `bun run build`
- Stripe **live key** izi taraması (`STRIPE_LIVE_KEY_GUARD`)
- Migration linter (yeni `supabase/migrations/*.sql` için)

## Release artefaktları

Her release PR'ı şunları içerir:

- **Changelog** (`CHANGELOG.md` veya release notu).
- **Migration list** (yeni dosya adları).
- **Env config değişiklikleri** (yeni secret / kaldırılan / rotasyon).
- **Rollback planı** (forward-fix / restore kriteri).
- **Approver** (kod + ürün + ödeme/hukuk gerekirse).

## Tagging

`vMAJOR.MINOR.PATCH` semver. Tag, `main`'in deploy edilen commit'ine
basılır. Production runbook tag ID'sine referans verir.
