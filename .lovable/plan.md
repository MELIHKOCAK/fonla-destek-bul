Sorunun nedeni: Kampanya detay route’u (`/campaigns/$slug`) artık destek akışı route’unun parent’ı olarak davranıyor, fakat detay route component’i child route’ları render edecek `<Outlet />` içermiyor. Bu yüzden tıklamada URL/title `/back` rotasına geçiyor gibi görünse de ekranda hâlâ kampanya detay sayfası kalıyor; kullanıcıya hiçbir şey olmamış gibi geliyor.

Plan:
1. `src/routes/campaigns.$slug.tsx` dosyasını gerçek parent layout’a çevireceğim.
   - Bu route artık `<Outlet />` döndürecek.
   - Böylece `/campaigns/$slug/back`, `/reward`, `/details`, `/review`, `/result` child route’ları ekranda mount olabilecek.

2. Kampanya detay içeriğini ayrı index route’a taşıyacağım.
   - Yeni route: `src/routes/campaigns.$slug.index.tsx`
   - Mevcut detay sayfası (`CampaignDetailPage`) burada render edilecek.
   - `/campaigns/premier-pro...` aynı şekilde detay sayfasını göstermeye devam edecek.

3. Destek akışı linklerini index route’a uygun hale getireceğim.
   - Detay sayfasındaki “Destek Ol” ve ödül seçim linkleri `/campaigns/$slug/back` yerine doğrudan ilk adım olan `/campaigns/$slug/back/` veya net bir child route’a gidecek.
   - Giriş dialog’undaki redirect de aynı şekilde ilk destek adımına yönlenecek.

4. İlk destek adımı route tanımını kontrol edeceğim.
   - `src/routes/campaigns.$slug.back.index.tsx` zaten index child olarak tanımlı; parent/child render düzeldikten sonra tutar formu görünür olmalı.
   - Gerekirse trailing slash davranışını tekleştirerek `/back` → tutar adımı deneyimini garanti edeceğim.

5. Doğrulama yapacağım.
   - Kampanya detay sayfasında “Destek Ol” tıklanınca tutar formunun göründüğünü kontrol edeceğim.
   - Geri/ileri adımların child route’larda render edildiğini kontrol edeceğim.
   - Console/network tarafında görünür route veya server function hatası kalıp kalmadığını kontrol edeceğim.