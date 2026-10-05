alter table public.training_blocks add column series_id uuid;
alter table public.training_blocks add column player_ids uuid[];
alter table public.training_blocks add column excluded_dates date[] not null default '{}';
alter table public.training_blocks drop constraint training_blocks_kind_check;
alter table public.training_blocks add constraint training_blocks_kind_check check (kind in ('water','dry','meeting','physical','technical','mixed'));
alter table public.training_sessions add column joint_id uuid;
alter table public.training_sessions add column label text;
alter table public.training_sessions add column kind text not null default 'water' check (kind in ('water','dry','meeting'));
alter table public.training_sessions add column player_ids uuid[];
alter table public.training_sessions add column original_scheduled_at timestamptz;
alter table public.training_sessions add column is_exception boolean not null default false;
update public.training_sessions s set kind=case when b.kind in ('dry','physical') then 'dry' else 'water' end, label=b.label from public.training_blocks b where b.id=s.block_id;
create index training_blocks_series_idx on public.training_blocks(series_id);
create index training_sessions_joint_idx on public.training_sessions(joint_id);

create function private.guard_training_audience() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.player_ids is not null and (cardinality(new.player_ids)=0 or cardinality(new.player_ids)>300 or exists(select 1 from unnest(new.player_ids) p where not exists(select 1 from public.team_rosters r join public.profiles f on f.id=r.player_id where r.team_id=new.team_id and r.player_id=p and r.left_at is null and f.is_active))) then
    raise exception 'Elige jugadores de la plantilla activa del equipo.';
  end if;
  if tg_table_name='training_sessions' then
    if new.block_id is not null and not exists(select 1 from public.training_blocks b where b.id=new.block_id and b.team_id=new.team_id) then raise exception 'El horario no pertenece al equipo.'; end if;
    if new.duration_minutes<15 or new.duration_minutes>480 then raise exception 'La duración debe ser de 15 minutos a 8 horas.'; end if;
    if tg_op='UPDATE' and (new.scheduled_at is distinct from old.scheduled_at or new.duration_minutes is distinct from old.duration_minutes or new.cancelled is distinct from old.cancelled or new.player_ids is distinct from old.player_ids) then
      if exists(select 1 from public.training_attendance a where a.session_id=old.id) then raise exception 'Este entrenamiento ya tiene asistencia. Conserva su fecha y sus participantes.'; end if;
      new.is_exception:=true;
      new.original_scheduled_at:=coalesce(old.original_scheduled_at,old.scheduled_at);
    end if;
  end if;
  return new;
end; $$;
revoke all on function private.guard_training_audience() from public, anon, authenticated;
create trigger training_blocks_guard_audience before insert or update of team_id,player_ids on public.training_blocks for each row execute function private.guard_training_audience();
create trigger training_sessions_guard_audience before insert or update on public.training_sessions for each row execute function private.guard_training_audience();

create function private.guard_training_attendee() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.training_sessions s where s.id=new.session_id and (s.cancelled or (s.player_ids is not null and not new.player_id=any(s.player_ids)))) then raise exception 'El jugador no está incluido en este entrenamiento.'; end if;
  return new;
end; $$;
revoke all on function private.guard_training_attendee() from public, anon, authenticated;
create trigger training_attendance_guard_audience before insert or update on public.training_attendance for each row execute function private.guard_training_attendee();

create function public.manage_training_plan(p_plan jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_item jsonb; v_team uuid; v_series uuid; v_id uuid; v_block uuid; v_count integer:=0; v_old uuid[]; v_teams uuid[]; v_day date;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  if jsonb_typeof(p_plan->'team_ids')<>'array' or jsonb_array_length(p_plan->'team_ids') not between 1 and 16 or jsonb_typeof(p_plan->'blocks')<>'array' or jsonb_array_length(p_plan->'blocks')>128 or jsonb_typeof(p_plan->'sessions')<>'array' or jsonb_array_length(p_plan->'sessions') not between 1 and 6000 then raise exception 'Horario inválido o sin fechas.'; end if;
  select array_agg(value::uuid order by value) into v_teams from jsonb_array_elements_text(p_plan->'team_ids');
  foreach v_team in array v_teams loop
    if not public.can_manage_training_of(v_team) or not exists(select 1 from public.teams t join public.seasons s on s.id=t.season_id where t.id=v_team and s.is_current) then raise exception 'No tienes permiso para gestionar todos los equipos elegidos en la temporada actual.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_team::text, 39));
  end loop;
  select coalesce(array_agg(value::uuid),'{}') into v_old from jsonb_array_elements_text(coalesce(p_plan->'block_ids','[]'));
  if exists(select 1 from public.training_blocks b where b.id=any(v_old) and (not b.team_id=any(v_teams) or not public.can_manage_training_of(b.team_id))) or (select count(*) from public.training_blocks where id=any(v_old))<>cardinality(v_old) then raise exception 'No puedes modificar estos horarios.'; end if;
  if cardinality(v_old)>0 then
    perform 1 from public.training_blocks where id=any(v_old) for update;
    perform 1 from public.training_sessions where block_id=any(v_old) for update;
    delete from public.training_sessions s where s.block_id=any(v_old) and s.scheduled_at>=now() and not s.cancelled and not s.is_exception and not exists(select 1 from public.training_attendance a where a.session_id=s.id);
    update public.training_blocks set is_active=false where id=any(v_old);
  end if;
  v_series:=coalesce(nullif(p_plan->>'series_id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.training_blocks where series_id=v_series and (cardinality(v_old)=0 or not team_id=any(v_teams))) then raise exception 'Este horario conjunto debe gestionarse con todos sus equipos.'; end if;
  for v_item in select value from jsonb_array_elements(p_plan->'blocks') loop
    v_team:=(v_item->>'team_id')::uuid;
    if not v_team=any(v_teams) or v_item->>'kind' not in ('water','dry','meeting') or (v_item->>'end_date')::date-(v_item->>'start_date')::date not between 0 and 366 then raise exception 'Datos de horario inválidos.'; end if;
    insert into public.training_blocks(id,series_id,team_id,label,kind,weekdays,start_date,end_date,start_time,end_time,location,created_by,player_ids,excluded_dates)
    values((v_item->>'id')::uuid,v_series,v_team,left(v_item->>'label',100),v_item->>'kind',array(select value::smallint from jsonb_array_elements_text(v_item->'weekdays')),(v_item->>'start_date')::date,(v_item->>'end_date')::date,(v_item->>'start_time')::time,(v_item->>'end_time')::time,left(v_item->>'location',200),(select id from public.profiles where auth_user_id=auth.uid()),case when jsonb_typeof(v_item->'player_ids')='array' then array(select value::uuid from jsonb_array_elements_text(v_item->'player_ids')) else null end,array(select value::date from jsonb_array_elements_text(coalesce(v_item->'excluded_dates','[]'))));
  end loop;
  for v_item in select value from jsonb_array_elements(p_plan->'sessions') loop
    v_team:=(v_item->>'team_id')::uuid; v_block:=nullif(v_item->>'block_id','')::uuid;
    v_day:=((v_item->>'scheduled_at')::timestamptz at time zone 'Europe/Madrid')::date;
    if not v_team=any(v_teams) or v_item->>'kind' not in ('water','dry','meeting') or v_day<(now() at time zone 'Europe/Madrid')::date then raise exception 'Datos de entrenamiento inválidos.'; end if;
    if exists(select 1 from public.training_sessions s join public.training_blocks b on b.id=s.block_id where s.team_id=v_team and (s.block_id=any(v_old) or b.series_id=v_series) and (s.cancelled or s.is_exception or exists(select 1 from public.training_attendance a where a.session_id=s.id)) and (coalesce(s.original_scheduled_at,s.scheduled_at) at time zone 'Europe/Madrid')::date=v_day) then continue; end if;
    insert into public.training_sessions(block_id,team_id,joint_id,label,kind,scheduled_at,duration_minutes,location,player_ids)
    values(v_block,v_team,(v_item->>'joint_id')::uuid,left(v_item->>'label',100),v_item->>'kind',(v_item->>'scheduled_at')::timestamptz,(v_item->>'duration_minutes')::integer,left(v_item->>'location',200),case when jsonb_typeof(v_item->'player_ids')='array' then array(select value::uuid from jsonb_array_elements_text(v_item->'player_ids')) else null end);
    v_count:=v_count+1;
  end loop;
  if exists(select 1 from public.training_sessions a join public.training_sessions b on a.team_id=b.team_id and a.id<b.id and a.scheduled_at<b.scheduled_at+make_interval(mins=>b.duration_minutes) and b.scheduled_at<a.scheduled_at+make_interval(mins=>a.duration_minutes) and (a.player_ids is null or b.player_ids is null or a.player_ids && b.player_ids) where a.team_id=any(v_teams) and not a.cancelled and not b.cancelled and (a.block_id in(select (value->>'id')::uuid from jsonb_array_elements(p_plan->'blocks')) or a.joint_id in(select (value->>'joint_id')::uuid from jsonb_array_elements(p_plan->'sessions')))) then raise exception 'Este horario coincide con otro entrenamiento. Revisa las horas o los participantes.'; end if;
  return jsonb_build_object('created',v_count,'series_id',v_series);
end; $$;
revoke all on function public.manage_training_plan(jsonb) from public, anon;
grant execute on function public.manage_training_plan(jsonb) to authenticated;

create function public.change_training_dates(p_change jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare v_ids uuid[]; v_team uuid; v_row public.training_sessions; v_day date; v_count integer:=0; v_op text:=p_change->>'operation'; v_start time; v_end time;
begin
  if auth.uid() is null or v_op not in ('edit','cancel','restore','stop') then raise exception 'Acción inválida.'; end if;
  select array_agg(value::uuid) into v_ids from jsonb_array_elements_text(p_change->'session_ids');
  if coalesce(cardinality(v_ids),0) not between 1 and 1000 or (select count(*) from public.training_sessions where id=any(v_ids))<>cardinality(v_ids) then raise exception 'Revisa los entrenamientos seleccionados.'; end if;
  for v_team in select distinct team_id from public.training_sessions where id=any(v_ids) order by team_id loop
    if not public.can_manage_training_of(v_team) then raise exception 'No tienes permiso para todos los equipos elegidos.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_team::text,39));
  end loop;
  if v_op='cancel' and length(trim(coalesce(p_change->>'reason','')))<2 then raise exception 'Indica el motivo.'; end if;
  if v_op='edit' then
    v_start:=(p_change->>'start_time')::time; v_end:=(p_change->>'end_time')::time;
    if v_start is null or v_end is null or extract(epoch from(v_end-v_start))/60 not between 15 and 480 then raise exception 'Revisa las horas de inicio y fin.'; end if;
  end if;
  for v_row in select * from public.training_sessions where id=any(v_ids) order by id for update loop
    if (v_row.scheduled_at at time zone 'Europe/Madrid')::date<(now() at time zone 'Europe/Madrid')::date then raise exception 'Solo puedes cambiar entrenamientos de hoy en adelante.'; end if;
    if exists(select 1 from public.training_attendance a where a.session_id=v_row.id) then raise exception 'Este entrenamiento ya tiene asistencia registrada.'; end if;
    if v_op='edit' then
      if v_row.cancelled then raise exception 'Reactiva el entrenamiento antes de editarlo.'; end if;
      v_day:=coalesce(nullif(p_change->>'date','')::date,(v_row.scheduled_at at time zone 'Europe/Madrid')::date);
      if v_day<(now() at time zone 'Europe/Madrid')::date then raise exception 'Elige una fecha de hoy en adelante.'; end if;
      update public.training_sessions set scheduled_at=(v_day+v_start) at time zone 'Europe/Madrid',duration_minutes=extract(epoch from(v_end-v_start))/60,location=left(coalesce(p_change->>'location',v_row.location),200),kind=coalesce(p_change->>'kind',v_row.kind),is_exception=true,original_scheduled_at=coalesce(original_scheduled_at,scheduled_at) where id=v_row.id;
    else
      update public.training_sessions set cancelled=v_op in ('cancel','stop'),cancellation_reason=case when v_op='restore' then null else left(coalesce(p_change->>'reason','Horario finalizado'),300) end,cancelled_at=case when v_op='restore' then null else now() end,cancelled_by=case when v_op='restore' then null else (select id from public.profiles where auth_user_id=auth.uid()) end,is_exception=true,original_scheduled_at=coalesce(original_scheduled_at,scheduled_at) where id=v_row.id;
    end if;
    v_count:=v_count+1;
  end loop;
  if v_op='edit' and exists(select 1 from public.training_sessions a join public.training_sessions b on a.team_id=b.team_id and a.id<>b.id and not a.cancelled and not b.cancelled and a.scheduled_at<b.scheduled_at+make_interval(mins=>b.duration_minutes) and b.scheduled_at<a.scheduled_at+make_interval(mins=>a.duration_minutes) and (a.player_ids is null or b.player_ids is null or a.player_ids && b.player_ids) where a.id=any(v_ids)) then raise exception 'El cambio coincide con otro entrenamiento. Elige otra hora.'; end if;
  return v_count;
end; $$;
revoke all on function public.change_training_dates(jsonb) from public, anon;
grant execute on function public.change_training_dates(jsonb) to authenticated;

create function public.finish_training_plan(p_block_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare v_team uuid;
begin
  if auth.uid() is null or coalesce(cardinality(p_block_ids),0) not between 1 and 128 or (select count(*) from public.training_blocks where id=any(p_block_ids))<>cardinality(p_block_ids) then raise exception 'Revisa el horario.'; end if;
  for v_team in select distinct team_id from public.training_blocks where id=any(p_block_ids) order by team_id loop
    if not public.can_manage_training_of(v_team) then raise exception 'No tienes permiso para gestionar este horario.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_team::text,39));
  end loop;
  perform 1 from public.training_sessions where block_id=any(p_block_ids) for update;
  update public.training_sessions s set cancelled=true,cancellation_reason='Horario finalizado',cancelled_at=now(),cancelled_by=(select id from public.profiles where auth_user_id=auth.uid()) where s.block_id=any(p_block_ids) and s.scheduled_at>=now() and not s.cancelled and not exists(select 1 from public.training_attendance a where a.session_id=s.id);
  update public.training_blocks set is_active=false where id=any(p_block_ids);
end; $$;
revoke all on function public.finish_training_plan(uuid[]) from public, anon;
grant execute on function public.finish_training_plan(uuid[]) to authenticated;

create or replace function private.notify_training_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare v_kind text; v_title text; v_team text; v_body text;
begin
  if new.scheduled_at<now() then return new; end if;
  if new.cancelled and not old.cancelled then v_kind:='training_cancelled'; v_title:='Entrenamiento cancelado';
  elsif not new.cancelled and (old.cancelled or new.scheduled_at is distinct from old.scheduled_at or new.location is distinct from old.location or new.duration_minutes is distinct from old.duration_minutes) then v_kind:='training_changed'; v_title:=case when old.cancelled then 'Entrenamiento reactivado' else 'Entrenamiento actualizado' end;
  else return new; end if;
  select label into v_team from public.teams where id=new.team_id;
  v_body:=format('%s · %s a las %s%s.',v_team,to_char(new.scheduled_at at time zone 'Europe/Madrid','DD/MM/YYYY'),to_char(new.scheduled_at at time zone 'Europe/Madrid','HH24:MI'),case when new.cancelled then ' · '||coalesce(new.cancellation_reason,'Cancelado por el club') else coalesce(' · '||new.location,'') end);
  insert into public.notifications(recipient_id,kind,title,body,href,related_training_session_id)
  select p.id,v_kind,v_title||' · '||v_team,v_body,'/calendar',new.id from public.profiles p where p.is_active and p.id in (
    select r.player_id from public.team_rosters r where r.team_id=new.team_id and r.left_at is null and (new.player_ids is null or r.player_id=any(new.player_ids))
    union select l.parent_profile_id from public.parent_child_links l join public.team_rosters r on r.player_id=l.child_profile_id where r.team_id=new.team_id and r.left_at is null and (new.player_ids is null or r.player_id=any(new.player_ids))
    union select s.profile_id from public.team_staff s where s.team_id=new.team_id
  ) and not exists(select 1 from public.notifications n join public.training_sessions s on s.id=n.related_training_session_id where new.joint_id is not null and s.joint_id=new.joint_id and n.recipient_id=p.id and n.kind=v_kind and n.created_at=now());
  return new;
end; $$;
