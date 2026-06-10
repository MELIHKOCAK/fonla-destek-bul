
# Proje Başlat akışını aktif et

Tüm altyapı zaten hazır: `/creator/campaigns/new` rotası, kampanya sihirbazı (`/creator/campaigns/$id/edit/$step`), `_authenticated` gate (yetkisiz → `/login?redirect=...`, onboarding eksik → `/onboarding`). Sadece ana sayfadaki "Proje Başlat" çağrıları **disable** ve "yakında" mesajlarıyla kapatılmış. Bu fazda sadece o kapıyı açıyoruz.

## Yapılacaklar

### 1. `src/pages/HomePage.tsx` — hero CTA (satır 81-87)
- `<Button disabled>` → `<Button asChild><Link to="/creator/campaigns/new">Proje Başlat</Link></Button>`
- "Proje başlatma özelliği yakında…" yardımcı metnini kaldır.
- Yetkisiz kullanıcı için davet metniyle değiştir: "Hesabın yoksa ücretsiz [kayıt ol]". `Link to="/register"`.

### 2. `src/pages/HomePage.tsx` — alt CTA bandı (satır 265-285)
- Başlık aynı kalsın ("Kendi projeni başlatmaya hazır mısın?").
- Açıklamayı "demo aşaması" yerine pozitif metne çevir: "Birkaç dakikada taslak oluştur, hazır olduğunda yayına al."
- Birincil buton: **Proje Başlat** → `/creator/campaigns/new`.
- İkincil buton: **Nasıl çalışır?** → `/how-it-works` (zaten var, aynen kalsın).
- "Bize ulaş" butonu ikincil olarak kalabilir veya kaldırılabilir — kaldırmayı öneriyorum, CTA odağı dağılmasın.

### 3. Yetkisiz kullanıcı deneyimi — değişiklik yok
- `/creator/campaigns/new` zaten `_authenticated/` altında. Yetkisizken `/login?redirect=/creator/campaigns/new`'e gidiyor, başarılı login sonrası geri dönüyor. Username yoksa `/onboarding`'e gidiyor, ardından kampanya sihirbazına. Mevcut akış doğru, ek kod gerekmiyor.

### 4. Doğrulama
- Build/typecheck (otomatik).
- Manuel: çıkış yapmış halde "Proje Başlat" → `/login?redirect=/creator/campaigns/new` → kayıt/giriş → onboarding (gerekiyorsa) → `/creator/campaigns/new` formu açılmalı.

## Kapsam dışı (bu fazda değil)

- Onboarding'e "creator olmak istiyorum" rol gate'i.
- `/register` üzerinden direkt creator profili oluşturma kısayolu.
- Kampanya sihirbazının UX iyileştirmeleri (`creator.campaigns.new.tsx` zaten çalışıyor, kalsın).
- Ödeme hesabı kurulum zorunluluğu (kampanya yayın anında devreye giriyor, taslak oluşturmak için gerekmez).

Onaylarsan uygulayayım.
