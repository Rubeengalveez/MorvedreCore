begin;
do $$
declare
  season uuid;
  start_year integer;
  cadete_team uuid;
  infantil_team uuid;
  birth integer;
  result jsonb;
  rejected boolean;
begin
  select id, extract(year from start_date)::integer into season, start_year
  from public.seasons where is_current;
  if season is null then raise exception 'Falta temporada para la prueba.'; end if;
  insert into public.teams(season_id,category_code,label,gender,team_type,color)
  values(season,'cadete','QA categorías ' || gen_random_uuid(),'male','competitive','#1E5AA8')
  returning id into cadete_team;
  insert into public.teams(season_id,category_code,label,gender,team_type,color)
  values(season,'infantil','QA categorías ' || gen_random_uuid(),'mixed','competitive','#FF6B35')
  returning id into infantil_team;
  perform set_config('qa.category_cadete',cadete_team::text,true);
  perform set_config('qa.category_infantil',infantil_team::text,true);
  perform set_config('qa.category_start',start_year::text,true);
end;
$$;
set local role service_role;
do $$
declare
  cadete_team uuid := current_setting('qa.category_cadete')::uuid;
  infantil_team uuid := current_setting('qa.category_infantil')::uuid;
  start_year integer := current_setting('qa.category_start')::integer;
  birth integer;
  result jsonb;
  rejected boolean;
begin
  foreach birth in array array[start_year-15,start_year-14] loop
    result := public.register_admin_player(jsonb_build_object(
      'team_id',cadete_team,'full_name','QA categoría ' || gen_random_uuid(),'birth_year',birth));
    if not exists(select 1 from public.team_rosters where team_id=cadete_team and player_id=(result->>'id')::uuid)
    then raise exception 'No permite registrar un Cadete en su equipo.'; end if;
    rejected := false;
    begin
      perform public.register_admin_player(jsonb_build_object(
        'team_id',infantil_team,'full_name','QA incompatible ' || gen_random_uuid(),'birth_year',birth));
    exception when others then
      if sqlerrm not like 'El año de nacimiento no encaja%' then raise; end if;
      rejected := true;
    end;
    if not rejected then raise exception 'Ha aceptado un Cadete como Infantil.'; end if;
  end loop;
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
