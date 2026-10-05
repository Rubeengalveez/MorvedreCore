create or replace function private.notify_guardians_of_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row record;
  player_name text;
  notification_kind text;
  notification_title text;
  notification_body text;
  notification_href text;
begin
  if tg_op = 'INSERT' and new.present then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.present is not distinct from new.present then
    return new;
  end if;

  select
    session.scheduled_at,
    team.label as team_label
  into session_row
  from public.training_sessions as session
  join public.teams as team on team.id = session.team_id
  where session.id = new.session_id;

  select profile.full_name
  into player_name
  from public.profiles as profile
  where profile.id = new.player_id;

  if not new.present then
    notification_kind := 'training_absence';
    notification_title := 'Ausencia registrada';
    notification_body := format(
      '%s figura como ausente en el entrenamiento de %s del %s a las %s.',
      player_name,
      session_row.team_label,
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'DD/MM/YYYY'),
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'HH24:MI')
    );
  else
    notification_kind := 'training_attendance_corrected';
    notification_title := 'Asistencia corregida';
    notification_body := format(
      '%s figura ahora como presente en el entrenamiento de %s del %s a las %s.',
      player_name,
      session_row.team_label,
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'DD/MM/YYYY'),
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'HH24:MI')
    );
  end if;

  notification_href := format(
    '/attendance/history?player=%s&month=%s',
    new.player_id,
    to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'YYYY-MM')
  );

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    href,
    related_training_session_id,
    related_profile_id
  )
  select
    recipient.id,
    notification_kind,
    notification_title,
    notification_body,
    notification_href,
    new.session_id,
    new.player_id
  from public.profiles recipient
  where recipient.is_active and (recipient.id = new.player_id or recipient.id in (
    select link.parent_profile_id from public.parent_child_links link where link.child_profile_id = new.player_id
  ));

  return new;
end;
$$;


create function private.notify_training_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_kind text; v_title text; v_team text; v_body text;
begin
  if new.scheduled_at < now() then return new; end if;
  if new.cancelled and not old.cancelled then
    v_kind := 'training_cancelled'; v_title := 'Entrenamiento cancelado';
  elsif not new.cancelled and (old.cancelled or new.scheduled_at is distinct from old.scheduled_at or new.location is distinct from old.location or new.duration_minutes is distinct from old.duration_minutes) then
    v_kind := 'training_changed'; v_title := case when old.cancelled then 'Entrenamiento reactivado' else 'Entrenamiento actualizado' end;
  else return new;
  end if;
  select label into v_team from public.teams where id=new.team_id;
  v_body := format('%s · %s a las %s%s.',v_team,to_char(new.scheduled_at at time zone 'Europe/Madrid','DD/MM/YYYY'),to_char(new.scheduled_at at time zone 'Europe/Madrid','HH24:MI'),case when new.cancelled then ' · '||coalesce(new.cancellation_reason,'Cancelado por el club') else coalesce(' · '||new.location,'') end);
  insert into public.notifications(recipient_id,kind,title,body,href,related_training_session_id)
  select p.id,v_kind,v_title||' · '||v_team,v_body,'/calendar',new.id
  from public.profiles p where p.is_active and p.id in (
    select r.player_id from public.team_rosters r where r.team_id=new.team_id and r.left_at is null
    union select l.parent_profile_id from public.parent_child_links l where l.child_profile_id in (select r.player_id from public.team_rosters r where r.team_id=new.team_id and r.left_at is null)
    union select s.profile_id from public.team_staff s where s.team_id=new.team_id
  );
  return new;
end;
$$;
revoke all on function private.notify_training_activity() from public,anon,authenticated;
create trigger training_sessions_notify_activity after update on public.training_sessions for each row execute function private.notify_training_activity();

create function public.create_match_notification_reminders() returns integer language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  insert into public.notifications(recipient_id,kind,title,body,href,related_match_id,related_profile_id)
  select p.id,'match_reminder','Próximo partido · '||t.label,
    format('%s juega contra %s el %s a las %s.',child.full_name,m.opponent,to_char(m.scheduled_at at time zone 'Europe/Madrid','DD/MM/YYYY'),to_char(m.scheduled_at at time zone 'Europe/Madrid','HH24:MI')),
    '/matches/'||m.id::text,m.id,c.player_id
  from public.matches m join public.teams t on t.id=m.team_id
  join public.match_callups c on c.match_id=m.id and c.status in ('called','confirmed')
  join public.profiles child on child.id=c.player_id
  join public.profiles p on p.is_active and (p.id=c.player_id or p.id in (select l.parent_profile_id from public.parent_child_links l where l.child_profile_id=c.player_id))
  where m.status='scheduled' and m.scheduled_at > now() and m.scheduled_at <= now()+interval '24 hours'
    and not exists(select 1 from public.notifications n where n.kind='match_reminder' and n.recipient_id=p.id and n.related_match_id=m.id and n.related_profile_id=c.player_id and n.created_at >= now()-interval '24 hours');
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.create_match_notification_reminders() from public,anon,authenticated;
grant execute on function public.create_match_notification_reminders() to service_role;
create or replace function public.claim_notification_push(p_limit integer default 40)
returns table(job_id uuid,notification jsonb,subscription jsonb,muted boolean)
language plpgsql security invoker set search_path = '' as $$
begin
  update public.notification_push_deliveries d set status='skipped',finished_at=now()
  from public.notifications n where n.id=d.notification_id and d.status in ('pending','processing')
    and (n.created_at < now()-interval '24 hours' or (n.kind='match_reminder' and n.created_at < now()-interval '1 hour'));
  update public.notification_push_deliveries set status='failed',finished_at=now(),last_error='Delivery attempts exhausted'
  where status='processing' and attempts >= 5 and claimed_at < now()-interval '5 minutes';
  return query
  with candidates as (
    select d.id from public.notification_push_deliveries d
    where d.attempts < 5 and d.available_at <= now()
      and (d.status='pending' or (d.status='processing' and d.claimed_at < now()-interval '5 minutes'))
    order by d.available_at,d.id for update skip locked limit greatest(1,least(p_limit,100))
  ), claimed as (
    update public.notification_push_deliveries d set status='processing',claimed_at=now(),attempts=d.attempts+1
    from candidates c where d.id=c.id returning d.*
  )
  select d.id,to_jsonb(n),jsonb_build_object('id',s.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth),
    (not s.enabled or not p.is_active or not coalesce(pref.enabled,true))
  from claimed d join public.notifications n on n.id=d.notification_id
  join public.push_subscriptions s on s.id=d.subscription_id
  join public.profiles p on p.id=n.recipient_id
  left join public.profile_notification_prefs pref on pref.profile_id=n.recipient_id and pref.notification_type=private.notification_push_topic(n.kind,n.href);
end;
$$;
