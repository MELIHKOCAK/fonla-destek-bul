
## Teşhis

"Ödemeye geç" butonu `createCheckoutSession` server fonksiyonunu çağırıyor. DB'de görülen kanıt:

- Son 3 destek girişiminde `contributions.status = pending` oluşmuş.
- Karşılık gelen `payment_transactions` satırları `status = initiated`, `provider_checkout_session_id = NULL` durumda kalmış.
- Yani akışın "5. PT satırı oluştur" adımı başarılı, ama "7. Stripe checkout session oluştur" adımı patlıyor ve hata fırlatılırken PT satırı `failed`'e güncellenmeden bırakılıyor.

Frontend tarafında hata `translateContributionError` ile çevriliyor; mesajda `BFL_*` öneki yoksa (Stripe / DomainPaymentError mesajları içermez) generic **"Beklenmeyen bir hata oluştu"** gösteriliyor. Bu nedenle gerçek Stripe hatası kullanıcıya da geliştiriciye de görünmüyor.

**En olası kök neden:** Stripe test hesabınız Türkiye dışında bir ülkede açılmış olduğu için `currency: "try"` ile `checkout.sessions.create` çağrısı Stripe tarafından reddediliyor (örn. "The currency provided (try) is invalid" / "Your account cannot currently make live charges in this currency"). Adapter bu hatayı `DomainPaymentError("PAYMENT_FAILED", "...")` olarak yeniden fırlatıyor, frontend'de `BFL_*` bulunmadığı için generic mesaj çıkıyor.

## Yapılacaklar

### 1) Gerçek hatayı görünür kıl
`src/lib/contributions/errors.ts` içindeki `translateContributionError`'a Stripe / domain ödeme hatalarını da Türkçeleştiren bir kademe ekle:
- `CAMPAIGN_NOT_PAYMENT_READY` → "Bu kampanya henüz ödeme almaya hazır değil."
- `DUPLICATE_PAYMENT_ATTEMPT` → "Bu destek için zaten aktif bir ödeme oturumu var. Lütfen birkaç dakika sonra tekrar deneyin."
- `PAYMENT_FAILED` / Stripe `StripeInvalidRequestError`, `StripeAuthenticationError`, `StripeAPIError`, `StripeConnectionError` → "Ödeme sağlayıcısı isteği reddetti: {kısa mesaj}" (kısa mesaj sanitize edilerek, sadece Stripe'ın `message` alanı kullanılır; secret/anahtar sızmaz).
- `BFL_CURRENCY_UNSUPPORTED` mesajını `contributionErrorMessages`'a ekle: "Bu kampanyanın para birimi (TRY) ödeme sağlayıcısı tarafından desteklenmiyor."
- Bilinmeyen Error mesajının ilk 140 karakterini fallback olarak ekrana yaz (yine de generic'i geri planda tut).

### 2) Server tarafında "failed" işaretle (orphan kayıt bırakma)
`src/lib/payments/checkout.functions.ts` 6–7. adımlarındaki Stripe çağrısını try/catch'e al:
- Stripe veya sonraki update hata fırlatırsa `payment_transactions` satırını
  `status = 'failed'`, `domain_status = 'failed'`, `sanitized_metadata.error = { code, message }` ile güncelle.
- Sonra hatayı yeniden fırlat (kullanıcıya ulaşması için).
Bu, "duplicate active session" kontrolünün ilerideki denemelerde yanlış pozitif vermesini de önler.

### 3) Mevcut 3 yarım kayıt için temizlik migrasyonu
Migration:
```sql
update payment_transactions
set status = 'failed', domain_status = 'failed'
where provider_checkout_session_id is null
  and status = 'initiated';
```
Aynı migrasyon, ilgili `contributions.status = 'pending'` kayıtlarını da `failed`'e çevirsin (yalnızca yukarıdaki PT'lere ait olanları).

### 4) Para birimi uyumluluğu için ek doğrulama (opsiyonel iyileştirme)
`createCheckoutSession` içinde TRY kontrolünden sonra, Stripe hesabının desteklediği para birimleriyle uyuşmazlığı zaten Stripe söyleyecek. Ek olarak `creator_payment_accounts.default_currency` varsa uyuşmazlıkta erken `CURRENCY_NOT_SUPPORTED_BY_ACCOUNT` döndürerek daha net mesaj veriyoruz.

### 5) Doğrulama
- Build sonrası "Ödemeye geç"e tekrar basın; artık konsolda / UI'da gerçek Stripe mesajını görmeliyiz.
- Eğer mesaj "currency is invalid" gibi çıkarsa, çözüm kod değil hesap tarafıdır: Stripe Dashboard'da TRY destekleyen bir Connect/Standalone hesabı kullanmanız gerekir. O durumda yapılacak şey ya hesabı değiştirmek ya da MVP için kampanya para birimini hesabınızın desteklediği bir kura çevirmek olur — kararı sizinle birlikte alırız.

## Teknik notlar

- `mapStripeError` zaten Stripe SDK hatalarını `DomainPaymentError`'a dönüştürüyor; mesajını kaybetmemek için adapter'da `err.message`'ı `DomainPaymentError`'a geçirelim (zaten `"PAYMENT_FAILED"` koduyla). Frontend ise kodu (`PAYMENT_FAILED`) ve mesajı ayrı parse eder.
- Hata mesajlarında **secret / anahtar / iç path** yer almasın; sadece Stripe'ın kullanıcı dostu `message` alanı + kod.
- `useMutation` çağrısında `setSubmitError`'a generic yerine yeni mapper'ın çıktısı geçecek; değişiklik review.tsx'te tek satır.
