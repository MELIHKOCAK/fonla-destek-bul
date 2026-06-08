# Project Knowledge — BeniFonla ürün ve alan bilgisi

## Amaç

**BeniFonla**, kullanıcıların ürünlerini, yaratıcı fikirlerini ve
projelerini tanıtarak belirli bir hedef tutar ve süreyle destek
toplayabildiği **ödül / destek temelli kitle fonlama** platformudur.

BeniFonla **değildir**:

- Yatırım, hisse satışı veya menkul kıymet platformu
- Faiz getirisi, finansal kazanç veya kâr paylaşımı ürünü
- Kullanıcı cüzdanı / saklama / bakiye ürünü
- P2P borç verme platformu

## Aktörler

| Aktör       | Tanım                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| `Guest`     | Hesabı olmayan ziyaretçi. Kampanyaları görüntüleyebilir.                    |
| `User`      | Kayıtlı kullanıcı. Backer veya Creator olabilir.                            |
| `Creator`   | Kampanya oluşturup yürüten kullanıcı.                                       |
| `Backer`    | Bir kampanyaya destek (contribution) gönderen kullanıcı.                    |
| `Moderator` | Kampanya başvurularını ve içerik şikayetlerini inceleyen yetkili.           |
| `Admin`     | Platform geneli yapılandırma, finans gözetimi ve kullanıcı yönetimi yapan.  |

## Terimler

| Terim              | Anlam                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **Campaign**       | Bir Creator'ın oluşturduğu, hedef tutarı ve süresi olan fonlama girişimi.                          |
| **Creator**        | Campaign sahibi User.                                                                              |
| **Backer**         | Bir Campaign'e contribution yapan User.                                                            |
| **Contribution**   | Bir Backer'ın bir Campaign'e yapmayı **taahhüt ettiği** destek kaydı. Mantıksal birim.             |
| **Payment**        | Contribution'ı tahsil etmek için yapılan **gerçek ödeme denemesi**. Bir contribution birden fazla payment attempt'ine sahip olabilir (örn. başarısız → tekrar dene). |
| **Refund**         | Tahsil edilmiş bir payment'ın geri iadesi.                                                         |
| **Payout**         | Başarılı kampanyada toplanan fonların (platform fee düşülerek) Creator'a aktarımı.                 |
| **Platform Fee**   | Başarılı kampanyalarda BeniFonla'nın aldığı komisyon. Payout'tan önce hesaplanır.                  |
| **Reward Tier**    | Belirli bir destek tutarı karşılığında Creator'ın Backer'a sunduğu ödül seviyesi.                  |
| **Ledger**         | Tüm finansal hareketlerin (contribution, payment, refund, payout, fee) append-only kaydı.          |

> **Önemli ayrım:** `Contribution ≠ Payment`. Bir contribution iş seviyesi
> taahhüttür; tahsilat zinciri payment attempt'leriyle yürür.

## Kampanya yaşam döngüsü

```text
draft
  → submitted
    → under_review
      → revision_requested  → (draft veya submitted'a döner)
      → approved
        → scheduled        (başlangıç tarihi gelecekteyse)
        → live
          → successful     (hedef ve süre koşulları sağlandı)
            → payout_pending → paid_out
          → failed         (süre doldu, hedef tutmadı)
            → refunding → refunded
          → cancelled      (Creator veya Admin iptal etti)
          → suspended      (Moderator/Admin geçici askıya aldı)
```

### Durum kuralları

- Durum geçişleri **yalnızca sunucu tarafında** ve uygun yetkiyle yapılır.
- Kullanıcı, kampanya durumunu istemciden **keyfi olarak değiştiremez**.
  Frontend'den gelen `status` alanı server tarafından **dikkate alınmaz**.
- Geçişler ledger ve audit log kayıtlarıyla izlenir.

## Para akışı

- `successful` kampanyada toplanan fonlar `payout_pending` aşamasına
  alınır, platform fee hesaplanır ve Creator'a `payout` ile aktarılır.
- `failed` veya `cancelled` kampanyada tahsil edilmiş ödemeler `refund`
  sürecine girer.
- Tüm finansal kayıtlar **append-only ledger** üzerinden açıklanabilir
  olmalıdır. Düzeltme silme ile değil, ters kayıt ile yapılır.

## MVP kapsamı

- **Para birimi:** yalnızca TRY (Türk Lirası), **kuruş cinsinden integer**
  olarak saklanır.
- **Dil:** yalnızca Türkçe.
- Çoklu para birimi, çoklu dil ve uluslararası ödeme MVP dışıdır.

## Teknoloji yığını

- React 19, TypeScript (strict)
- Vite 7, TanStack Start (SSR + server functions)
- TanStack Router, TanStack Query
- Tailwind CSS v4, shadcn/ui
- React Hook Form, Zod
- Vitest + Testing Library
- Backend (sonraki fazlar): Lovable Cloud (Supabase) — PostgreSQL, RLS,
  Storage, server functions

## Güvenlik ilkeleri

- Auth, RLS, database constraint ve güvenli server function **birlikte**
  uygulanır. Yetkilendirme yalnızca frontend'de yapılmaz.
- User rolleri **ayrı tabloda** tutulur (`user_roles`), `profiles`
  üzerinde tutulmaz.
- Service role anahtarı yalnızca server tarafında kullanılır.

## Ödeme ve hukuki uyum

- **Gerçek ödeme tahsilatı ve hukuki uygunluk doğrulanmadan production
  payment akışı açılmaz.** Test ortamı (sandbox) ile production net olarak
  ayrılır.
- Türkiye'de kitle fonlama faaliyetini düzenleyen mevzuata uyum
  doğrulanmadan canlı kampanya yayını yapılmaz.
