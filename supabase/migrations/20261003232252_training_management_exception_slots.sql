alter table public.training_blocks add column schedule_slot_id uuid;
update public.training_blocks set schedule_slot_id=id where schedule_slot_id is null;
create or replace function public.manage_training_plan(p_plan jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_item jsonb; v_team uuid; v_series uuid; v_id uuid; v_block uuid; v_count integer:=0; v_old uuid[]; v_teams uuid[]; v_day date;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  if jsonb_typeof(p_plan->'team_ids')<>'array' or jsonb_array_length(p_plan->'team_ids') not between 1 and 16 or jsonb_typeof(p_plan->'blocks')<>'array' or jsonb_array_length(p_plan->'blocks')>128 or jsonb_typeof(p_plan->'sessions')<>'array' or jsonb_array_length(p_plan->'sessions') not between 1 and 6000 then raise exception 'Horario inválido o sin fechas.'; end if;
  select array_agg(value::uuid order by value) into v_teams from jsonb_array_elements_text(p_plan->'team_ids');
  select coalesce(array_agg(value::uuid),'{}') into v_old from jsonb_array_elements_text(coalesce(p_plan->'block_ids','[]'));
  for v_team in select distinct id from (select unnest(v_teams) id union select team_id from public.training_blocks where id=any(v_old)) x order by id loop
    if not public.can_manage_training_of(v_team) or not exists(select 1 from public.teams t join public.seasons s on s.id=t.season_id where t.id=v_team and s.is_current) then raise exception 'No tienes permiso para gestionar todos los equipos elegidos en la temporada actual.'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_team::text, 39));
  end loop;
  select coalesce(array_agg(value::uuid),'{}') into v_old from jsonb_array_elements_text(coalesce(p_plan->'block_ids','[]'));
  if exists(select 1 from public.training_blocks b where b.id=any(v_old) and (not b.is_active or not public.can_manage_training_of(b.team_id))) or (select count(*) from public.training_blocks where id=any(v_old))<>cardinality(v_old) then raise exception 'No puedes modificar estos horarios.'; end if;
  if cardinality(v_old)>0 then
    perform 1 from public.training_blocks where id=any(v_old) for update;
    perform 1 from public.training_sessions where block_id=any(v_old) for update;
    delete from public.training_sessions s where s.block_id=any(v_old) and s.scheduled_at>=now() and not s.cancelled and not s.is_exception and not exists(select 1 from public.training_attendance a where a.session_id=s.id);
    update public.training_blocks set is_active=false where id=any(v_old);
  end if;
  v_series:=coalesce(nullif(p_plan->>'series_id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.training_blocks where series_id=v_series and (cardinality(v_old)=0 or (is_active and not id=any(v_old)))) then raise exception 'Este horario conjunto debe gestionarse con todos sus equipos.'; end if;
  update public.training_blocks set series_id=v_series where id=any(v_old) and series_id is null;
  for v_item in select value from jsonb_array_elements(p_plan->'blocks') loop
    v_team:=(v_item->>'team_id')::uuid;
    if not v_team=any(v_teams) or v_item->>'kind' not in ('water','dry','meeting') or (v_item->>'end_date')::date-(v_item->>'start_date')::date not between 0 and 366 then raise exception 'Datos de horario inválidos.'; end if;
    insert into public.training_blocks(id,series_id,team_id,label,kind,weekdays,start_date,end_date,start_time,end_time,location,created_by,player_ids,excluded_dates,schedule_slot_id,maps_url)
    values((v_item->>'id')::uuid,v_series,v_team,left(v_item->>'label',100),v_item->>'kind',array(select value::smallint from jsonb_array_elements_text(v_item->'weekdays')),(v_item->>'start_date')::date,(v_item->>'end_date')::date,(v_item->>'start_time')::time,(v_item->>'end_time')::time,left(v_item->>'location',200),(select id from public.profiles where auth_user_id=auth.uid()),case when jsonb_typeof(v_item->'player_ids')='array' then array(select value::uuid from jsonb_array_elements_text(v_item->'player_ids')) else null end,array(select value::date from jsonb_array_elements_text(coalesce(v_item->'excluded_dates','[]'))),coalesce(nullif(v_item->>'schedule_slot_id','')::uuid,(v_item->>'id')::uuid),v_item->>'maps_url');
  end loop;
  for v_item in select value from jsonb_array_elements(p_plan->'sessions') loop
    v_team:=(v_item->>'team_id')::uuid; v_block:=nullif(v_item->>'block_id','')::uuid;
    v_day:=((v_item->>'scheduled_at')::timestamptz at time zone 'Europe/Madrid')::date;
    if not v_team=any(v_teams) or v_item->>'kind' not in ('water','dry','meeting') or v_day<(now() at time zone 'Europe/Madrid')::date then raise exception 'Datos de entrenamiento inválidos.'; end if;
    if exists(select 1 from public.training_sessions s join public.training_blocks b on b.id=s.block_id where s.team_id=v_team and b.schedule_slot_id=(select schedule_slot_id from public.training_blocks where id=v_block) and (s.block_id=any(v_old) or b.series_id=v_series) and (s.cancelled or s.is_exception or exists(select 1 from public.training_attendance a where a.session_id=s.id)) and (coalesce(s.original_scheduled_at,s.scheduled_at) at time zone 'Europe/Madrid')::date=v_day) then continue; end if;
    insert into public.training_sessions(block_id,team_id,joint_id,label,kind,scheduled_at,duration_minutes,location,maps_url,player_ids)
    values(v_block,v_team,(v_item->>'joint_id')::uuid,left(v_item->>'label',100),v_item->>'kind',(v_item->>'scheduled_at')::timestamptz,(v_item->>'duration_minutes')::integer,left(v_item->>'location',200),v_item->>'maps_url',case when jsonb_typeof(v_item->'player_ids')='array' then array(select value::uuid from jsonb_array_elements_text(v_item->'player_ids')) else null end);
    v_count:=v_count+1;
  end loop;
  if exists(select 1 from public.training_sessions a join public.training_sessions b on a.team_id=b.team_id and a.id<b.id and a.scheduled_at<b.scheduled_at+make_interval(mins=>b.duration_minutes) and b.scheduled_at<a.scheduled_at+make_interval(mins=>a.duration_minutes) and (a.player_ids is null or b.player_ids is null or a.player_ids && b.player_ids) where a.team_id=any(v_teams) and not a.cancelled and not b.cancelled and (a.block_id in(select (value->>'id')::uuid from jsonb_array_elements(p_plan->'blocks')) or a.joint_id in(select (value->>'joint_id')::uuid from jsonb_array_elements(p_plan->'sessions')))) then raise exception 'Este horario coincide con otro entrenamiento. Revisa las horas o los participantes.'; end if;
  return jsonb_build_object('created',v_count,'series_id',v_series);
end; $$;
create or replace function private.guard_training_audience() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.player_ids is not null and (cardinality(new.player_ids)=0 or cardinality(new.player_ids)>300 or exists(select 1 from unnest(new.player_ids) p where not exists(select 1 from public.team_rosters r join public.profiles f on f.id=r.player_id where r.team_id=new.team_id and r.player_id=p and r.left_at is null and f.is_active))) then
    raise exception 'Elige jugadores de la plantilla activa del equipo.';
  end if;
  if tg_table_name='training_sessions' then
    if new.block_id is not null and not exists(select 1 from public.training_blocks b where b.id=new.block_id and b.team_id=new.team_id) then raise exception 'El horario no pertenece al equipo.'; end if;
    if new.duration_minutes<15 or new.duration_minutes>480 then raise exception 'La duración debe ser de 15 minutos a 8 horas.'; end if;
    if tg_op='UPDATE' and (new.scheduled_at is distinct from old.scheduled_at or new.duration_minutes is distinct from old.duration_minutes or new.cancelled is distinct from old.cancelled or new.player_ids is distinct from old.player_ids or new.kind is distinct from old.kind or new.location is distinct from old.location or new.maps_url is distinct from old.maps_url) then
      if exists(select 1 from public.training_attendance a where a.session_id=old.id) then raise exception 'Este entrenamiento ya tiene asistencia. Conserva su fecha y sus participantes.'; end if;
      new.is_exception:=true;
      new.original_scheduled_at:=coalesce(old.original_scheduled_at,old.scheduled_at);
    end if;
  end if;
  return new;
end; $$;
