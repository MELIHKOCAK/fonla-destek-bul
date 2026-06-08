# Workspace Knowledge — BeniFonla geliştirme kuralları

Bu kurallar bu repodaki **her** değişiklik için geçerlidir. Lovable agent
ve insan geliştiriciler bunlara uymak zorundadır.

## TypeScript ve kod kalitesi

- TypeScript **strict mode her zaman açık** tutulur.
- `any`, `var`, `@ts-ignore` ve kontrolsüz `as` type assertion **kullanılmaz**.
  Gerçekten gerekiyorsa daraltılmış (`as unknown as X`) form kısa bir
  yorumla gerekçelendirilir.
- Default export **kullanılmaz**; her zaman **named export**.
- `let` yerine `const` tercih edilir; mutasyon gerekiyorsa açıkça belirtilir.
- Küçük, saf, test edilebilir fonksiyonlar tercih edilir.
- Inline style (`style={{ ... }}`) **kullanılmaz**; stil Tailwind sınıflarıyla
  yazılır (semantic token üzerinden).
- Sessiz hata yutma (`catch {}`) yasaktır; hata loglanır veya yukarı taşınır.

## İsimlendirme

- Dosya adları: **kebab-case** (örn. `campaign-card.tsx`,
  `use-campaign-list.ts`). React bileşen dosyaları için **PascalCase** de
  kabul edilir, ancak proje içinde tutarlı kalın.
- React bileşenleri ve TypeScript tipleri: **PascalCase**.
- Fonksiyonlar, değişkenler, hook'lar: **camelCase** (hook'lar `use` ile
  başlar).
- Sabitler: `SCREAMING_SNAKE_CASE` yalnızca gerçek sabit ise.

## UI ve stil

- **Tailwind CSS v4** ve **shadcn/ui** kullanılır.
- Renkler her zaman **semantic design token** üzerinden gelir
  (`bg-background`, `text-foreground`, `bg-primary` vb.). Doğrudan
  `text-white`, `bg-black` gibi sınıflar yazılmaz.
- Yeni renkler `src/styles.css` içine token olarak eklenir.
- Erişilebilirlik: semantic HTML, klavye kullanımı, görünür focus state,
  form label kuralları her zaman korunur.
- UI metinleri Türkçe; kod isimleri İngilizce.

## Veri katmanı

- Server state için **TanStack Query** kullanılır.
- Formlar için **React Hook Form** + **Zod** kullanılır.
- `useEffect + fetch` ile initial veri çekme yapılmaz.

## Güvenlik

- Güvenlik kararı **frontend'e bırakılmaz**. Auth, RLS, database constraint
  ve güvenli server function birlikte uygulanır.
- Secret, service role key veya ödeme anahtarı **asla** frontend koduna,
  git geçmişine, console loglarına veya prompt çıktısına yazılmaz.
- Service role anahtarı yalnızca `*.server.ts` veya server route'larda
  `process.env` üzerinden okunur.

## Para ve finans

- Para tutarı **asla float** olarak tutulmaz.
- TRY için **kuruş cinsinden integer** (veya PostgreSQL `numeric`)
  kullanılır. UI'a sunarken biçimlendirme yapılır.
- Finansal kayıtlar (contribution, payment, refund, payout, fee)
  **append-only ledger** mantığıyla saklanır; silinmez, düzeltme yeni
  kayıtla yapılır.

## Süreç

- Yeni özellikten önce mevcut kod ve etkiler **incelenir**. Çalışan
  davranış gereksiz yere yeniden yazılmaz.
- **Faz dışı** özellik eklenmez. Her faz kendi kapsamını uygular.
- Tekrarlanan kod ortak bileşen / hook / utility'ye çıkarılır; gereksiz
  soyutlama üretilmez.
- Hata, loading, empty ve başarı durumları gerçek kullanıcı davranışı
  olarak ele alınır; yalnızca mutlu yol geliştirilmez.
- Her değişiklikten sonra **type-check, lint, build ve ilgili testler**
  çalıştırılır. Hata varsa gizlenmez.
