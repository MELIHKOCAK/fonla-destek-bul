
-- 1) Reserved usernames helper
create or replace function public.is_username_reserved(_username text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(_username) = any (array[
    'admin','administrator','support','help','benifonla','api','auth',
    'login','register','signup','signin','settings','profile','dashboard',
    'root','system','info','contact','about','faq','terms','privacy',
    'creator','creators','campaign','campaigns','discover','search',
    'me','user','users','null','undefined'
  ]);
$$;

revoke all on function public.is_username_reserved(text) from public;
grant execute on function public.is_username_reserved(text) to anon, authenticated;

-- 2) Trigger function to create a profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _display_name text;
begin
  _display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name','')), '');
  if _display_name is not null and length(_display_name) > 100 then
    _display_name := substring(_display_name from 1 for 100);
  end if;

  begin
    insert into public.profiles (id, display_name)
    values (new.id, _display_name);
  exception
    when unique_violation then
      -- profile already exists, ignore
      null;
    when others then
      -- never break auth signup because of profile insert failure
      raise warning 'handle_new_user: profile insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3) Username availability check (read-only)
create or replace function public.check_username_available(_username citext)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _norm citext := lower(_username::text)::citext;
begin
  if _norm is null or length(_norm::text) < 3 or length(_norm::text) > 30 then
    return false;
  end if;
  if _norm::text !~ '^[a-z0-9_]+$' then
    return false;
  end if;
  if public.is_username_reserved(_norm::text) then
    return false;
  end if;
  return not exists (select 1 from public.profiles where username = _norm);
end;
$$;

revoke all on function public.check_username_available(citext) from public;
grant execute on function public.check_username_available(citext) to anon, authenticated;

-- 4) Atomic username claim for the calling user
create or replace function public.claim_username(_username citext)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _norm citext := lower(_username::text)::citext;
begin
  if _uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if _norm is null or length(_norm::text) < 3 or length(_norm::text) > 30 then
    raise exception 'Invalid username length' using errcode = '22023';
  end if;
  if _norm::text !~ '^[a-z0-9_]+$' then
    raise exception 'Invalid username format' using errcode = '22023';
  end if;
  if public.is_username_reserved(_norm::text) then
    raise exception 'Username is reserved' using errcode = '22023';
  end if;

  update public.profiles
     set username = _norm
   where id = _uid
     and (username is null or username = _norm);

  if not found then
    -- Either profile missing or username already set to something else
    if not exists (select 1 from public.profiles where id = _uid) then
      insert into public.profiles (id, username) values (_uid, _norm);
    else
      raise exception 'Username already set for this account' using errcode = '23505';
    end if;
  end if;
end;
$$;

revoke all on function public.claim_username(citext) from public;
grant execute on function public.claim_username(citext) to authenticated;

-- 5) Storage RLS for avatars bucket (private bucket; signed URLs for read)
-- Users can read their own avatars; service role can read all; public read uses signed URLs.
create policy "avatars_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
