
## Tespit edilen kök sebep

`public.campaigns` üzerinde `trg_enforce_campaign_field_locks` adlı BEFORE UPDATE trigger'ı var. Bu trigger, kampanya sahibi (ve admin değilse) tarafından yapılan her UPDATE'te `lock_version`, `status`, `submitted_at`, vb. alanların değişmesini yasaklıyor:

```
if new.lock_version is distinct from old.lock_version
  then raise exception 'lock_version is locked' using errcode='42501'; end if;
```

Ancak `update_campaign_draft` RPC'si her başarılı kayıtta zorunlu olarak şunu yapar:

```
update public.campaigns set ..., lock_version = _row.lock_version + 1, ...
```

`SECURITY DEFINER` olsa bile trigger `auth.uid()`'i hâlâ kampanya sahibi olarak görüyor → trigger UPDATE'i `'lock_version is locked'` ile reddediyor → `mapCampaignError` bu mesajı tanımıyor → UI'da "Beklenmeyen bir hata oluştu" toast'u çıkıyor. Bu, kullanıcının bildirdiği tüm alanlardaki (`short_description`, `start_at`/`end_at`, `story_content`, `funds_usage_content`, `timeline_content`, `risks_content`) autosave hatalarının tek sebebi.

Aynı sebeple `submit_campaign_for_review`, admin'in `approve_campaign`/`reject_campaign`/`request_revision`/`suspend_campaign` RPC'leri de kendi yetkili akışları içinde `status`, `submitted_at`, `lock_version` gibi alanları değiştirdiğinde aynı trigger tarafından engellenme riski taşıyor.

## Çözüm

Trigger'a "yetkili RPC içinden geliyorum" bayrağı tanıt: PostgreSQL session-local GUC (`bfl.allow_internal_update`) ile bypass.

### 1. Migration

`enforce_campaign_field_locks()` fonksiyonunu güncelle:

```sql
create or replace function public.enforce_campaign_field_locks()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Yetkili RPC'ler (SECURITY DEFINER) içinden geliyorsa bypass.
  if coalesce(current_setting('bfl.allow_internal_update', true), '') = 'on' then
    return new;
  end if;
  if auth.uid() is not null
     and auth.uid() = old.creator_id
     and not public.is_admin() then
    -- mevcut kilit kontrolleri aynen
    ...
  end if;
  return new;
end;
$$;
```

Sonra GUC'u set eden tüm yetkili RPC'lerin gövdesinin **başına** şu satırı ekle:

```sql
perform set_config('bfl.allow_internal_update', 'on', true);
```

Etkilenen RPC'ler:
- `public.update_campaign_draft`
- `public.submit_campaign_for_review`
- `public.approve_campaign`
- `public.reject_campaign`
- `public.request_revision`
- `public.suspend_campaign`
- (varsa) `public.publish_due_campaigns`, `public.close_campaign`, `public.cancel_campaign` — `pg_proc`'tan tarayıp aynı satırı ekle.

`set_config(..., is_local=true)` yalnızca o transaction süresince geçerli olduğundan, doğrudan SQL ile yapılan UPDATE'ler trigger'a takılmaya devam eder; güvenlik korunur.

### 2. Frontend hata mesajı dayanıklılığı

`src/lib/campaigns/errors.ts` içine ek koruma: tanımsız trigger/RPC mesajlarında en azından ham mesajı log'a yaz, kullanıcıya generic mesajı göster (mevcut davranış zaten böyle ama log eklenecek ki gelecek hatalar görünür olsun). Ayrıca `BFL_INVALID_SHORT_DESCRIPTION` için açık mesaj ekle:

```ts
if (message.includes("BFL_INVALID_SHORT_DESCRIPTION"))
  return { code, message: "Kısa açıklama 40-200 karakter olmalı." };
```

### 3. Autosave UX iyileştirmesi (küçük)

`useCampaignAutosave.schedule()` `short_description` ve `title` için RPC'nin reddedeceği uzunluklarda bile her tuş vuruşunda RPC çağırıyor → kullanıcı yazarken ara hata toast'ları görüyor. Düzeltme:

- `BasicsStepForm` zaten client-side min/max gösteriyor. `schedule` çağrısını **yalnızca** alan RPC kabul aralığındayken yap; aksi halde sadece local state'i güncelle, RPC tetikleme. `MarkdownStepForm` için RPC zaten min kontrolü yapmıyor; oraya dokunmaya gerek yok ama yine de min karakteri sağlanana kadar autosave'i geciktirmek tutarlı bir deneyim sağlar.

(Bu sadece UX iyileştirmesi; ana hatayı (1) gideriyor.)

### 4. Doğrulama

Migration uygulandıktan sonra:
- Wizard'da Temel/Hedef/Hikâye/Fon/Takvim/Risk adımlarında alanları doldurup autosave + "Kaydet ve devam et" düğmelerinin başarıyla geçmesini manuel olarak doğrula.
- "Önizle" sayfasını aç, alanların geldiğini gör.
- Submit adımına git, kampanyayı incelemeye gönder (status değişimi); aynı trigger'ın hâlâ doğrudan SQL UPDATE'lerini reddettiğini `psql` ile tek bir UPDATE deneyerek doğrula (regresyon yok).
- Otomatik: `bun run test` ile mevcut campaign validation testlerini çalıştır.

## Kapsam dışı

- Tablo şemasını değiştirmek, RLS politikalarını yeniden yazmak, lock_version mekanizmasını kaldırmak.
- Reward tier / media adımlarında düzeltme (bu adımlar sorun olarak bildirilmedi; ayrı tablolar, aynı trigger'dan etkilenmiyor).
- Genel error reporting altyapısı (sadece bilinen kodları ekle).

## Etkilenen dosyalar

- Yeni migration: `supabase/migrations/<ts>_fix_campaign_field_lock_bypass.sql` — trigger fonksiyonu + 6 RPC.
- `src/lib/campaigns/errors.ts` — yeni hata kodu eşlemeleri + bilinmeyen mesaj loglaması.
- `src/components/creator/BasicsStepForm.tsx` (varsa) — autosave'i sadece geçerli aralıkta tetikle.
