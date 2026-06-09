-- ============================================================
-- Faz 8: RLS / Authorization Hardening
-- ============================================================

-- ---------- 1. Helper fonksiyonlar ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.campaign_is_public(_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = _campaign_id
      and status in ('live','successful')
  );
$$;

create or replace function public.campaign_owned_by_me(_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = _campaign_id
      and creator_id = auth.uid()
  );
$$;

create or replace function public.campaign_status(_campaign_id uuid)
returns campaign_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.campaigns where id = _campaign_id;
$$;

-- ---------- 2. campaign_reviews: creator_visible_notes kolonu ----------

alter table public.campaign_reviews
  add column if not exists creator_visible_notes text;

-- ---------- 3. Kolon kilidi trigger'ları ----------

create or replace function public.enforce_campaign_field_locks()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Sadece kampanya sahibi tarafından yapılan update'lerde kilidi uygula.
  -- service_role / admin SECURITY DEFINER yollarıyla update yaptığında
  -- auth.uid() değişmez; bu yüzden ek kontrol: sadece auth.uid() = creator_id
  -- senaryosunda kilidi devreye alıyoruz. Admin operasyonu RLS'i bypass
  -- eden SECURITY DEFINER state-machine fonksiyonu üzerinden geçecek.
  if auth.uid() is not null
     and auth.uid() = old.creator_id
     and not public.is_admin() then
    if new.creator_id          is distinct from old.creator_id          then raise exception 'creator_id is locked' using errcode='42501'; end if;
    if new.status              is distinct from old.status              then raise exception 'status is locked'     using errcode='42501'; end if;
    if new.submitted_at        is distinct from old.submitted_at        then raise exception 'submitted_at is locked' using errcode='42501'; end if;
    if new.approved_at         is distinct from old.approved_at         then raise exception 'approved_at is locked' using errcode='42501'; end if;
    if new.published_at        is distinct from old.published_at        then raise exception 'published_at is locked' using errcode='42501'; end if;
    if new.closed_at           is distinct from old.closed_at           then raise exception 'closed_at is locked' using errcode='42501'; end if;
    if new.cancellation_reason is distinct from old.cancellation_reason then raise exception 'cancellation_reason is locked' using errcode='42501'; end if;
    if new.suspension_reason   is distinct from old.suspension_reason   then raise exception 'suspension_reason is locked' using errcode='42501'; end if;
    if new.lock_version        is distinct from old.lock_version        then raise exception 'lock_version is locked' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_campaign_field_locks on public.campaigns;
create trigger trg_enforce_campaign_field_locks
before update on public.campaigns
for each row execute function public.enforce_campaign_field_locks();

create or replace function public.enforce_profile_field_locks()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.id is distinct from old.id then
      raise exception 'profile id is locked' using errcode='42501';
    end if;
    if new.created_at is distinct from old.created_at then
      raise exception 'profile created_at is locked' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_field_locks on public.profiles;
create trigger trg_enforce_profile_field_locks
before update on public.profiles
for each row execute function public.enforce_profile_field_locks();

create or replace function public.notifications_lock_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    if new.user_id    is distinct from old.user_id    then raise exception 'user_id is locked'   using errcode='42501'; end if;
    if new.type       is distinct from old.type       then raise exception 'type is locked'      using errcode='42501'; end if;
    if new.title      is distinct from old.title      then raise exception 'title is locked'     using errcode='42501'; end if;
    if new.body       is distinct from old.body       then raise exception 'body is locked'      using errcode='42501'; end if;
    if new.data       is distinct from old.data       then raise exception 'data is locked'      using errcode='42501'; end if;
    if new.dedupe_key is distinct from old.dedupe_key then raise exception 'dedupe_key is locked' using errcode='42501'; end if;
    if new.created_at is distinct from old.created_at then raise exception 'created_at is locked' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_lock_fields on public.notifications;
create trigger trg_notifications_lock_fields
before update on public.notifications
for each row execute function public.notifications_lock_fields();

-- ---------- 4. user_roles ek policy ----------

drop policy if exists user_roles_admin_read on public.user_roles;
create policy user_roles_admin_read on public.user_roles
for select to authenticated
using (public.is_admin());

-- ---------- 5. campaigns policies ----------

drop policy if exists campaigns_public_read_visible on public.campaigns;
create policy campaigns_public_read_visible on public.campaigns
for select to anon, authenticated
using (status in ('live','successful'));

drop policy if exists campaigns_creator_read_own on public.campaigns;
create policy campaigns_creator_read_own on public.campaigns
for select to authenticated
using (creator_id = auth.uid());

drop policy if exists campaigns_admin_read_all on public.campaigns;
create policy campaigns_admin_read_all on public.campaigns
for select to authenticated
using (public.is_admin());

drop policy if exists campaigns_creator_insert_draft on public.campaigns;
create policy campaigns_creator_insert_draft on public.campaigns
for insert to authenticated
with check (
  creator_id = auth.uid()
  and status = 'draft'
  and submitted_at is null
  and approved_at  is null
  and published_at is null
  and closed_at    is null
);

drop policy if exists campaigns_creator_update_editable on public.campaigns;
create policy campaigns_creator_update_editable on public.campaigns
for update to authenticated
using (creator_id = auth.uid() and status in ('draft','revision_requested'))
with check (creator_id = auth.uid() and status in ('draft','revision_requested'));

-- ---------- 6. campaign_media ----------

drop policy if exists campaign_media_public_read on public.campaign_media;
create policy campaign_media_public_read on public.campaign_media
for select to anon, authenticated
using (public.campaign_is_public(campaign_id));

drop policy if exists campaign_media_owner_read on public.campaign_media;
create policy campaign_media_owner_read on public.campaign_media
for select to authenticated
using (public.campaign_owned_by_me(campaign_id));

drop policy if exists campaign_media_admin_read on public.campaign_media;
create policy campaign_media_admin_read on public.campaign_media
for select to authenticated
using (public.is_admin());

drop policy if exists campaign_media_owner_write on public.campaign_media;
create policy campaign_media_owner_write on public.campaign_media
for insert to authenticated
with check (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

drop policy if exists campaign_media_owner_update on public.campaign_media;
create policy campaign_media_owner_update on public.campaign_media
for update to authenticated
using (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
)
with check (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

drop policy if exists campaign_media_owner_delete on public.campaign_media;
create policy campaign_media_owner_delete on public.campaign_media
for delete to authenticated
using (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

-- ---------- 7. reward_tiers ----------

drop policy if exists reward_tiers_public_read on public.reward_tiers;
create policy reward_tiers_public_read on public.reward_tiers
for select to anon, authenticated
using (is_active and public.campaign_is_public(campaign_id));

drop policy if exists reward_tiers_owner_read on public.reward_tiers;
create policy reward_tiers_owner_read on public.reward_tiers
for select to authenticated
using (public.campaign_owned_by_me(campaign_id));

drop policy if exists reward_tiers_admin_read on public.reward_tiers;
create policy reward_tiers_admin_read on public.reward_tiers
for select to authenticated
using (public.is_admin());

drop policy if exists reward_tiers_owner_write on public.reward_tiers;
create policy reward_tiers_owner_write on public.reward_tiers
for insert to authenticated
with check (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

drop policy if exists reward_tiers_owner_update on public.reward_tiers;
create policy reward_tiers_owner_update on public.reward_tiers
for update to authenticated
using (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
)
with check (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

drop policy if exists reward_tiers_owner_delete on public.reward_tiers;
create policy reward_tiers_owner_delete on public.reward_tiers
for delete to authenticated
using (
  public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('draft','revision_requested')
);

-- ---------- 8. campaign_updates ----------

drop policy if exists campaign_updates_public_read on public.campaign_updates;
create policy campaign_updates_public_read on public.campaign_updates
for select to anon, authenticated
using (is_published and public.campaign_is_public(campaign_id));

drop policy if exists campaign_updates_owner_read on public.campaign_updates;
create policy campaign_updates_owner_read on public.campaign_updates
for select to authenticated
using (public.campaign_owned_by_me(campaign_id));

drop policy if exists campaign_updates_admin_read on public.campaign_updates;
create policy campaign_updates_admin_read on public.campaign_updates
for select to authenticated
using (public.is_admin());

drop policy if exists campaign_updates_owner_write on public.campaign_updates;
create policy campaign_updates_owner_write on public.campaign_updates
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.campaign_owned_by_me(campaign_id)
  and public.campaign_status(campaign_id) in ('live','successful')
);

drop policy if exists campaign_updates_owner_update on public.campaign_updates;
create policy campaign_updates_owner_update on public.campaign_updates
for update to authenticated
using (author_id = auth.uid() and public.campaign_owned_by_me(campaign_id))
with check (author_id = auth.uid() and public.campaign_owned_by_me(campaign_id));

drop policy if exists campaign_updates_owner_delete on public.campaign_updates;
create policy campaign_updates_owner_delete on public.campaign_updates
for delete to authenticated
using (author_id = auth.uid() and public.campaign_owned_by_me(campaign_id));

-- ---------- 9. campaign_reviews (admin-internal) ----------

drop policy if exists campaign_reviews_admin_read on public.campaign_reviews;
create policy campaign_reviews_admin_read on public.campaign_reviews
for select to authenticated
using (public.is_admin());
-- INSERT/UPDATE/DELETE: yok (service_role bypass).

-- ---------- 10. favorites ----------

drop policy if exists favorites_self_read on public.favorites;
create policy favorites_self_read on public.favorites
for select to authenticated
using (user_id = auth.uid());

drop policy if exists favorites_self_insert on public.favorites;
create policy favorites_self_insert on public.favorites
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists favorites_self_delete on public.favorites;
create policy favorites_self_delete on public.favorites
for delete to authenticated
using (user_id = auth.uid());

-- ---------- 11. notifications ----------

drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
-- INSERT/DELETE: yok (service_role).

-- ---------- 12. contributions raw → admin only ----------

drop policy if exists contributions_admin_read on public.contributions;
create policy contributions_admin_read on public.contributions
for select to authenticated
using (public.is_admin());
-- backer/creator için view'lar aşağıda.

-- ---------- 13. Finans / audit admin-read ----------

do $$
declare
  t text;
begin
  foreach t in array array[
    'audit_logs',
    'payment_transactions',
    'refunds',
    'payouts',
    'platform_fees',
    'financial_ledger_entries',
    'webhook_events',
    'idempotency_keys'
  ]
  loop
    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format(
      'create policy %I_admin_read on public.%I for select to authenticated using (public.is_admin())',
      t, t
    );
  end loop;
end$$;

-- ---------- 14. Görünümler (security_invoker) ----------

drop view if exists public.profiles_public;
create view public.profiles_public
with (security_invoker = on) as
  select id, username, display_name, bio, avatar_path, website_url, location, created_at
  from public.profiles
  where is_public = true;

grant select on public.profiles_public to anon, authenticated;

drop view if exists public.my_contributions;
create view public.my_contributions
with (security_invoker = on) as
  select
    id, campaign_id, reward_tier_id, amount_minor, currency, status,
    anonymous, created_at, updated_at
  from public.contributions
  where backer_id = auth.uid();

-- View security_invoker olduğu için contributions tablosunda backer için
-- SELECT policy gerekiyor; tabloya policy eklemek istemiyoruz çünkü ek
-- kolonlar PII içeriyor. Bu yüzden view SECURITY DEFINER bir RPC ile
-- desteklenir. Basitleştirmek için backer policy ekliyoruz (sadece
-- view tarafından sorgulanan kolonlar zaten projeksiyon kısıtlamasıyla
-- güvenli; ancak RAW select de gerekirse PII alanları erişilebilir hale
-- gelir). Bu nedenle view yerine SECURITY DEFINER fonksiyon kullanıyoruz:

drop view if exists public.my_contributions;

create or replace function public.my_contributions()
returns table (
  id uuid,
  campaign_id uuid,
  reward_tier_id uuid,
  amount_minor bigint,
  currency char,
  status contribution_status,
  anonymous boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, campaign_id, reward_tier_id, amount_minor, currency, status,
         anonymous, created_at, updated_at
  from public.contributions
  where backer_id = auth.uid();
$$;

create or replace function public.campaign_contributions_for_creator(_campaign_id uuid)
returns table (
  id uuid,
  campaign_id uuid,
  reward_tier_id uuid,
  amount_minor bigint,
  currency char,
  status contribution_status,
  anonymous boolean,
  display_name_snapshot text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.campaign_id, c.reward_tier_id, c.amount_minor, c.currency,
         c.status, c.anonymous,
         case when c.anonymous then null else c.display_name_snapshot end,
         c.created_at
  from public.contributions c
  where c.campaign_id = _campaign_id
    and exists (
      select 1 from public.campaigns ca
      where ca.id = _campaign_id and ca.creator_id = auth.uid()
    );
$$;

drop view if exists public.creator_campaign_reviews;
create view public.creator_campaign_reviews
with (security_invoker = on) as
  select r.id, r.campaign_id, r.decision, r.creator_visible_notes,
         r.from_status, r.to_status, r.created_at
  from public.campaign_reviews r
  where exists (
    select 1 from public.campaigns c
    where c.id = r.campaign_id and c.creator_id = auth.uid()
  );

-- creator_campaign_reviews view'ı çalışsın diye campaign_reviews tablosunda
-- creator için sınırlı bir SELECT policy gerek; ancak notes alanı sızabilir.
-- Bu nedenle view yerine SECURITY DEFINER fonksiyon kullanıyoruz:

drop view if exists public.creator_campaign_reviews;

create or replace function public.creator_campaign_reviews(_campaign_id uuid)
returns table (
  id uuid,
  campaign_id uuid,
  decision review_decision,
  creator_visible_notes text,
  from_status campaign_status,
  to_status campaign_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.campaign_id, r.decision, r.creator_visible_notes,
         r.from_status, r.to_status, r.created_at
  from public.campaign_reviews r
  where r.campaign_id = _campaign_id
    and exists (
      select 1 from public.campaigns c
      where c.id = _campaign_id and c.creator_id = auth.uid()
    );
$$;

-- ---------- 15. Function grants (whitelist) ----------

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on function public.has_role(uuid, user_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.campaign_is_public(uuid) to anon, authenticated;
grant execute on function public.campaign_owned_by_me(uuid) to authenticated;
grant execute on function public.campaign_status(uuid) to authenticated;
grant execute on function public.check_username_available(citext) to anon, authenticated;
grant execute on function public.claim_username(citext) to authenticated;
grant execute on function public.is_username_reserved(text) to anon, authenticated;
grant execute on function public.my_contributions() to authenticated;
grant execute on function public.campaign_contributions_for_creator(uuid) to authenticated;
grant execute on function public.creator_campaign_reviews(uuid) to authenticated;

-- ---------- 16. Storage: campaign-media policies ----------

drop policy if exists campaign_media_public_select on storage.objects;
create policy campaign_media_public_select on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'campaign-media'
  and public.campaign_is_public(((storage.foldername(name))[1])::uuid)
);

drop policy if exists campaign_media_owner_select on storage.objects;
create policy campaign_media_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'campaign-media'
  and public.campaign_owned_by_me(((storage.foldername(name))[1])::uuid)
);

drop policy if exists campaign_media_admin_select on storage.objects;
create policy campaign_media_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'campaign-media' and public.is_admin());

drop policy if exists campaign_media_owner_insert on storage.objects;
create policy campaign_media_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'campaign-media'
  and public.campaign_owned_by_me(((storage.foldername(name))[1])::uuid)
  and public.campaign_status(((storage.foldername(name))[1])::uuid) in ('draft','revision_requested')
);

drop policy if exists campaign_media_owner_update on storage.objects;
create policy campaign_media_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'campaign-media'
  and public.campaign_owned_by_me(((storage.foldername(name))[1])::uuid)
  and public.campaign_status(((storage.foldername(name))[1])::uuid) in ('draft','revision_requested')
)
with check (
  bucket_id = 'campaign-media'
  and public.campaign_owned_by_me(((storage.foldername(name))[1])::uuid)
  and public.campaign_status(((storage.foldername(name))[1])::uuid) in ('draft','revision_requested')
);

drop policy if exists campaign_media_owner_delete on storage.objects;
create policy campaign_media_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'campaign-media'
  and public.campaign_owned_by_me(((storage.foldername(name))[1])::uuid)
  and public.campaign_status(((storage.foldername(name))[1])::uuid) in ('draft','revision_requested')
);
