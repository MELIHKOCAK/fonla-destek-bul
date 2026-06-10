# BeniFonla — Legal Readiness Checklist

Lovable bir avukat veya ödeme kuruluşu değildir. Aşağıdaki tablo
**uydurma onay üretmez**; her madde profesyonel inceleme ve yazılı kanıt
bekler. Bir madde `approved` işaretlenmeden production live ödeme veya
creator Transfer açılmaz.

| # | Konu | Owner | Required review | Status | Evidence / Link | Approval date |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Türkiye'de ürünün hukuki sınıflandırması (ödül/destek bazlı kitle fonlama; menkul kıymet / faiz ürünü değil) | Hukuk | Türk hukuku uzmanı | open | — | — |
| 2 | "Yatırım" kelimesinin yanlış kullanımı riski; UI ve marketing taraması temiz | Ürün + Hukuk | Hukuk onayı + marketing review | mitigated | `src/lib/marketing/forbidden-terms.ts` lint | — |
| 3 | Ödül/destek temelli model net tanımı (cüzdan, faiz, hisse yok) | Ürün | İç | mitigated | `docs/legal/threat-model.md`, `docs/legal/policy-language.md` | — |
| 4 | Stripe platform ülkesi desteği — BeniFonla tüzel kişiliğinin Stripe'da live hesap açabilmesi | Finans | Stripe yazılı onayı | open | — | — |
| 5 | Stripe iş modeli onayı — reward-based crowdfunding | Finans | Stripe Risk yazılı yanıtı | open | — | — |
| 6 | Stripe Connect `separate charges & transfers` modeli — platform & creator ülkeleri için | Finans | Stripe Solutions yanıtı | open | — | — |
| 7 | Creator connected account KYC + `transfers` capability + Payout schedule modeli | Finans | Stripe + Hukuk | open | — | — |
| 8 | Stripe fon tutma davranışı — escrow/bloke gibi tanımlanmaz; doğrulanmadan iddia edilmez | Finans + Hukuk | Stripe + Türk ödeme mevzuatı uzmanı | open | — | — |
| 9 | KVKK data controller / processor rolleri | Hukuk | KVKK uzmanı | open | — | — |
| 10 | Cross-border processors (Stripe, Lovable Cloud, e-posta sağlayıcı) | Hukuk | KVKK + DPA listesi | open | — | — |
| 11 | Vergi / faturalama / muhasebe yükümlülükleri | Mali müşavir | Türk vergi uzmanı | open | — | — |
| 12 | Creator KYC süreci ve evidence saklama | Ops + Hukuk | KYC danışmanı | open | — | — |
| 13 | Chargeback / fraud süreci | Finans + Ops | Stripe Disputes API + hukuk | open | — | — |
| 14 | Refund / cancellation süreci (tüketici mevzuatı) | Hukuk | Türk tüketici hukuku | open | `/refund-policy` (draft) | — |
| 15 | Yasaklı kampanyalar listesi | İçerik + Hukuk | Hukuk | open | `/prohibited-campaigns` (draft) | — |

## Durum kodları

- `open` — incelenmemiş veya beklemede. Live yayın engellidir.
- `mitigated` — kontrol eklendi ama profesyonel onay yok; live yayın engellidir.
- `approved` — yazılı profesyonel onay alındı, evidence saklandı, tarih atıldı.

Kapı tablosu (`release_gates` DB tablosu) bu satırlarla 1:1 değildir — release
kapısı yalnız bu listedeki ilgili maddeler `approved` olduğunda admin
tarafından açılır.
