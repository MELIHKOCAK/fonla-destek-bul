# Geliştirme akışı

## Branch stratejisi

| Branch                    | Amaç                                                              |
| ------------------------- | ----------------------------------------------------------------- |
| `main`                    | Yalnızca doğrulanmış, kararlı sürümler. Doğrudan commit edilmez.  |
| `develop`                 | Aktif geliştirme. Fazlar buraya birleştirilir.                    |
| `feature/<kisa-aciklama>` | Yeni özellik veya riskli/manuel çalışma.                          |
| `fix/<kisa-aciklama>`     | Hata düzeltmeleri.                                                |
| `chore/<kisa-aciklama>`   | Bağımlılık, CI, dokümantasyon ve araç değişiklikleri.             |

### Akış

1. `develop` branch'inden yeni bir `feature/*`, `fix/*` veya `chore/*`
   branch'i aç.
2. Küçük, odaklı commit'ler at.
3. Pull request `develop`'a açılır. Code review, typecheck, lint ve test
   geçtikten sonra merge edilir.
4. Sürüm hazır olduğunda `develop` → `main` PR'ı açılır.
5. `main` üzerinde sürüm tag'i atılır.

### Commit mesajı

Conventional Commits önerilir:

```
feat(campaigns): kampanya oluşturma formu eklendi
fix(auth): giriş yapılınca yönlendirme düzeltildi
chore(deps): vitest 4.1'e güncellendi
docs(readme): kurulum adımları eklendi
```

## Pull request kuralları

- PR başlığı ve açıklaması Türkçe olabilir; kod ve dosya isimleri İngilizce.
- Her PR şunları geçmelidir:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test:run`
  - `bun run build`
- UI değişiklikleri için ekran görüntüsü veya kısa açıklama ekleyin.
- Faz dışı değişiklikleri aynı PR'a koymayın.

## Branch protection (önerilen GitHub ayarları)

`main` ve `develop` için:

- Doğrudan push **kapalı**; yalnızca PR ile merge.
- En az 1 onay zorunlu.
- Status check zorunlu (typecheck, lint, test, build).
- Force-push **yasak**, branch silme **yasak**.
- Linear history önerilir (squash merge).

## Yerel doğrulama

Her PR öncesi:

```bash
bun run typecheck
bun run lint
bun run test:run
bun run build
```

Hata varsa gizlemeyin; düzeltmeden "tamam" demeyin.
