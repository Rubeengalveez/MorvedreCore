begin;
do $$
declare
  team uuid;
  first_player uuid;
  second_player uuid;
  actor uuid;
  season uuid;
  third_player uuid;
begin
  select p.auth_user_id into actor from public.profiles p where p.email_contact = 'galvillo9@gmail.com' and p.auth_user_id is not null;
  if actor is null then raise exception 'Falta el administrador de prueba.'; end if;
  select id into season from public.seasons where is_current;
  insert into public.teams(season_id,category_code,label,gender,team_type,color)
  values(season,'absoluto','QA gorros ' || gen_random_uuid(),'male','competitive','#0A2E5C') returning id into team;
  insert into public.profiles(full_name,birth_year) values('QA Gorro Uno',2000) returning id into first_player;
  insert into public.profiles(full_name,birth_year) values('QA Gorro Dos',2000) returning id into second_player;
  insert into public.profiles(full_name,birth_year) values('QA Fuera de la lista',2000) returning id into third_player;
  insert into public.team_rosters(team_id,player_id,squad_number) values(team,first_player,1),(team,second_player,2);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform set_config('qa.team',team::text,true);
  perform set_config('qa.first',first_player::text,true);
  perform set_config('qa.second',second_player::text,true);
  perform set_config('qa.third',third_player::text,true);
end;
$$;
set local role authenticated;
do $$
declare
  team uuid := current_setting('qa.team')::uuid;
  first_player uuid := current_setting('qa.first')::uuid;
  second_player uuid := current_setting('qa.second')::uuid;
  initial jsonb := jsonb_build_array(jsonb_build_object('player_id',first_player,'cap_number',1),jsonb_build_object('player_id',second_player,'cap_number',2));
  swapped jsonb := jsonb_build_array(jsonb_build_object('player_id',first_player,'cap_number',2),jsonb_build_object('player_id',second_player,'cap_number',1));
  empty_caps jsonb := jsonb_build_array(jsonb_build_object('player_id',first_player,'cap_number',null),jsonb_build_object('player_id',second_player,'cap_number',null));
  old_match uuid;
  new_match uuid;
  season uuid;
  rejected boolean;
  third_player uuid;
  with_third jsonb;
begin
  select season_id into season from public.teams where id = team;
  perform public.save_team_default_caps(team,initial,initial);
  insert into public.matches(season_id,team_id,opponent,scheduled_at) values(season,team,'QA anterior',now()) returning id into old_match;
  perform public.save_team_default_caps(team,swapped,initial);
  if (select squad_number from public.team_rosters where team_id=team and player_id=first_player) <> 2
    or (select cap_number from public.team_callup_templates where team_id=team and player_id=first_player) <> 2 then
    raise exception 'No se han sincronizado los gorros.';
  end if;
  if (select cap_number from public.match_callups where match_id=old_match and player_id=first_player) <> 1 then
    raise exception 'Se ha alterado una convocatoria existente.';
  end if;
  insert into public.matches(season_id,team_id,opponent,scheduled_at) values(season,team,'QA siguiente',now()) returning id into new_match;
  if (select cap_number from public.match_callups where match_id=new_match and player_id=first_player) <> 2 then
    raise exception 'El nuevo partido no usa los gorros actualizados.';
  end if;
  rejected := false;
  begin
    perform public.save_team_default_caps(team,initial,initial);
  exception when others then
    if sqlerrm not like '%Actualiza%' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Se ha aceptado una edición desactualizada.'; end if;
  rejected := false;
  begin
    perform public.save_team_default_caps(team,jsonb_build_array(jsonb_build_object('player_id',first_player,'cap_number',1),jsonb_build_object('player_id',second_player,'cap_number',1)),swapped);
  exception when others then
    if sqlerrm not like '%gorros%' then raise; end if;
    rejected := true;
  end;
  if not rejected then raise exception 'Se han aceptado gorros duplicados.'; end if;
  perform public.save_team_default_caps(team,empty_caps,swapped);
  if exists(select 1 from public.team_rosters where team_id=team and squad_number is not null)
    or exists(select 1 from public.team_callup_templates where team_id=team and cap_number is not null)
    or (select count(*) from public.team_callup_templates where team_id=team) <> 2 then
    raise exception 'Sin gorros ha eliminado jugadores o no se ha guardado.';
  end if;
  perform public.replace_match_callup(new_match,initial,true);
  if (select squad_number from public.team_rosters where team_id=team and player_id=first_player) <> 1 then
    raise exception 'Guardar para este y los próximos no ha sincronizado el gorro del equipo.';
  end if;
  perform public.save_team_default_caps(team,swapped,initial);
  if (select squad_number from public.team_rosters where team_id=team and player_id=first_player) <> 2 then
    raise exception 'No se ha leído la convocatoria por defecto guardada desde el partido.';
  end if;
  third_player := current_setting('qa.third')::uuid;
  insert into public.team_rosters(team_id,player_id,squad_number) values(team,third_player,3);
  with_third := swapped || jsonb_build_array(jsonb_build_object('player_id',third_player,'cap_number',null));
  perform public.save_team_default_caps(team,swapped || jsonb_build_array(jsonb_build_object('player_id',third_player,'cap_number',3)),with_third);
  if (select cap_number from public.team_callup_templates where team_id=team and player_id=third_player) <> 3 then
    raise exception 'El gorro asignado en Plantilla no se ha incluido en la convocatoria por defecto.';
  end if;
  rejected := false;
  begin
    insert into public.teams(season_id,category_code,label,gender,team_type,color)
    select id,'absoluto','QA anterior ' || gen_random_uuid(),'male','competitive','#0A2E5C' from public.seasons where not is_current limit 1;
  exception when insufficient_privilege then rejected := true;
  end;
  if exists(select 1 from public.seasons where not is_current) and not rejected then raise exception 'Se ha creado un equipo en una temporada anterior.'; end if;
end;
$$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
declare rejected boolean := false;
begin
  begin
    perform public.save_team_default_caps(current_setting('qa.team')::uuid,'[]'::jsonb,'[]'::jsonb);
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'Se ha aceptado una edición sin permiso.'; end if;
end;
$$;
rollback;
select 'OK: intercambio, sincronización, futuro, historial, sin gorros, concurrencia, duplicados, temporada y permisos; fixtures descartados' as resultado;
