
# Ödeme akışında olası buglar ve temizleme planı

Aşağıda `createCheckoutSession`, `createContribution`, `simulateTestPayment` ve Stripe entegrasyonu üzerinde gözlemlenen risk noktaları ile her biri için önerilen temizlik adımları yer alıyor. Hiçbir kod değişikliği yapılmaz — onayınızdan sonra hangi maddeleri uygulayacağımı söylerim.

## 1. "Duplicate active session" kilidi (yüksek olasılıklı bug)
**Senaryo:** Kullanıcı ödemeye geçer, Stripe sayfasını kapatır, geri dönüp tekrar dener. `payment_transactions` satırı hâlâ `pending` ve `checkout_expires_at` gelecekte → `DUPLICATE_PAYMENT_ATTEMPT` fırlar, "Beklenmeyen bir hata" görür.

**Temizleme:**
- Aynı `contributionId` + farklı idempotency key gelirse, aktif PT'nin Stripe session'ını `expire` edip yeni session aç.
- Veya idempotency key eşleşmiyorsa eski açık session'ı `cancelled` işaretle, yenisini oluştur.

## 2. Idempotency key reuse'da stale URL
**Senaryo:** Aynı `idempotencyKey` ile dönen kullanıcıya `fetchCheckoutSession` çağrılıyor; Stripe'tan `status=open` ama `url` null gelebilir (expire'a yakın). Şu an `if (session.status === "open" && session.url)` dışına düşerse PT zaten var, 4. adımda `DUPLICATE_PAYMENT_ATTEMPT` ile patlar.

**Temizleme:** Idempotency dalı open+url yoksa, mevcut PT'yi `failed/cancelled` işaretleyip akışın devamına izin ver (yeni PT açılır).

## 3. Ödül + destek tutarı tutarsızlığı (tekrar etme riski)
**Senaryo:** Frontend `totalMinor = donation + reward` gönderiyor, ancak başka bir giriş noktası (ör. ileri/geri navigasyonu, eski cache'lenmiş `back-flow-store`) sadece `donationMinor` ile RPC çağırırsa `BFL_AMOUNT_BELOW_REWARD` döner.

**Temizleme:**
- `back-flow-store` içinde tek bir `getTotalMinor()` helper'ı zorunlu hale getir.
- `createContribution` çağıran tüm yerler tek util'den `amountMinor` üretsin; doğrudan `donationMinor` geçen kullanım kalmasın.

## 4. Webhook gelmediğinde "pending" sonsuza takılı kalma
**Senaryo:** Stripe webhook ulaşmazsa `domain_status` `pending` kalır, sonraki `createCheckoutSession` her seferinde duplicate kilidine takılır; kullanıcı asla yeni deneme yapamaz.

**Temizleme:**
- `checkout_expires_at` geçmiş PT'leri otomatik `expired` yapan periyodik bir reconciliation (cron / `reconciliation.server.ts`) tetikle.
- `createCheckoutSession` başlangıcında "expires_at geçmişse `expired` işaretle, sonra kontrol et" guard'ı ekle (zaten kısmen var, davranışı netleştir).

## 5. Stripe session URL'i geri yönlendirmesi (return/cancel) origin uyuşmazlığı
**Senaryo:** `APP_PUBLIC_URL` set değil, kullanıcı custom domain'den (`benifonla.xyz`) girdi ama `Origin` header proxy nedeniyle Lovable URL döndü → kullanıcı yanlış host'a yönlendirilir, session storage / login state kaybı.

**Temizleme:**
- `APP_PUBLIC_URL` set edilmediği sürece daima `requestOrigin`'i tercih et; sabit fallback'i `benifonla.xyz` yap.
- Yine de mismatch olursa result sayfasına geldiğinde session yeniden çekildiği için soft-redirect.

## 6. `simulateTestPayment` çağrı kapısı
**Senaryo:** Şu an sadece `sk_live_` engelliyor; ancak DB tarafındaki `simulate_test_payment` RPC, `environment='live'` PT için de güvenli mi belirsiz. Aksi halde live PT'ler üzerinde simülasyon mümkün olur.

**Temizleme:** RPC içinde `payment_transactions.environment = 'test'` ve `contributions.environment = 'test'` check'i; client tarafında ise butonu yalnızca `environment === 'test'` PT için göster.

## 7. Concurrency: aynı contribution'da paralel checkout açma
**Senaryo:** Kullanıcı butona iki kez tıklar; iki PT satırı `attempt_number` lookup'ı arasında race → iki PT aynı `attempt_number` ile insert edilebilir (unique constraint yoksa).

**Temizleme:**
- `payment_transactions (contribution_id, attempt_number)` üzerinde UNIQUE constraint.
- Sunucu fonksiyonunu RPC içinde `INSERT ... attempt_number = COALESCE(max,0)+1` ile atomik hale getir.
- Frontend tarafında submit butonunu pending sırasında disable et (zaten varsa doğrula).

## 8. Sanitized metadata içine error yazılırken `campaign_id` dışında veri kaybı
**Senaryo:** Catch bloğu `sanitized_metadata` alanını tamamen overwrite ediyor → reward_tier_id vb. ileride eklenmiş alanlar siliniyor.

**Temizleme:** `update` yerine `select` + merge, ya da `jsonb_set` kullan; sadece `error` alt-key'ini yaz.

## 9. Stripe `httpClient: createFetchHttpClient()` ile retry davranışı
**Senaryo:** `maxNetworkRetries: 2` fetch client ile birlikte timeout'larda 30sn'ye kadar bekletebilir → server fn timeout, kullanıcı "beklenmeyen hata" görür ama PT `initiated` kalır.

**Temizleme:**
- `timeout: 15000` ekle.
- Catch bloğunu zaten `failed`'a alıyor; ek olarak loglama (`reconciliation`) ekle.

## 10. Currency sabit "TRY" varsayımı
**Senaryo:** `contribution.currency` farklı bir değerle DB'ye yazılırsa `BFL_CURRENCY_UNSUPPORTED` yerine Stripe çağrısında patlar (provider TRY hardcoded). Şu an guard var ama provider'a yine TRY hardcoded gidiyor — `contribution.currency`'yi geçmek daha güvenli (ileride çoklu para birimi için).

**Temizleme:** Hardcoded `"TRY"` yerine `contribution.currency` geçir; whitelisted set ile doğrula.

---

## Temizlik için önerilen sıralama
1. (Yüksek etki) Madde 1 + 2 + 4 — duplicate session ve takılı pending bugı.
2. (Veri bütünlüğü) Madde 3 + 7 — tutar ve concurrency.
3. (Güvenlik) Madde 6 — simulate gating.
4. (UX/operasyon) Madde 5 + 9 — redirect + timeout.
5. (Hijyen) Madde 8 + 10.

## Yapılmayacaklar
- UI/akış değişikliği yok; sadece `src/lib/payments/*`, `src/lib/contributions/contributions.functions.ts`, gerekirse migration.
- Yeni provider/abstraksiyon eklenmeyecek.

Hangi maddeleri uygulayalım? Onaylarsanız ilgili maddeler için ayrı (veya birleşik) bir build planına geçerim.
