## Sorunun Özeti

"Özet oluştur" butonuna basınca üretken yapay zekâ uç noktası (`POST /api/public/ai/generate-campaign-summary`) çağrılıyor, fakat istek başarısız bittiği için UI'da kırmızı uyarı (`AI özeti oluşturulurken bir hata oluştu...`) ya da `AI özet üretiminde bir sorun oluştu.` mesajı çıkıyor. Sunucu tarafı log'larında bu uç nokta için kayıt yok (henüz hiç log üretilmemiş) — yani hata sessizce yakalanıp masklenip dönülüyor. Mevcut kodu satır satır okuduğumda en olası 5 kök nedeni belirledim. Tek bir tane değil, birden fazlasının üst üste binmesi olası.

## Olası Kök Nedenler (öncelik sırasına göre)

### 1) Lovable AI Gateway, `response_format: json_schema` + `strict: true` kombinasyonunu Gemini için reddediyor olabilir
`src/lib/ai/campaign-summary/gateway.server.ts` şu çağrıyı yapıyor:
```text
response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }
```
Varsayılan model `google/gemini-2.5-flash`. OpenAI uyumlu Gateway'lerde `json_schema` çoğunlukla yalnızca OpenAI modelleri için destekleniyor; Gemini için 400 dönmesi tipik. Bu durumda kod, `AI_PROVIDER_ERROR` ile 502 dönüp UI'a generic mesaj gösterir.

### 2) Kelime sayısı zorunluluğu (300–500) bu kampanya için imkânsız olabilir
Test kampanyasının içeriği çok ince ("Premier Pro..." cümlesinin tekrarı). Promptta "uydurma yapma, eksikse 'yok' yaz" deniyor, ardından `validateSummary` toplam kelime sayısını 300–500 arasında zorluyor. AI gerçekten kibar davranıp boş tutarsa toplam < 300 oluyor → `WORD_COUNT_OUT_OF_RANGE` → 502.

### 3) 8 zorunlu bölüm + `additionalProperties: false` + `strict: true` katı şema
Gemini, şema dışı ufak bir alan (`reasoning`, fazladan boş string) eklediğinde Gateway tarafında schema-validation patlıyor; bu da `AI_PROVIDER_ERROR` olarak dönüp 502 üretiyor.

### 4) Guest kullanıcı için IP başlığı yoksa rate-limit "aynı anahtar"a düşüyor
`buildActorKey` cf-connecting-ip / x-real-ip / x-forwarded-for arıyor; bunlar lovableproject.com / cloudflare üzerinde her zaman olmayabilir. Olmadığında tüm guest'ler tek bir hash'e gidiyor. İlk başarısız denemeden sonraki 60 sn içindeki tekrar → 429 `RATE_LIMITED`. Kullanıcının ikinci tıklamasında "Çok sık istek..." yerine generic "hata" mesajını görmesinin sebebi `body.message` öncelikli olduğu için bu şart altında zaten teknik mesajı kullanıcıya yansıtıyor.

### 5) `claim_campaign_ai_summary_generation` ilk denemede yarıda kaldıysa
İlk istek hata verip `failed` yazılırsa sorun yok; ama AI çağrısı sırasında istisna fırlarsa (network) yakalanmıyor olabilir → satır `generating` durumunda kalır → bir sonraki tıklamada `GENERATION_IN_PROGRESS` (202) dönüyor → kullanıcıya "hâlâ üretiliyor" diye görünüyor. Mevcut kodda Gateway çağrısı `try/catch` ile sarılı, ama `validateSummary` veya update sırasında atılan istisna catch dışında kaldığında handler 500 atar ve satır `generating` kalır.

### Yan etkiler / kalite sorunları
- Sunucu tarafında hiç `console.error` yok; teşhis için en azından `console.error("[ai-summary] ...", { code, detail })` gerekli.
- Hata mesajları kullanıcıya generic; oysa `WORD_COUNT_OUT_OF_RANGE`, `INVALID_STRUCTURED_OUTPUT`, `AI_BALANCE_UNAVAILABLE`, `CAMPAIGN_NOT_ELIGIBLE` için ayrı Türkçe metinler değer katar.
- `Sayfa bulunamadı` döndü production'da — yayınlama sonrası test edilmesi gerek.

## Önerilen Çözüm Planı (kabul edersen uygularım)

### A. AI çağrı şeklini Gemini ile uyumlu hale getir
- `gateway.server.ts` içinde önce `response_format: { type: "json_schema", strict: true }` deniyoruz; 400/422 alırsak otomatik olarak `{ type: "json_object" }` ile retry.
- JSON-object modunda gelen string için "robust JSON extraction" yardımcı fonksiyonu (markdown fence/temizleme + lastIndexOf bracket).

### B. Kelime sayısını ve şemayı esnet
- `MIN_SUMMARY_WORDS` 300 → 120, `MAX_SUMMARY_WORDS` 500 → 700.
- Section content `min(1)` korunur; alt sınırı kelime bazlı kaldırırız.
- Promptta "bir alan yoksa kısaca 'Bilgi sağlanmamış' yaz, uydurma" netleştirilir.

### C. Hata mesajlarını netleştir + güvenli loglama
- Route handler içinde her hata dalına `console.error("[ai-summary]", code, maskedDetail)` ekle.
- UI'da `body.code`'a göre Türkçe mesaj eşlemesi (`AI_BALANCE_UNAVAILABLE` → "AI servisi geçici olarak kullanılamıyor", `WORD_COUNT_OUT_OF_RANGE` → "Kampanya içeriği özet için yetersiz", `CREATOR_FORBIDDEN`, `RATE_LIMITED` retry-after gösterimi, vb.).

### D. `generating` kilitlenmesini önle
- Handler içindeki tüm AI/persist akışını `try { ... } catch (err) { update status=failed; return 500; }` ile sar.
- Bir sonraki tıklamada `RATE_LIMITED` yerine doğru "yeniden dene" davranışı.

### E. Rate-limit anahtarını daha sağlam yap (opsiyonel)
- Guest için IP başlığı yoksa `actorKey`'e `User-Agent` + saat damgası bucket'ı ekle. Bu, "tek guest için sürekli aynı anahtar" sorununu hafifletir.

### F. Doğrulama
- Yayın dışı (preview) ortamda guest olarak butona bas → cache_hit veya completed dönmeli.
- Aynı kampanya için ikinci tıkla → CACHE_HIT (200) dönmeli.
- Auth'lu (creator olmayan) bir kullanıcı ile dene → completed.
- Creator olarak dene → `CREATOR_FORBIDDEN` mesajı UI'da gözüksün.
- Yayına alındıktan sonra production endpoint'inin 200 döndüğü `curl` ile doğrulanır.

## Kapsam Dışı
- Yeni model seçimi (gpt-5-mini'ye geçme) — istersen ayrı bir adım olarak konuşalım.
- AI Gateway'i ayrıca aktif etmek için migration — `LOVABLE_API_KEY` zaten mevcut.
- Cache invalidation veya admin paneli.

Onay verirsen tüm adımları (A–F) tek bir build turunda yapayım. Sadece bir kısmını isterseniz, hangilerini söyle.