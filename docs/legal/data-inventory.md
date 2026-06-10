# Data & Privacy Inventory

> Hukukçu onayı için temel envanter. Yasal dayanaklar (legal_basis) avukat
> tarafından doldurulmadan KVKK uyumlu olarak yayımlanmaz.

| Kategori | Amaç | Kaynak | Saklama | Erişim rolleri | Processor | Legal basis (TBD) |
| --- | --- | --- | --- | --- | --- | --- |
| Hesap (e-posta, kullanıcı adı) | Kimlik, oturum | Kayıt | Hesap silinene kadar | user, admin | Lovable Cloud (Supabase) | TBD |
| Profil (ad, avatar, bio) | Public profil | Kullanıcı | Hesap silinene kadar | herkes (public) / user / admin | Lovable Cloud | TBD |
| Katkı kayıtları | Ödeme kanıtı, raporlama | Stripe + sistem | 10 yıl (vergi) | user, admin, finance | Stripe, Lovable Cloud | yasal yükümlülük TBD |
| Stripe kontrol bilgileri (PI/CS/CH id) | Ödeme uzlaştırma | Stripe webhook | 10 yıl | finance, admin | Stripe | sözleşme TBD |
| Kart verisi | YOK — sistemde tutulmaz | Stripe Checkout | — | yok | Stripe | — |
| Creator KYC kanıtları | Stripe Connect | Stripe Connect onboarding | Stripe tarafında | yok (BeniFonla tutmaz) | Stripe | — |
| Audit / admin notes | Operasyon kanıtı | Sistem | 10 yıl | admin | Lovable Cloud | meşru menfaat TBD |
| Webhook olayları (ham payload) | Replay / forensics | Stripe | 12 ay | admin, finance | Lovable Cloud | meşru menfaat TBD |
| Yasal kabul (`legal_consents`) | Uyum kanıtı | Sistem | Hesap + 10 yıl | user, admin | Lovable Cloud | yasal yükümlülük TBD |
| Çerez tercihi | Rıza | Tarayıcı | 12 ay | yok (lokal) | tarayıcı | rıza TBD |
| IP adresi | Yalnız hash, fraud incelemesi | HTTP | 90 gün | admin/finance | Lovable Cloud | meşru menfaat TBD |

## Notlar

- Kart verisi BeniFonla DB'sine **hiç gelmez**. Stripe Checkout PCI scope'unu
  Stripe üstlenir.
- Connect onboarding KYC dokümanları doğrudan Stripe'a yüklenir; BeniFonla
  yalnız "tamamlandı / requirements due" durumunu görür.
- Tüm "TBD" hücreleri hukukçu doldurana kadar gizlilik politikası `draft`
  kalır ve `legal_documents_approved` kapısı kapalıdır.
