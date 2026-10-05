create or replace function public.change_training_dates(p_change jsonb) returns integer language plpgsql security invoker set search_path='' as $$
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
      update public.training_sessions set scheduled_at=(v_day+v_start) at time zone 'Europe/Madrid',duration_minutes=extract(epoch from(v_end-v_start))/60,location=left(coalesce(p_change->>'location',v_row.location),200),maps_url=case when p_change ? 'location' and nullif(p_change->>'location','') is distinct from nullif(v_row.location,'') then null else v_row.maps_url end,label=case when v_row.label in ('Agua','Físico/seco','Reunión') and p_change ? 'kind' then case p_change->>'kind' when 'water' then 'Agua' when 'dry' then 'Físico/seco' when 'meeting' then 'Reunión' else v_row.label end else v_row.label end,kind=coalesce(p_change->>'kind',v_row.kind),player_ids=case when not p_change ? 'player_ids' then v_row.player_ids when jsonb_typeof(p_change->'player_ids')='null' then null else array(select p.value::uuid from jsonb_array_elements_text(p_change->'player_ids') p join public.team_rosters r on r.player_id=p.value::uuid and r.team_id=v_row.team_id and r.left_at is null) end,is_exception=true,original_scheduled_at=coalesce(original_scheduled_at,scheduled_at) where id=v_row.id;
    else
      update public.training_sessions set cancelled=v_op in ('cancel','stop'),cancellation_reason=case when v_op='restore' then null else left(coalesce(p_change->>'reason','Horario finalizado'),300) end,cancelled_at=case when v_op='restore' then null else now() end,cancelled_by=case when v_op='restore' then null else (select id from public.profiles where auth_user_id=auth.uid()) end,is_exception=true,original_scheduled_at=coalesce(original_scheduled_at,scheduled_at) where id=v_row.id;
    end if;
    v_count:=v_count+1;
  end loop;
  if v_op='edit' and exists(select 1 from public.training_sessions a join public.training_sessions b on a.team_id=b.team_id and a.id<>b.id and not a.cancelled and not b.cancelled and a.scheduled_at<b.scheduled_at+make_interval(mins=>b.duration_minutes) and b.scheduled_at<a.scheduled_at+make_interval(mins=>a.duration_minutes) and (a.player_ids is null or b.player_ids is null or a.player_ids && b.player_ids) where a.id=any(v_ids)) then raise exception 'El cambio coincide con otro entrenamiento. Elige otra hora.'; end if;
  return v_count;
end; $$;
