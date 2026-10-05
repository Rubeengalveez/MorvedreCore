begin;
do $$
declare
  season uuid;
  team uuid;
begin
  select id into season from public.seasons where is_current;
  insert into public.teams(season_id,category_code,label,gender,team_type,color)
  values(season,'absoluto','QA jugadores ' || gen_random_uuid(),'male','competitive','#0A2E5C') returning id into team;
  perform set_config('qa.player_team',team::text,true);
end;
$$;
set local role service_role;
do $$
declare
  team uuid := current_setting('qa.player_team')::uuid;
  result jsonb;
  second_result jsonb;
  player uuid;
  name text := 'QA jugador ' || gen_random_uuid();
  rejected boolean;
begin
  result := public.register_admin_player(jsonb_build_object('team_id',team,'full_name',name,'birth_year',2000,'cap_number',2));
  player := (result->>'id')::uuid;
  if not exists(select 1 from public.profiles where id=player)
    or not exists(select 1 from public.user_roles where profile_id=player and role='player')
    or not exists(select 1 from public.team_rosters where player_id=player and team_id=team and squad_number=2)
  then raise exception 'El alta no ha creado la ficha, el rol y la plantilla.'; end if;
  insert into public.team_callup_templates(team_id,player_id,cap_number) values(team,player,2);
  second_result := public.register_admin_player(jsonb_build_object('team_id',team,'full_name',name || ' dos','birth_year',2000,'cap_number',3));
  if not exists(select 1 from public.team_callup_templates where team_id=team and player_id=(second_result->>'id')::uuid and cap_number=3)
  then raise exception 'No se ha integrado el gorro en la convocatoria por defecto.'; end if;
  rejected := false;
  begin perform public.register_admin_player(jsonb_build_object('team_id',team,'full_name',name,'birth_year',2000));
  exception when others then if sqlerrm not like 'Ya existe%' then raise; end if; rejected := true; end;
  if not rejected or (select count(*) from public.profiles where full_name=name) <> 1 then raise exception 'Se ha duplicado el jugador.'; end if;
  rejected := false;
  begin perform public.register_admin_player(jsonb_build_object('team_id',team,'full_name',name || ' ocupado','birth_year',2000,'cap_number',2));
  exception when others then if sqlerrm not like 'Ese gorro%' then raise; end if; rejected := true; end;
  if not rejected or exists(select 1 from public.profiles where full_name=name || ' ocupado') then raise exception 'Se ha dejado un alta incompleta con gorro duplicado.'; end if;
  rejected := false;
  begin perform public.register_admin_player(jsonb_build_object('team_id',team,'full_name',name || ' futuro','birth_year',2100));
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Se ha aceptado un año futuro.'; end if;
end;
$$;
reset role;
do $$
begin
  if has_function_privilege('anon','public.register_admin_player(jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.register_admin_player(jsonb)','EXECUTE')
  then raise exception 'El alta privilegiada está expuesta a clientes.'; end if;
end;
$$;
rollback;
