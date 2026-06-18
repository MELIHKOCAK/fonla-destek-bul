## Sebep

`POST /api/public/ai/chat` route handler'ı ilk adımda kill-switch'i kontrol ediyor:

```ts
if (process.env.AI_CHAT_ENABLED !== "true") {
  return 503 CHAT_DISABLED  // "AI sohbet özelliği şu an devre dışı."
}
```

Lovable Cloud secret listesinde mevcut olanlar: `LOVABLE_API_KEY`, Stripe/cron secret'ları, vs. **Eksikler:**

1. `AI_CHAT_ENABLED` — hiç tanımlı değil → her istek 503 dönüyor.
2. `AI_RATE_LIMIT_HASH_SECRET` — tanımlı değil; bu olmadan flag açılsa bile `actor_key_hash` üretimi (HMAC) güvensiz/başarısız olacak. Route bunu zorunlu istiyor.

Frontend tarafı (`VITE_AI_CHAT_ENABLED`) default `true` olduğu için widget görünüyor, ama backend kapalı olduğundan kullanıcı her gönderdiğinde 503 alıyor — bu yüzden "şu an devre dışı" mesajı çıkıyor.

`LOVABLE_API_KEY` zaten mevcut, ek olarak Lovable AI Gateway yapılandırması gerekli değil.

## Çözüm

İki server secret'ını Lovable Cloud üzerinden ekle:

1. **`AI_RATE_LIMIT_HASH_SECRET`** — rate-limit aktör hash'i için rastgele uzun bir string (kullanıcıdan girmesini iste; rastgele 32+ byte hex/base64 önerilir).
2. **`AI_CHAT_ENABLED`** — değer olarak `true` (kapatmak için ileride `false`).

Secret'lar eklendikten sonra Worker otomatik yeniden başlar, ek deploy gerekmez.

## Doğrulama

- `/faq` sayfasında widget'tan "BeniFonla nedir?" gönder; 200 + asistan cevabı dönmeli.
- 11. istekte (authenticated) 429 + `Retry-After` header'ı gelmeli (RPC rate-limit).
- Kapatma testi: `AI_CHAT_ENABLED=false` yapıp tekrar 503 + `CHAT_DISABLED` dönüşü görülmeli, sonra `true`'ya geri al.

## Kapsam dışı

- Kod değişikliği yok; route, RPC, RLS ve widget zaten doğru çalışıyor.
- `VITE_AI_CHAT_ENABLED` (frontend görünürlük flag'i) değiştirilmiyor.
- `LOVABLE_API_KEY` zaten mevcut, dokunulmuyor.
