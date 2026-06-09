-- Add reject reason columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS reject_reason_code text,
  ADD COLUMN IF NOT EXISTS reject_reason_note text;

-- Update field-lock trigger to cover new columns
CREATE OR REPLACE FUNCTION public.enforce_campaign_field_locks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin
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

-- Helper: assert caller is admin
CREATE OR REPLACE FUNCTION public._assert_admin()
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
begin
  if auth.uid() is null then
    raise exception 'BFL_NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  if not public.is_admin() then
    raise exception 'BFL_FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

-- start_campaign_review: submitted -> under_review (idempotent if already under_review by self)
CREATE OR REPLACE FUNCTION public.start_campaign_review(_campaign_id uuid, _expected_lock_version integer)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
begin
  perform public._assert_admin();

  select * into _row from public.campaigns where id = _campaign_id for update;
  if not found then raise exception 'BFL_NOT_FOUND' using errcode='P0002'; end if;

  if _row.status = 'under_review' then
    return _row;
  end if;
  if _row.status <> 'submitted' then
    raise exception 'BFL_INVALID_STATUS' using errcode='42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode='40001';
  end if;

  update public.campaigns
     set status='under_review',
         lock_version=lock_version+1,
         updated_at=now()
   where id=_campaign_id
   returning * into _row;

  insert into public.campaign_reviews
    (campaign_id, reviewer_id, decision, notes, from_status, to_status)
  values (_campaign_id, _uid, 'reinstated', null, 'submitted', 'under_review');

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, before_data, after_data)
  values ('campaign', _campaign_id, 'start_review', _uid,
          jsonb_build_object('status','submitted'),
          jsonb_build_object('status','under_review'));

  return _row;
end;
$$;

-- request_campaign_revision: under_review -> revision_requested
CREATE OR REPLACE FUNCTION public.request_campaign_revision(
  _campaign_id uuid,
  _expected_lock_version integer,
  _creator_note text,
  _issues jsonb default '[]'::jsonb
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _note text := nullif(trim(_creator_note), '');
begin
  perform public._assert_admin();
  if _note is null or length(_note) < 10 then
    raise exception 'BFL_REASON_REQUIRED' using errcode='22023';
  end if;

  select * into _row from public.campaigns where id=_campaign_id for update;
  if not found then raise exception 'BFL_NOT_FOUND' using errcode='P0002'; end if;
  if _row.status <> 'under_review' then
    raise exception 'BFL_INVALID_STATUS' using errcode='42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode='40001';
  end if;

  update public.campaigns
     set status='revision_requested',
         lock_version=lock_version+1,
         updated_at=now()
   where id=_campaign_id
   returning * into _row;

  insert into public.campaign_reviews
    (campaign_id, reviewer_id, decision, notes, creator_visible_notes, from_status, to_status)
  values (_campaign_id, _uid, 'revision_requested', _issues::text, _note, 'under_review', 'revision_requested');

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, reason, before_data, after_data)
  values ('campaign', _campaign_id, 'request_revision', _uid, _note,
          jsonb_build_object('status','under_review'),
          jsonb_build_object('status','revision_requested','issues',_issues));

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (_row.creator_id, 'campaign_revision_requested',
          'Kampanyanız için düzeltme istendi',
          _note,
          jsonb_build_object('campaign_id', _campaign_id),
          'campaign_revision_requested:' || _campaign_id::text || ':' || _row.lock_version::text)
  on conflict (user_id, dedupe_key) do nothing;

  return _row;
end;
$$;

-- approve_campaign: under_review -> live or scheduled
CREATE OR REPLACE FUNCTION public.approve_campaign(
  _campaign_id uuid,
  _expected_lock_version integer,
  _internal_note text default null,
  _creator_note text default null
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _errors text[] := array[]::text[];
  _has_cover boolean;
  _active_rewards int;
  _new_status public.campaign_status;
begin
  perform public._assert_admin();

  select * into _row from public.campaigns where id=_campaign_id for update;
  if not found then raise exception 'BFL_NOT_FOUND' using errcode='P0002'; end if;
  if _row.status = 'live' or _row.status = 'scheduled' then
    return _row; -- idempotent
  end if;
  if _row.status <> 'under_review' then
    raise exception 'BFL_INVALID_STATUS' using errcode='42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode='40001';
  end if;

  -- Re-validate
  if _row.title is null or length(_row.title) < 5 then _errors:=array_append(_errors,'title'); end if;
  if _row.short_description is null or length(_row.short_description) < 40 then _errors:=array_append(_errors,'short_description'); end if;
  if _row.story_content is null or length(_row.story_content) < 300 then _errors:=array_append(_errors,'story_content'); end if;
  if _row.funds_usage_content is null or length(_row.funds_usage_content) < 100 then _errors:=array_append(_errors,'funds_usage_content'); end if;
  if _row.timeline_content is null or length(_row.timeline_content) < 100 then _errors:=array_append(_errors,'timeline_content'); end if;
  if _row.risks_content is null or length(_row.risks_content) < 100 then _errors:=array_append(_errors,'risks_content'); end if;
  if _row.goal_amount_minor is null or _row.goal_amount_minor < 100000 or _row.goal_amount_minor > 500000000 then
    _errors:=array_append(_errors,'goal_amount_minor');
  end if;
  if _row.start_at is null then _errors:=array_append(_errors,'start_at'); end if;
  if _row.end_at is null then _errors:=array_append(_errors,'end_at'); end if;
  if _row.category_id is null then _errors:=array_append(_errors,'category_id'); end if;

  select exists(select 1 from public.campaign_media where campaign_id=_campaign_id and is_cover=true) into _has_cover;
  if not _has_cover then _errors:=array_append(_errors,'cover_media'); end if;

  select count(*) into _active_rewards from public.reward_tiers where campaign_id=_campaign_id and is_active=true;
  if _active_rewards < 1 then _errors:=array_append(_errors,'reward_tiers'); end if;

  if array_length(_errors,1) > 0 then
    raise exception 'BFL_VALIDATION: %', array_to_string(_errors,',') using errcode='22023';
  end if;

  if _row.start_at > now() then
    _new_status := 'scheduled';
    update public.campaigns
       set status=_new_status,
           approved_at=now(),
           lock_version=lock_version+1,
           updated_at=now()
     where id=_campaign_id
     returning * into _row;
  else
    _new_status := 'live';
    update public.campaigns
       set status=_new_status,
           approved_at=now(),
           published_at=now(),
           lock_version=lock_version+1,
           updated_at=now()
     where id=_campaign_id
     returning * into _row;
  end if;

  insert into public.campaign_reviews
    (campaign_id, reviewer_id, decision, notes, creator_visible_notes, from_status, to_status)
  values (_campaign_id, _uid, 'approved', _internal_note, _creator_note, 'under_review', _new_status);

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, reason, before_data, after_data)
  values ('campaign', _campaign_id, 'approve', _uid, _internal_note,
          jsonb_build_object('status','under_review'),
          jsonb_build_object('status', _new_status));

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (_row.creator_id,
          case when _new_status='scheduled' then 'campaign_scheduled' else 'campaign_approved' end,
          case when _new_status='scheduled' then 'Kampanyanız onaylandı, yayın planlandı' else 'Kampanyanız onaylandı ve yayında' end,
          coalesce(_creator_note, _row.title),
          jsonb_build_object('campaign_id', _campaign_id),
          'campaign_approved:' || _campaign_id::text || ':' || _row.lock_version::text)
  on conflict (user_id, dedupe_key) do nothing;

  return _row;
end;
$$;

-- reject_campaign
CREATE OR REPLACE FUNCTION public.reject_campaign(
  _campaign_id uuid,
  _expected_lock_version integer,
  _reason_code text,
  _creator_note text
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _note text := nullif(trim(_creator_note), '');
  _code text := nullif(trim(_reason_code), '');
begin
  perform public._assert_admin();
  if _code is null or _code not in ('policy','incomplete','duplicate','risk','other') then
    raise exception 'BFL_INVALID_REASON_CODE' using errcode='22023';
  end if;
  if _note is null or length(_note) < 10 then
    raise exception 'BFL_REASON_REQUIRED' using errcode='22023';
  end if;

  select * into _row from public.campaigns where id=_campaign_id for update;
  if not found then raise exception 'BFL_NOT_FOUND' using errcode='P0002'; end if;
  if _row.status = 'rejected' then return _row; end if;
  if _row.status <> 'under_review' then
    raise exception 'BFL_INVALID_STATUS' using errcode='42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode='40001';
  end if;

  update public.campaigns
     set status='rejected',
         reject_reason_code=_code,
         reject_reason_note=_note,
         closed_at=now(),
         lock_version=lock_version+1,
         updated_at=now()
   where id=_campaign_id
   returning * into _row;

  insert into public.campaign_reviews
    (campaign_id, reviewer_id, decision, notes, creator_visible_notes, from_status, to_status)
  values (_campaign_id, _uid, 'rejected', _code, _note, 'under_review', 'rejected');

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, reason, before_data, after_data)
  values ('campaign', _campaign_id, 'reject', _uid, _note,
          jsonb_build_object('status','under_review'),
          jsonb_build_object('status','rejected','reason_code',_code));

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (_row.creator_id, 'campaign_rejected',
          'Kampanyanız reddedildi',
          _note,
          jsonb_build_object('campaign_id', _campaign_id, 'reason_code', _code),
          'campaign_rejected:' || _campaign_id::text || ':' || _row.lock_version::text)
  on conflict (user_id, dedupe_key) do nothing;

  return _row;
end;
$$;

-- suspend_campaign: live -> suspended
CREATE OR REPLACE FUNCTION public.suspend_campaign(
  _campaign_id uuid,
  _expected_lock_version integer,
  _reason text
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _note text := nullif(trim(_reason), '');
begin
  perform public._assert_admin();
  if _note is null or length(_note) < 10 then
    raise exception 'BFL_REASON_REQUIRED' using errcode='22023';
  end if;

  select * into _row from public.campaigns where id=_campaign_id for update;
  if not found then raise exception 'BFL_NOT_FOUND' using errcode='P0002'; end if;
  if _row.status = 'suspended' then return _row; end if;
  if _row.status <> 'live' then
    raise exception 'BFL_INVALID_STATUS' using errcode='42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode='40001';
  end if;

  update public.campaigns
     set status='suspended',
         suspension_reason=_note,
         lock_version=lock_version+1,
         updated_at=now()
   where id=_campaign_id
   returning * into _row;

  insert into public.campaign_reviews
    (campaign_id, reviewer_id, decision, notes, creator_visible_notes, from_status, to_status)
  values (_campaign_id, _uid, 'suspended', _note, _note, 'live', 'suspended');

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, reason, before_data, after_data)
  values ('campaign', _campaign_id, 'suspend', _uid, _note,
          jsonb_build_object('status','live'),
          jsonb_build_object('status','suspended'));

  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  values (_row.creator_id, 'campaign_suspended',
          'Kampanyanız askıya alındı',
          _note,
          jsonb_build_object('campaign_id', _campaign_id),
          'campaign_suspended:' || _campaign_id::text || ':' || _row.lock_version::text)
  on conflict (user_id, dedupe_key) do nothing;

  return _row;
end;
$$;

-- publish_due_campaigns: server-only batch publisher
CREATE OR REPLACE FUNCTION public.publish_due_campaigns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _r record;
  _count int := 0;
begin
  for _r in
    select id, creator_id, lock_version, title
      from public.campaigns
     where status = 'scheduled'
       and start_at is not null
       and start_at <= now()
     for update skip locked
  loop
    update public.campaigns
       set status='live',
           published_at=now(),
           lock_version=lock_version+1,
           updated_at=now()
     where id=_r.id and status='scheduled';

    if found then
      insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, before_data, after_data)
      values ('campaign', _r.id, 'auto_publish', null,
              jsonb_build_object('status','scheduled'),
              jsonb_build_object('status','live'));

      insert into public.notifications (user_id, type, title, body, data, dedupe_key)
      values (_r.creator_id, 'campaign_live',
              'Kampanyanız yayında',
              _r.title,
              jsonb_build_object('campaign_id', _r.id),
              'campaign_live:' || _r.id::text)
      on conflict (user_id, dedupe_key) do nothing;

      _count := _count + 1;
    end if;
  end loop;
  return _count;
end;
$$;

-- Grants
REVOKE ALL ON FUNCTION public.start_campaign_review(uuid,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_campaign_revision(uuid,integer,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_campaign(uuid,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_campaign(uuid,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.suspend_campaign(uuid,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_due_campaigns() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._assert_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_campaign_review(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_campaign_revision(uuid,integer,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_campaign(uuid,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_campaign(uuid,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_campaign(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_due_campaigns() TO service_role;
GRANT EXECUTE ON FUNCTION public._assert_admin() TO authenticated;