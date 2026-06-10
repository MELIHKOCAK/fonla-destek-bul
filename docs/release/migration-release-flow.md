# Migration Release Flow

> Hiçbir migration staging'den geçmeden production'a uygulanmaz.
> Destructive değişiklik (drop/rename) **expand → migrate → contract** olarak
> üç ayrı deploy'a bölünür; tek deploy'da kolon drop edilmez.

## Akış

1. **Local reset.** `supabase db reset` ile sıfırdan migration zinciri
   uygulanır; hata yok.
2. **Database tests.** Birim + pgTAP/RLS testleri yeşil
   (`docs/testing/test-matrix.md` referansı).
3. **Staging apply.** `supabase db push --linked` veya branching deploy.
   Migration log'u kaydedilir.
4. **Staging smoke + data migration doğrulaması.** `docs/release/smoke-tests.md`.
5. **Backward compatibility.** Eski frontend build'i yeni şemada en az 1
   release boyunca okuyabilmeli (expand fazı).
6. **Production prechecks.**
   - PITR / backup durumu doğrulanır (`docs/operations/backup-restore.md`).
   - Mevcut açık webhook backlog'u boş.
   - Aktif kill-switch durumları gözden geçirilir.
7. **Production apply.** Onaylı deploy penceresinde uygulanır; migration ID
   release notuna eklenir.
8. **Post-deploy checks.** Smoke tests, log/error rate, Stripe webhook
   delivery, finalization job sağlık kontrolü.
9. **Karar.** Geri al (data riski yoksa) **veya** ileri-doğrultma
   (forward-fix). Kör down-migration kullanılmaz.

## Expand-migrate-contract şablonu

| Faz | Örnek (rename `amount` → `amount_minor`) | Tek deploy mu? |
| --- | --- | --- |
| Expand | Yeni `amount_minor` kolonu eklenir, trigger ile senkronize edilir. | Evet |
| Migrate | Tüm okuma/yazma yeni kolona taşınır; eski kolon yazılır ama okunmaz. | Evet |
| Contract | Eski kolon `DROP`. Yalnız tüm istemciler yeni kolona geçtikten sonra. | Evet |

## CHECK constraint kuralı

Zamana / dış veriye bağlı kurallar (`expire_at > now()`) için CHECK değil
trigger kullanılır (restore sırasında başarısız olur).
