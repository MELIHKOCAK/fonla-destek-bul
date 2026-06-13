## Sorun

Editör değişiminden sonra "Fon kullanım planı" ve "Takvim" bölümleri kampanya detay sayfasında boş görünüyor.

Kök neden: Veritabanına `funds_usage_content` ve `timeline_content` HTML olarak kaydediliyor, ama detay sayfası bu iki bölümü hâlâ eski yapısal modele göre (yüzdeli liste ve kilometre taşı dizisi) render ediyor. Adapter (`toCampaignDetail`) bu alanları hiç okumuyor, sabit `fundingPlan: []` ve `milestones: []` döndürüyor → boş bölüm.

Hikâye ve Riskler bölümleri zaten `RichTextViewer` ile çalışıyor; preview ve admin inceleme ekranları da düzgün; yalnız genel detay sayfası geride kalmış.

## Yapılacaklar

1. `src/types/campaign.ts`
   - `CampaignDetail`'e `fundsUsage: string` ve `timeline: string` alanları ekle (HTML).
   - Kullanılmayan `fundingPlan` ve `milestones` alanlarını (ve ilgili `FundingPlanItem` / `Milestone` tiplerini) kaldır.

2. `src/lib/public/adapters.ts`
   - `toCampaignDetail` içinde `fundsUsage: row.funds_usage_content ?? ""` ve `timeline: row.timeline_content ?? ""` döndür; eski boş diziler kaldırılacak.

3. `src/pages/CampaignDetailPage.tsx`
   - "Fon kullanım planı" bölümünü `<RichTextViewer html={c.fundsUsage} />` ile değiştir.
   - "Takvim" bölümünü `<RichTextViewer html={c.timeline} />` ile değiştir.
   - Artık kullanılmayan `CalendarDays` importunu temizle (gerekirse).

4. `src/mocks/campaign-details.ts`
   - Mock verisinde eski `FUNDING_PLAN` ve `milestones()` referanslarını HTML string mocklarıyla (`fundsUsage`, `timeline`) değiştir; ilgili yardımcıları sil.

Backend, validasyon, autosave ve form akışlarına dokunulmayacak — değişiklik yalnız sunum katmanında.

## Doğrulama

- Detay sayfasında dört bölüm de (Hikâye, Fon kullanım planı, Takvim, Riskler) zengin metin biçimlendirmesiyle görünüyor.
- TypeScript derlemesi `fundingPlan` / `milestones` kaldırıldıktan sonra hatasız.
- Önizleme ve admin inceleme sayfalarında değişiklik yok (zaten doğru çalışıyor).
