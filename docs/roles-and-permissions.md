# Aktörler ve yetki sınırları

> **Kritik kural:** `Creator` **kalıcı bir kullanıcı tipi değildir**.
> Creator, bir User'ın **belirli bir kampanya ile olan sahiplik
> ilişkisidir**. Aynı kişi aynı anda:
>
> - bir kampanyasında **Creator**,
> - başka bir kampanyada **Backer**,
> - genel olarak da **User**
>
> olabilir. Yetki kontrolleri her zaman **kaynak (kampanya, contribution
> vb.) bazında** yapılır, kullanıcının "tipine" göre değil.

> **İkinci kritik kural:** `Admin` finans kaydını **doğrudan değiştiremez**.
> Admin yalnızca **izin verilen durum geçişlerini** tetikleyebilir; bu
> geçişlerin finansal yan etkileri (refund, payout vb.) sistem tarafından
> ledger'a append-only olarak yazılır. Düzeltme silme/güncelleme ile
> değil, **yeni ters kayıt** ile yapılır.

---

## 1. Aktörler

### Guest

- **Tanım:** Hesabı olmayan / oturum açmamış ziyaretçi.
- **Yapabilir:**
  - `live` ve `successful` kampanyaları **listeleyip detay** sayfasına
    bakabilir.
  - Public **creator profilini** görüntüleyebilir.
  - Kampanya arama, kategori, filtre, sıralama kullanabilir.
  - Yorumları okuyabilir.
- **Yapamaz:**
  - Destek veremez (Backer eylemi auth gerektirir).
  - Yorum, favori, takip, şikâyet **oluşturamaz**.
  - Kampanya oluşturamaz.

### User (authenticated)

- **Tanım:** Kayıtlı ve oturum açmış kullanıcı.
- **Yapabilir:**
  - Tüm Guest yetkileri.
  - **Profil** yönetimi (ad, biyografi, avatar).
  - **Favori** ekleme/çıkarma.
  - Diğer kullanıcıları / creator'ları **takip etme**.
  - Yorum oluşturma, kendi yorumunu silme/düzenleme.
  - **Şikâyet** oluşturma.
  - **Kampanya oluşturma** (Creator olarak — kampanya bazında).
  - Bir kampanyaya **destek verme** (Backer olarak — eylem bazında).
  - **Kendi** contribution / payment / refund özetini görüntüleme.
- **Yapamaz:**
  - Başka kullanıcının kampanyasını düzenleyemez.
  - Başka kullanıcının contribution / payment kayıtlarını göremez.
  - Hiçbir kampanyanın durumunu **istemciden keyfi olarak** değiştiremez
    (örn. `live → successful`). Tüm geçişler sunucuda izin verilen
    aktör ve ön koşul kontrolleri ile yapılır.

### Creator (kampanya bazında)

- **Tanım:** Bir kampanyanın `creator_id` alanında oturan User. Bu yetki
  yalnızca **o kampanya** için geçerlidir.
- **Yapabilir:**
  - Kendi kampanyasının **taslağını oluşturma ve düzenleme** (`draft`,
    `revision_requested`).
  - Kampanyayı admin incelemesine **gönderme** (`draft|revision_requested
    → submitted`).
  - Kampanyayı `draft` aşamasında **silme**.
  - Yayındayken (`live`) bazı **kısıtlı alanları güncelleme** (örn.
    güncelleme/duyuru postları; ana hikâye ve reward tier'lar yayın
    sonrası kısıtlanır — kesin alan listesi `campaign-state-machine.md`
    içinde).
  - Kendi kampanyasının yorumlarına **creator yanıtı** yazma.
  - Kendi kampanyasının analitik özetini ve destekçilerini görme.
- **Yapamaz:**
  - Kampanyasının durumunu **`approved`, `live`, `successful`, `failed`,
    `suspended`, `paid_out`** gibi değerlere doğrudan değiştiremez.
  - Başka kampanyaları düzenleyemez.
  - Backer kimliklerini Backer'ın görünürlük ayarına aykırı şekilde
    göremez.
  - Finans kaydını (ledger, payout) doğrudan değiştiremez.

### Backer (eylem bazında)

- **Tanım:** Bir Contribution'ın `backer_id` alanında oturan User.
- **Yapabilir:**
  - `live` durumundaki bir kampanyaya destek **başlatma**
    (`Contribution.initiated`).
  - **Kendi** contribution / payment / refund özetini görüntüleme.
  - Bazı durumlarda destek **iptali** (yalnızca tahsilat öncesi / izin
    verilen pencere içinde — kesin kurallar
    `contribution-payment-state-machine.md` içinde).
- **Yapamaz:**
  - Tahsil edilmiş bir payment'i istemciden refund edemez (refund
    `failed`/`cancelled` kampanyada sistem tarafından, `successful`
    kampanyada Admin / sistem süreciyle yapılır).
  - Başka backer'ların kayıtlarını göremez.

### Moderator (gelecek, MVP'de opsiyonel)

- **Tanım:** Yalnızca **içerik moderasyonu** için ayrılmış rol. MVP'de
  Admin bu yetkileri de taşıyabilir; ileride ayrıştırılır.
- **Yapabilir:**
  - Şikâyetleri görüntüleme.
  - Yorum gizleme/silme.
  - Kampanya `suspended` önerisi (ama nihai geçiş Admin yapar — ayrı
    rol oluştuğunda).
- **Yapamaz:**
  - Hiçbir finans kaydını okuyamaz/değiştiremez.
  - Payout, refund, ledger ile ilgili eylem yapamaz.

### Admin

- **Tanım:** Platform geneli operasyon yetkilisi.
- **Yapabilir:**
  - Kampanya **inceleme** akışı: `submitted → under_review →
    revision_requested | approved | rejected`.
  - `live` kampanyayı **suspend** etme.
  - `suspended` kampanyayı `live`'a döndürme veya `cancelled` etme.
  - `payout_pending` → `paid_out` onayı (sistem hesabı sonrası).
  - Şikâyet ve içerik moderasyonu işlemleri.
  - Tüm kullanıcıları ve kampanyaları okuma (PII erişim sınırı içinde).
- **Yapamaz:**
  - **Ledger entry'lerini doğrudan silme/güncelleme.** Düzeltme yalnızca
    yeni ters kayıt ile yapılır (sistem fonksiyonu çağrılarak).
  - Bir kampanyayı **`draft`** veya keyfi geri duruma çekemez.
  - Bir Contribution'ın tutarını veya bir Payment'in detaylarını
    değiştiremez.

---

## 2. Yetki matrisi (özet)

Aktör × Kaynak × Eylem. **C** = create, **R** = read, **U** = update,
**D** = delete, **T** = state transition (yalnızca izin verilen geçiş).

| Kaynak                  | Guest | User (kendi) | Creator (kendi kampanya) | Backer (kendi contribution) | Moderator | Admin |
| ----------------------- | :---: | :----------: | :----------------------: | :-------------------------: | :-------: | :---: |
| Public Campaign         |   R   |      R       |            R             |              R              |     R     |   R   |
| Own Campaign            |   –   |      C       |          R/U/T(\*)       |              –              |     –     |   T   |
| Other Campaign edit     |   –   |      –       |            –             |              –              |     –     |   –   |
| Reward Tier             |   R   |      R       |       C/R/U/D(draft)     |              R              |     R     |   R   |
| User profile (own)      |   –   |     R/U      |           R/U            |             R/U             |     –     |   R   |
| User profile (public)   |   R   |      R       |            R             |              R              |     R     |   R   |
| Comment                 |   R   |    C/R/U/D(own)|        C/R/U/D(own)    |        C/R/U/D(own)         |   R/D     |  R/D  |
| Creator response        |   –   |      –       |       C/R/U/D(own)       |              –              |     –     |  R/D  |
| Favorite / Follow       |   –   |    C/R/D     |           C/R/D          |            C/R/D            |     –     |   R   |
| Report (şikâyet)        |   –   |     C/R(own) |        C/R(own)          |          C/R(own)           |    R/U    |  R/U  |
| Contribution            |   –   |     C/R(own) |    R(own kampanya özet)  |          C/R(own)           |     –     |   R   |
| Payment                 |   –   |     R(own)   |    R(own kampanya özet)  |           R(own)            |     –     |   R   |
| Refund                  |   –   |     R(own)   |    R(own kampanya özet)  |           R(own)            |     –     |   R   |
| Payout                  |   –   |      –       |        R(own kampanya)   |              –              |     –     |   R/T |
| Ledger Entry            |   –   |      –       |            –             |              –              |     –     |   R   |

(\*) Creator'ın `U` (update) ve `T` (transition) hakları **durum
bağımlıdır** ve `docs/campaign-state-machine.md` içindeki tabloya tabidir.
Ledger entry'leri **hiçbir aktör tarafından** U/D edilemez; yalnızca
sistem append eder.

---

## 3. Yetkilendirme mimarisi

- Roller `user_roles` adında **ayrı bir tabloda** tutulur (asla
  `profiles` veya `auth.users` üzerinde değil — `workspace-knowledge.md`
  ve `project-knowledge.md` ile uyumlu).
- Rol kontrolü `security definer` bir `has_role(user_id, role)` fonksiyonu
  üzerinden RLS politikalarında yapılır.
- **Kaynak sahipliği** kontrolleri (örn. "bu kampanyanın creator'ı bu mu")
  ayrıca RLS içinde `auth.uid() = creator_id` benzeri koşullarla uygulanır.
- Frontend kontrolleri (buton gizleme, route guard) **sadece UX** içindir;
  güvenliğin temeli **sunucu tarafıdır**.
