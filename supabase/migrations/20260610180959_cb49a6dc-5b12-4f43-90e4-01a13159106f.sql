
create or replace function public.enforce_campaign_field_locks()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  -- Bypass when running inside a SECURITY DEFINER RPC (current_user becomes
  -- the function owner, not the JWT-mapped role). Direct UPDATEs from the
  -- Data API still execute as anon/authenticated and remain blocked.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

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
    if new.reject_reason_code  is distinct from old.reject_reason_code  then raise exception 'reject_reason_code is locked' using errcode='42501'; end if;
    if new.reject_reason_note  is distinct from old.reject_reason_note  then raise exception 'reject_reason_note is locked' using errcode='42501'; end if;
    if new.lock_version        is distinct from old.lock_version        then raise exception 'lock_version is locked' using errcode='42501'; end if;
  end if;
  return new;
end;
$$;
