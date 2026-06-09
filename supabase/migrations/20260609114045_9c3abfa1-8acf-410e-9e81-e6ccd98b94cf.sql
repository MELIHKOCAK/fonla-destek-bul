
-- =========================================================================
-- Campaign wizard: draft create / update / submit RPCs
-- =========================================================================

-- 1) Slug üretici
create or replace function public.generate_unique_campaign_slug(_base text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _slug text;
  _candidate text;
  _i int := 0;
begin
  _slug := lower(regexp_replace(coalesce(_base,''), '[^a-zA-Z0-9]+', '-', 'g'));
  _slug := regexp_replace(_slug, '(^-+|-+$)', '', 'g');
  _slug := substring(_slug from 1 for 60);
  if _slug is null or length(_slug) < 1 then
    _slug := 'kampanya';
  end if;
  _candidate := _slug;
  while exists (select 1 from public.campaigns where slug = _candidate) loop
    _i := _i + 1;
    _candidate := _slug || '-' || _i::text;
  end loop;
  return _candidate;
end;
$$;

revoke all on function public.generate_unique_campaign_slug(text) from public, anon;
grant execute on function public.generate_unique_campaign_slug(text) to authenticated;

-- 2) Draft create
create or replace function public.create_campaign_draft(_category_id uuid, _title text)
returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _title_trim text := nullif(trim(_title), '');
  _slug text;
begin
  if _uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if _title_trim is null or length(_title_trim) < 5 or length(_title_trim) > 80 then
    raise exception 'BFL_INVALID_TITLE' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories where id = _category_id and is_active = true) then
    raise exception 'BFL_INVALID_CATEGORY' using errcode = '22023';
  end if;

  -- Idempotency: son 60 sn'de aynı creator + aynı title + draft + boş story varsa onu döner
  select * into _row
    from public.campaigns
   where creator_id = _uid
     and status = 'draft'
     and title = _title_trim
     and (story_content is null or length(story_content) = 0)
     and created_at > now() - interval '60 seconds'
   order by created_at desc
   limit 1;
  if found then
    return _row;
  end if;

  _slug := public.generate_unique_campaign_slug(_title_trim);

  insert into public.campaigns (creator_id, category_id, title, slug, goal_amount_minor, currency, status)
  values (_uid, _category_id, _title_trim, _slug, 100000, 'TRY', 'draft')
  returning * into _row;

  return _row;
end;
$$;

revoke all on function public.create_campaign_draft(uuid, text) from public, anon;
grant execute on function public.create_campaign_draft(uuid, text) to authenticated;

-- 3) Draft update (adım bazlı patch, lock_version optimistic concurrency)
create or replace function public.update_campaign_draft(
  _campaign_id uuid,
  _expected_lock_version int,
  _patch jsonb
) returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _title text;
  _short text;
  _story text;
  _funds text;
  _timeline text;
  _risks text;
  _goal bigint;
  _start timestamptz;
  _end timestamptz;
  _category uuid;
begin
  if _uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into _row from public.campaigns where id = _campaign_id for update;
  if not found then
    raise exception 'BFL_NOT_FOUND' using errcode = 'P0002';
  end if;
  if _row.creator_id <> _uid then
    raise exception 'BFL_FORBIDDEN' using errcode = '42501';
  end if;
  if _row.status not in ('draft','revision_requested') then
    raise exception 'BFL_NOT_EDITABLE' using errcode = '42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode = '40001';
  end if;

  -- Whitelisted alanlar
  if _patch ? 'title' then
    _title := nullif(trim(_patch->>'title'),'');
    if _title is null or length(_title) < 5 or length(_title) > 80 then
      raise exception 'BFL_INVALID_TITLE' using errcode='22023';
    end if;
    _row.title := _title;
  end if;
  if _patch ? 'short_description' then
    _short := nullif(trim(_patch->>'short_description'),'');
    if _short is not null and (length(_short) < 40 or length(_short) > 200) then
      raise exception 'BFL_INVALID_SHORT_DESCRIPTION' using errcode='22023';
    end if;
    _row.short_description := _short;
  end if;
  if _patch ? 'story_content'        then _row.story_content        := nullif(_patch->>'story_content',''); end if;
  if _patch ? 'funds_usage_content'  then _row.funds_usage_content  := nullif(_patch->>'funds_usage_content',''); end if;
  if _patch ? 'timeline_content'     then _row.timeline_content     := nullif(_patch->>'timeline_content',''); end if;
  if _patch ? 'risks_content'        then _row.risks_content        := nullif(_patch->>'risks_content',''); end if;

  if _patch ? 'goal_amount_minor' then
    _goal := (_patch->>'goal_amount_minor')::bigint;
    if _goal is null or _goal < 100000 or _goal > 500000000 then
      raise exception 'BFL_INVALID_GOAL' using errcode='22023';
    end if;
    _row.goal_amount_minor := _goal;
  end if;
  if _patch ? 'start_at' then
    _start := nullif(_patch->>'start_at','')::timestamptz;
    _row.start_at := _start;
  end if;
  if _patch ? 'end_at' then
    _end := nullif(_patch->>'end_at','')::timestamptz;
    _row.end_at := _end;
  end if;
  if _row.start_at is not null and _row.end_at is not null then
    if _row.end_at <= _row.start_at then
      raise exception 'BFL_INVALID_DATES' using errcode='22023';
    end if;
    if extract(epoch from (_row.end_at - _row.start_at)) < 7*24*3600 then
      raise exception 'BFL_DURATION_TOO_SHORT' using errcode='22023';
    end if;
    if extract(epoch from (_row.end_at - _row.start_at)) > 60*24*3600 then
      raise exception 'BFL_DURATION_TOO_LONG' using errcode='22023';
    end if;
  end if;
  if _patch ? 'category_id' then
    _category := (_patch->>'category_id')::uuid;
    if not exists (select 1 from public.categories where id = _category and is_active = true) then
      raise exception 'BFL_INVALID_CATEGORY' using errcode='22023';
    end if;
    _row.category_id := _category;
  end if;

  -- Status, timestamps, creator_id locked: alanları geri set ediyoruz ki trigger ile çakışmasın
  update public.campaigns set
    title = _row.title,
    short_description = _row.short_description,
    story_content = _row.story_content,
    funds_usage_content = _row.funds_usage_content,
    timeline_content = _row.timeline_content,
    risks_content = _row.risks_content,
    goal_amount_minor = _row.goal_amount_minor,
    start_at = _row.start_at,
    end_at = _row.end_at,
    category_id = _row.category_id,
    lock_version = _row.lock_version + 1,
    updated_at = now()
  where id = _campaign_id
  returning * into _row;

  return _row;
end;
$$;

revoke all on function public.update_campaign_draft(uuid, int, jsonb) from public, anon;
grant execute on function public.update_campaign_draft(uuid, int, jsonb) to authenticated;

-- 4) Submit for review
create or replace function public.submit_campaign_for_review(
  _campaign_id uuid,
  _expected_lock_version int
) returns public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _row public.campaigns;
  _errors text[] := array[]::text[];
  _has_cover boolean;
  _active_rewards int;
begin
  if _uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into _row from public.campaigns where id = _campaign_id for update;
  if not found then
    raise exception 'BFL_NOT_FOUND' using errcode = 'P0002';
  end if;
  if _row.creator_id <> _uid then
    raise exception 'BFL_FORBIDDEN' using errcode = '42501';
  end if;

  -- Idempotent: zaten incelemeye girmişse no-op
  if _row.status in ('submitted','under_review') then
    return _row;
  end if;
  if _row.status not in ('draft','revision_requested') then
    raise exception 'BFL_NOT_SUBMITTABLE' using errcode = '42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode = '40001';
  end if;

  -- Validation
  if _row.title is null or length(_row.title) < 5 then _errors := array_append(_errors, 'title'); end if;
  if _row.short_description is null or length(_row.short_description) < 40 then _errors := array_append(_errors, 'short_description'); end if;
  if _row.story_content is null or length(_row.story_content) < 300 then _errors := array_append(_errors, 'story_content'); end if;
  if _row.funds_usage_content is null or length(_row.funds_usage_content) < 100 then _errors := array_append(_errors, 'funds_usage_content'); end if;
  if _row.timeline_content is null or length(_row.timeline_content) < 100 then _errors := array_append(_errors, 'timeline_content'); end if;
  if _row.risks_content is null or length(_row.risks_content) < 100 then _errors := array_append(_errors, 'risks_content'); end if;
  if _row.goal_amount_minor is null or _row.goal_amount_minor < 100000 or _row.goal_amount_minor > 500000000 then
    _errors := array_append(_errors, 'goal_amount_minor');
  end if;
  if _row.start_at is null then _errors := array_append(_errors, 'start_at'); end if;
  if _row.end_at is null then _errors := array_append(_errors, 'end_at'); end if;
  if _row.start_at is not null and _row.end_at is not null then
    if _row.end_at <= _row.start_at then _errors := array_append(_errors, 'dates_order'); end if;
    if extract(epoch from (_row.end_at - _row.start_at)) < 7*24*3600 then _errors := array_append(_errors, 'duration_too_short'); end if;
    if extract(epoch from (_row.end_at - _row.start_at)) > 60*24*3600 then _errors := array_append(_errors, 'duration_too_long'); end if;
  end if;
  if _row.category_id is null or not exists (select 1 from public.categories where id = _row.category_id and is_active=true) then
    _errors := array_append(_errors, 'category_id');
  end if;

  select exists(
    select 1 from public.campaign_media
    where campaign_id = _campaign_id and is_cover = true
      and (storage_path is not null or external_url is not null)
  ) into _has_cover;
  if not _has_cover then _errors := array_append(_errors, 'cover_media'); end if;

  select count(*) into _active_rewards
    from public.reward_tiers
   where campaign_id = _campaign_id and is_active = true;
  if _active_rewards < 1 then _errors := array_append(_errors, 'reward_tiers'); end if;

  if array_length(_errors,1) > 0 then
    raise exception 'BFL_VALIDATION: %', array_to_string(_errors, ',') using errcode = '22023';
  end if;

  update public.campaigns set
    status = 'submitted',
    submitted_at = now(),
    lock_version = lock_version + 1,
    updated_at = now()
  where id = _campaign_id
  returning * into _row;

  insert into public.audit_logs (entity_type, entity_id, action, actor_user_id, after_data)
  values ('campaign', _campaign_id, 'submit_for_review', _uid, jsonb_build_object('status','submitted'));

  -- Admin'lere bildirim
  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  select ur.user_id, 'campaign_submitted',
         'Yeni kampanya incelemeye gönderildi',
         _row.title,
         jsonb_build_object('campaign_id', _campaign_id),
         'campaign_submitted:' || _campaign_id::text
    from public.user_roles ur
   where ur.role = 'admin'
  on conflict (user_id, dedupe_key) do nothing;

  return _row;
end;
$$;

revoke all on function public.submit_campaign_for_review(uuid, int) from public, anon;
grant execute on function public.submit_campaign_for_review(uuid, int) to authenticated;
