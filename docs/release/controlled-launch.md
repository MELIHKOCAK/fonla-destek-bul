# Controlled Launch Sequence

> Lovable kendiliğinden gerçek para işlemi başlatamaz. Aşamalar arasında
> **açık manuel onay** gerekir. Stripe veya hukuk onaylarından biri
> eksikse 6–10. adımlar uygulanmaz; live flag'ler kapalı kalır.

| Adım | İçerik | Onay |
| --- | --- | --- |
| 1 | Staging internal test (ekip içi). | QA lead |
| 2 | Stripe **sandbox** full matrix: Checkout, webhook, Refund, Connect onboarding, creator Transfer, Transfer Reversal, Payout observation. | Payments lead |
| 3 | Davetli **beta** — live ödeme yok ya da kontrollü sandbox. | Ürün |
| 4 | Production infrastructure (domain, DNS, monitoring, backup) hazır. | Ops |
| 5 | Production'da Stripe **live** payment & creator Transfer flag'leri **kapalı**, ödeme dışı smoke test. | Deployment owner |
| 6 | Hukuk + Stripe + crowdfunding + ülke + Connect onayları tamam → **authorized participants** ile küçük kontrollü gerçek Checkout. | Payments lead + hukuk |
| 7 | (İzin verilirse) küçük kontrollü gerçek Refund; daha önce Transfer yapıldıysa Transfer Reversal doğrulaması. | Payments lead |
| 8 | Creator connected account uygunsa küçük kontrollü creator Transfer. Connected account banka Payout'u **platform Transfer'ından ayrı** doğrulanır. | Payments lead |
| 9 | Stripe Dashboard ↔ ledger ↔ settlement ↔ reconciliation eşleşmesi. | Finance |
| 10 | `production_payments_enabled` ve `production_creator_transfers_enabled` **ayrı ayrı** kademeli enable; her açma sonrası 24 saat gözlem. | Payments lead + ops |

## Kademeli enable kuralları
- Bir flag açıldıktan sonra en az 24 saat metrik gözlemi yapılmadan
  diğer flag açılmaz.
- Refund / Transfer Reversal flag'leri yalnız vaka-bazlı geçici açılır;
  iş bitince **kapatılır**.
