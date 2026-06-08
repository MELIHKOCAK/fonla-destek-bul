# MVP dışı — kesin yasak listesi

Aşağıdaki özellikler BeniFonla MVP'sinde **bulunmayacaktır**. Bir
sonraki faza otomatik aktarılmazlar; her biri **ayrı bir ürün ve
hukuk kararı** gerektirir.

| # | Özellik                                              | Gerekçe                                                                                         |
|---|------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| 1 | Hisse, ortaklık, menkul kıymet satışı                | Hukuki: Türkiye'de SPK düzenlemesine tabidir; kitle fonlama ≠ menkul kıymet ihracı.             |
| 2 | Faiz, kâr payı, yatırım getirisi vaadi               | Hukuki + ürün: BeniFonla reward temellidir; getiri vaadi yatırım sözleşmesi haline gelir.       |
| 3 | Kullanıcı cüzdanı, platform içi bakiye, saklama      | Hukuki: ödeme/saklama hizmetleri ayrı lisans gerektirir (e-para / ödeme kuruluşu).              |
| 4 | Kripto para entegrasyonu                             | Hukuki + risk: ayrı düzenleme; oynaklık ve KYC karmaşıklığı MVP dışı.                            |
| 5 | Çoklu para birimi                                    | Kapsam: MVP yalnızca TRY. FX, hedge, dönüşüm muhasebesi gerektirir.                              |
| 6 | Canlı sohbet (live chat) ve birebir direkt mesaj (DM)| Kapsam + moderasyon: gerçek zamanlı altyapı + içerik gözetimi MVP yükünü aşar.                   |
| 7 | Gelişmiş sosyal ağ, takipçi grafiği, feed algoritması | Kapsam: temel takip ve favori yeterlidir; algoritmik feed başka ürün problemidir.               |
| 8 | Mobil uygulama (iOS / Android native)                | Kapsam: MVP responsive web; native uygulamalar ayrı sürüm/yayın süreci gerektirir.               |
| 9 | Yapay zekâ ile kampanya skoru / başarı tahmini       | Kapsam + güven: model, veri etiketi, açıklanabilirlik gerektirir; yanlış skor itibar riski.     |
| 10 | Karmaşık kişiselleştirilmiş öneri algoritması        | Kapsam: kategori + arama yeterli; öneri sistemi ayrı altyapı.                                   |
| 11 | Çok satıcılı genel e-ticaret (stok/kargo/envanter)   | Kapsam: BeniFonla kitle fonlama platformudur, mağaza değildir.                                  |
| 12 | Backer'a anonim ödeme / kimlik gizleme               | Hukuki: AML / KYC zorunluluğu nedeniyle finansal işlemde anonimlik yoktur (UI'da takma ad ayrı). |
| 13 | Manuel banka havalesi ile destek                     | Kapsam: yalnızca sandbox/provider üzerinden ödeme; mutabakat karmaşıklığı yüksek.                |
| 14 | Para iadesi puanı / kupon / hediye kart sistemleri    | Kapsam: cüzdan/bakiye olmadığı için anlamlı değil.                                              |
| 15 | Kampanya canlı yayını (livestream)                   | Kapsam: medya altyapısı ve moderasyon yükü.                                                     |

## Yasakların kuvveti

Bu liste **yalnızca eksiklik beyanı değildir**; aynı zamanda **ürün
kararıdır**. Bir PR bu listedeki bir özelliği "küçük dokunuş" olarak
bile eklemeye çalışırsa **reddedilir**. Listeye yeni madde eklemek
veya listeden çıkarmak için açık bir ürün/hukuk kararı ve bu dosyanın
güncellenmesi gerekir.
