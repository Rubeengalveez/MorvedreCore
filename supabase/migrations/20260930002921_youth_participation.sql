create function public.validate_live_participation(doc jsonb, category text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  participation jsonb;
  item jsonb;
  reference text;
  side text;
  personal_limit integer;
  field_count integer;
begin
  if doc ? 'category' and doc->>'category' is distinct from category then
    raise exception 'La categoría del acta no coincide con el equipo.';
  end if;
  if doc->>'version' not in ('1','2','3','4') then raise exception 'Versión de acta no válida.'; end if;
  personal_limit := case when category in ('benjamin','escuela') then 4 else 3 end;
  if exists(select 1 from jsonb_array_elements(doc->'events') e
    where e->>'side' = 'them' and e->>'kind' in ('exclusion','penalty')
      and not coalesce((e->>'deleted')::boolean,false)
    group by e->>'cap' having count(*) > personal_limit) then
    raise exception 'Se supera el límite de expulsiones del rival.';
  end if;
  participation := doc->'participation';
  if participation is null then
    if doc->>'version' = '4' and category in ('benjamin','alevin','infantil','escuela') then
      raise exception 'Falta preparar la participación.';
    end if;
    return;
  end if;
  if doc->>'version' <> '4' or doc->>'category' is distinct from category
    or category not in ('benjamin','alevin','infantil','escuela')
    or participation->>'rulesVersion' is distinct from '1'
    or jsonb_typeof(participation->'enabled') is distinct from 'boolean'
    or jsonb_typeof(participation->'opponentConfirmed') is distinct from 'boolean'
    or jsonb_typeof(participation->'fixedKeepers') is distinct from 'object'
    or jsonb_typeof(participation->'lineups') is distinct from 'array'
    or jsonb_typeof(participation->'changes') is distinct from 'array' then
    raise exception 'Datos de participación no válidos.';
  end if;
  if (participation->>'enabled')::boolean and (doc->>'periods')::integer < 4 then
    raise exception 'Este formato no permite controlar los cuatro primeros cuartos.';
  end if;
  if jsonb_array_length(participation->'lineups') > 8 or jsonb_array_length(participation->'changes') > 100 then
    raise exception 'Hay demasiados registros de participación.';
  end if;
  if (select count(*) from jsonb_array_elements(participation->'lineups')) <>
    (select count(distinct (l->>'period',l->>'side')) from jsonb_array_elements(participation->'lineups') l) then
    raise exception 'Hay alineaciones duplicadas.';
  end if;
  field_count := case when category = 'infantil' then 6 else 5 end;
  for item in select value from jsonb_array_elements(participation->'lineups') loop
    side := item->>'side';
    if side is null or side not in ('us','them') or item->>'period' is null
      or (item->>'period')::integer not between 1 and least(4,(doc->>'period')::integer)
      or jsonb_typeof(item->'keeper') is distinct from 'string'
      or jsonb_typeof(item->'field') is distinct from 'array' then
      raise exception 'Alineación no válida.';
    end if;
    if jsonb_array_length(item->'field') > 6 or
      (jsonb_array_length(item->'field') <> field_count and coalesce(item->>'incident','') = '') then
      raise exception 'Revisa el número de jugadores de campo.';
    end if;
    if (select count(distinct value) from jsonb_array_elements(item->'field' || jsonb_build_array(item->'keeper'))) <>
      jsonb_array_length(item->'field') + 1 then raise exception 'Un jugador aparece dos veces en el cuarto.'; end if;
    for reference in select jsonb_array_elements_text(item->'field' || jsonb_build_array(item->'keeper')) loop
      if (side = 'us' and not exists(select 1 from jsonb_array_elements(doc->'players') p where p->>'id' = reference))
        or (side = 'them' and not exists(select 1 from jsonb_array_elements_text(doc->'opponentCaps') cap where cap = reference)) then
        raise exception 'Hay un participante que no está en el acta.';
      end if;
    end loop;
    if length(coalesce(item->>'incident','')) > 200 then raise exception 'La incidencia es demasiado larga.'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(participation->'changes')) <>
    (select count(distinct c->>'id') from jsonb_array_elements(participation->'changes') c) then
    raise exception 'Hay sustituciones duplicadas.';
  end if;
  for item in select value from jsonb_array_elements(participation->'changes') loop
    side := item->>'side';
    if side is null or side not in ('us','them') or item->>'period' is null
      or (item->>'period')::integer not between 1 and least(4,(doc->>'period')::integer)
      or coalesce(item->>'reason','') not in ('sanction','injury')
      or item->>'incoming' is not distinct from item->>'outgoing'
      or not exists(select 1 from jsonb_array_elements(participation->'lineups') l
        where l->>'period' = item->>'period' and l->>'side' = side) then
      raise exception 'Sustitución no válida.';
    end if;
    for reference in select jsonb_array_elements_text(jsonb_build_array(item->'incoming',item->'outgoing')) loop
      if (side = 'us' and not exists(select 1 from jsonb_array_elements(doc->'players') p where p->>'id' = reference))
        or (side = 'them' and not exists(select 1 from jsonb_array_elements_text(doc->'opponentCaps') cap where cap = reference)) then
        raise exception 'El sustituto no está en el acta.';
      end if;
    end loop;
    if item ? 'eventId' and not exists(select 1 from jsonb_array_elements(doc->'events') e where e->>'id' = item->>'eventId') then
      raise exception 'La sanción de la sustitución no existe.';
    end if;
  end loop;
  foreach side in array array['us','them'] loop
    reference := participation->'fixedKeepers'->>side;
    if reference is null then continue; end if;
    if category not in ('alevin','infantil') or
      (side = 'us' and not exists(select 1 from jsonb_array_elements(doc->'players') p where p->>'id' = reference)) or
      (side = 'them' and not exists(select 1 from jsonb_array_elements_text(doc->'opponentCaps') cap where cap = reference)) then
      raise exception 'La elección de portero único no es válida.';
    end if;
  end loop;
end;
$$;

revoke all on function public.validate_live_participation(jsonb,text) from public,anon,authenticated;
grant execute on function public.validate_live_participation(jsonb,text) to service_role;

create or replace function public.save_live_match_sheet(
  p_match uuid, p_actor uuid, p_device uuid, p_revision integer, p_mutation uuid,
  p_document jsonb, p_takeover boolean, p_roster_edit boolean
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
  m public.matches;
  previous public.live_match_sheets;
  actor uuid;
  item jsonb;
  g integer;
  x integer;
  next_revision integer;
  active_count integer;
  selected_source uuid;
  category text;
  personal_limit integer;
begin
  select * into m from public.matches where id = p_match for update;
  if m.id is null then raise exception 'El partido no existe.'; end if;
  select id into actor from public.profiles where id = p_actor and is_active and auth_user_id is not null;
  if actor is null or not (
    exists(select 1 from public.user_roles where profile_id = actor and role = 'delegate' and scope_team_id = m.team_id)
    or exists(select 1 from public.team_staff where profile_id = actor and team_id = m.team_id and role = 'delegate')
  ) then raise exception 'No tienes permiso para anotar este partido.' using errcode = '42501'; end if;
  select * into previous from public.live_match_sheets where match_id = p_match;
  if previous.mutation_id = p_mutation and previous.owner_id = actor and previous.device_id = p_device then return previous.revision; end if;
  if coalesce(previous.revision, 0) <> p_revision then raise exception 'CONFLICT: Hay una versión más reciente. Conservamos tus cambios en el móvil.'; end if;
  if previous.match_id is not null and (previous.owner_id <> actor or previous.device_id <> p_device) and not p_takeover then
    raise exception 'CONFLICT: Otro dispositivo lleva este partido. Puedes consultar el acta o tomar el relevo.';
  end if;
  if p_takeover and previous.match_id is not null and p_document is distinct from previous.document then raise exception 'El relevo debe conservar el acta actual.'; end if;
  if p_takeover and p_roster_edit then raise exception 'No puedes editar la convocatoria al tomar el relevo.'; end if;
  if previous.document->>'phase' = 'finished' and p_document is distinct from previous.document then raise exception 'El acta está cerrada.'; end if;
  if exists(select 1 from public.match_stats where match_id = p_match and validated_at is not null) and p_document is distinct from previous.document then raise exception 'El acta está validada.'; end if;
  if m.status in ('cancelled','postponed') then raise exception 'El partido está cancelado o aplazado.'; end if;
  if jsonb_typeof(p_document->'players') <> 'array' or jsonb_typeof(p_document->'events') <> 'array' then raise exception 'Acta inválida.'; end if;
  select category_code into category from public.teams where id = m.team_id;
  personal_limit := case when category in ('benjamin','escuela') then 4 else 3 end;
  perform public.validate_live_participation(p_document, category);
  if p_document->>'version' in ('3','4') and p_document->>'keeper' is not null
    and (p_document->>'keeper')::integer not in (1,13) then
    raise exception 'El portero debe llevar el gorro 1 o 13.';
  end if;

  if p_roster_edit then
    if m.status = 'played' or p_document->>'phase' = 'finished' or p_document->>'version' not in ('3','4') then
      raise exception 'Solo puedes corregir la convocatoria de un acta abierta.';
    end if;
    select count(*) into active_count from jsonb_array_elements(p_document->'players') player
      where not coalesce((player->>'retired')::boolean, false);
    if active_count not between 1 and 14 or
      (select count(distinct player->>'id') from jsonb_array_elements(p_document->'players') player
        where not coalesce((player->>'retired')::boolean, false)) <> active_count or
      (select count(distinct player->>'cap') from jsonb_array_elements(p_document->'players') player
        where not coalesce((player->>'retired')::boolean, false)) <> active_count or
      exists(select 1 from jsonb_array_elements(p_document->'players') player
        where not coalesce((player->>'retired')::boolean, false)
          and (player->>'cap')::integer not between 1 and 14) then
      raise exception 'Elige hasta 14 jugadores con gorros distintos del 1 al 14.';
    end if;
    if not exists(select 1 from jsonb_array_elements(p_document->'players') player
      where not coalesce((player->>'retired')::boolean, false)
        and (player->>'cap')::integer in (1,13)) then
      raise exception 'Asigna el gorro 1 o 13 a un portero.';
    end if;
    if exists(select 1 from jsonb_array_elements(p_document->'players') player
      left join public.profiles profile on profile.id = (player->>'id')::uuid
      where not coalesce((player->>'retired')::boolean, false)
        and (profile.id is null or not profile.is_active)) then
      raise exception 'Hay un jugador que ya no está activo.';
    end if;
    perform 1 from public.match_callups where match_id = p_match for update;
    delete from public.match_callups callup
      where callup.match_id = p_match and callup.status in ('called','confirmed')
        and not exists(select 1 from jsonb_array_elements(p_document->'players') player
          where not coalesce((player->>'retired')::boolean, false)
            and (player->>'id')::uuid = callup.player_id);
    update public.match_callups set cap_number = null
      where match_id = p_match and status in ('called','confirmed');
    for item in select value from jsonb_array_elements(p_document->'players') loop
      if coalesce((item->>'retired')::boolean, false) then continue; end if;
      select case when roster.team_id <> m.team_id then roster.team_id else null end
        into selected_source from public.team_rosters roster
        where roster.player_id = (item->>'id')::uuid and roster.left_at is null
        order by roster.joined_at desc limit 1;
      insert into public.match_callups(match_id,player_id,cap_number,source_team_id,status)
        values(p_match,(item->>'id')::uuid,(item->>'cap')::smallint,selected_source,'called')
        on conflict(match_id,player_id) do update
        set cap_number = excluded.cap_number,
            source_team_id = excluded.source_team_id,
            status = case when match_callups.status = 'confirmed' then 'confirmed' else 'called' end;
    end loop;
  end if;

  for item in select value from jsonb_array_elements(p_document->'players') loop
    if not exists(select 1 from public.match_callups where match_id = p_match
      and player_id = (item->>'id')::uuid and cap_number = (item->>'cap')::integer)
      and not ((coalesce((item->>'retired')::boolean, false) or p_takeover)
        and exists(select 1 from jsonb_array_elements(previous.document->'players') old_player
          where old_player->>'id' = item->>'id'))
    then raise exception 'La convocatoria o un gorro ha cambiado. Revisa el equipo.'; end if;
  end loop;

  next_revision := p_revision + 1;
  insert into public.live_match_sheets(match_id,owner_id,device_id,revision,mutation_id,document)
    values(p_match,actor,p_device,next_revision,p_mutation,p_document)
    on conflict(match_id) do update set owner_id=actor, device_id=p_device,
      revision=next_revision, mutation_id=p_mutation, document=p_document, updated_at=now();
  if p_roster_edit then
    insert into public.live_match_roster_changes(match_id,actor_id,revision,before_players,after_players)
      values(p_match,actor,next_revision,coalesce(previous.document->'players','[]'::jsonb),p_document->'players');
    delete from public.match_stats stat where stat.match_id = p_match
      and not exists(select 1 from jsonb_array_elements(p_document->'players') player
        where (player->>'id')::uuid = stat.player_id);
  end if;
  for item in select value from jsonb_array_elements(p_document->'players') loop
    select count(*) filter(where e->>'kind' in ('goal','goal_extra','goal_penalty')),
      count(*) filter(where e->>'kind' in ('exclusion','penalty')) into g,x
      from jsonb_array_elements(p_document->'events') e
      where e->>'side' = 'us' and
        (e->>'playerId' = item->>'id' or
          (e->>'playerId' is null and (e->>'cap')::integer = (item->>'cap')::integer))
        and not (e->>'deleted')::boolean;
    select g + coalesce(sum((b->>'goals')::integer),0),
      x + coalesce(sum((b->>'exclusions')::integer),0) into g,x
      from jsonb_array_elements(p_document->'baseline') b
      where b->>'playerId' = item->>'id' or
        (b->>'playerId' is null and (b->>'cap')::integer = (item->>'cap')::integer);
    if x > personal_limit then raise exception 'Se supera el límite de expulsiones de esta categoría.'; end if;
    insert into public.match_stats(match_id,player_id,goals,exclusions,entered_by)
      values(p_match,(item->>'id')::uuid,g,x,actor)
      on conflict(match_id,player_id) do update set goals=excluded.goals,
        exclusions=excluded.exclusions, entered_by=actor, entered_at=now();
  end loop;
  if p_document->>'phase' = 'finished' then
    select coalesce(sum(goals),0) into g from public.match_stats where match_id = p_match;
    select count(*) + (p_document->>'baselineThem')::integer into x
      from jsonb_array_elements(p_document->'events') e
      where e->>'side' = 'them' and e->>'kind' = 'goal' and not (e->>'deleted')::boolean;
    if p_document ? 'shootout' then
      if g <> x or (p_document->>'period')::integer <> (p_document->>'periods')::integer then
        raise exception 'La tanda requiere empate al terminar el último cuarto.';
      end if;
      select g + count(*) filter(where shot->>'side' = 'us' and shot->>'outcome' = 'goal'),
        x + count(*) filter(where shot->>'side' = 'them' and shot->>'outcome' = 'goal') into g,x
        from jsonb_array_elements(p_document->'shootout'->'shots') shot;
      if g = x then raise exception 'La tanda todavía no tiene ganador.'; end if;
    end if;
    update public.matches set status='played', final_score_us=g, final_score_them=x where id=p_match;
    update public.match_stats set validated_by=actor,validated_at=now()
      where match_id=p_match and validated_at is null;
  end if;
  return next_revision;
end; $$;

create or replace function public.save_live_match_sheet(
  p_match uuid, p_actor uuid, p_device uuid, p_revision integer, p_mutation uuid,
  p_document jsonb, p_takeover boolean default false
) returns integer language sql security invoker set search_path = '' as $$
  select public.save_live_match_sheet(
    p_match, p_actor, p_device, p_revision, p_mutation, p_document, p_takeover, false
  );
$$;

revoke all on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)
  to service_role;
revoke all on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean)
  from public,anon,authenticated;
grant execute on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean)
  to service_role;
