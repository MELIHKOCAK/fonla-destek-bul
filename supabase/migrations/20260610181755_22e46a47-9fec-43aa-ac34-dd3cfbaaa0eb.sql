CREATE OR REPLACE FUNCTION public.submit_campaign_for_review(_campaign_id uuid, _expected_lock_version integer)
 RETURNS campaigns
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if _row.status in ('submitted','under_review') then
    return _row;
  end if;
  if _row.status not in ('draft','revision_requested') then
    raise exception 'BFL_NOT_SUBMITTABLE' using errcode = '42501';
  end if;
  if _row.lock_version <> _expected_lock_version then
    raise exception 'BFL_CONFLICT' using errcode = '40001';
  end if;

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

  select count(*) into _active_rewards from public.reward_tiers where campaign_id = _campaign_id and is_active = true;
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

  -- Admin'lere bildirim (partial unique index ile uyumlu ON CONFLICT)
  insert into public.notifications (user_id, type, title, body, data, dedupe_key)
  select ur.user_id, 'campaign_submitted',
         'Yeni kampanya incelemeye gönderildi',
         _row.title,
         jsonb_build_object('campaign_id', _campaign_id),
         'campaign_submitted:' || _campaign_id::text
    from public.user_roles ur
   where ur.role = 'admin'
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return _row;
end;
$function$;