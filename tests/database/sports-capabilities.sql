begin;
do $test$
declare
  actor uuid := gen_random_uuid();
  actor_profile uuid;
  player uuid;
  season uuid;
  team_a uuid;
  team_b uuid;
  match_a uuid;
  match_b uuid;
  block_id uuid;
  affected integer;
  denied boolean;
begin
  insert into auth.users(id) values(actor);
  insert into public.profiles(auth_user_id, full_name) values(actor, 'Prueba permisos') returning id into actor_profile;
  insert into public.profiles(full_name) values('Jugador prueba permisos') returning id into player;
  insert into public.seasons(label, start_date, end_date, is_current)
    values('Prueba permisos', '2097-09-01', '2098-07-31', false) returning id into season;
  insert into public.teams(season_id, category_code, gender, label)
    values(season, 'cadete', 'male', 'Prueba A') returning id into team_a;
  insert into public.teams(season_id, category_code, gender, label)
    values(season, 'cadete', 'male', 'Prueba B') returning id into team_b;
  insert into public.matches(season_id, team_id, opponent, scheduled_at)
    values(season, team_a, 'Prueba A rival', '2097-10-01T12:00:00Z') returning id into match_a;
  insert into public.matches(season_id, team_id, opponent, scheduled_at)
    values(season, team_b, 'Prueba B rival', '2097-10-02T12:00:00Z') returning id into match_b;
  insert into public.match_callups(match_id, player_id, cap_number) values(match_a, player, 2);
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);

  insert into public.user_roles(profile_id, role) values(actor_profile, 'coach');
  execute 'set local role authenticated';
  if public.is_coach_of(team_a) or public.is_match_staff_of(team_b) or public.can_manage_training_of(team_a) then
    raise exception 'FAIL: el rol global heredado autoriza equipos';
  end if;
  update public.matches set notes = 'No permitido' where id = match_a;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: escritura con coach global'; end if;
  execute 'reset role';

  insert into public.user_roles(profile_id, role, scope_team_id) values(actor_profile, 'coach', team_a);
  execute 'set local role authenticated';
  if not public.is_coach_of(team_a) or public.is_coach_of(team_b) then raise exception 'FAIL: alcance entrenador'; end if;
  update public.matches set notes = 'Entrenador A' where id = match_a;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: entrenador no puede editar su partido'; end if;
  update public.matches set notes = 'No permitido' where id = match_b;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: entrenador modifica otro equipo'; end if;
  denied := false;
  begin
    update public.matches set team_id = team_b where id = match_a;
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'FAIL: entrenador traslada partido a equipo ajeno'; end if;
  execute 'reset role';

  delete from public.user_roles where profile_id = actor_profile;
  insert into public.team_staff(team_id, profile_id, role) values(team_a, actor_profile, 'delegate');
  execute 'set local role authenticated';
  if not public.is_match_staff_of(team_a) or public.can_manage_match_of(team_a) or public.is_match_staff_of(team_b) then
    raise exception 'FAIL: alcance delegado';
  end if;
  update public.matches set status = 'played', final_score_us = 7, final_score_them = 5 where id = match_a;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: delegado no guarda resultado'; end if;
  update public.match_callups set cap_number = 4, status = 'called' where match_id = match_a and player_id = player;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: delegado no cambia dorsal'; end if;
  insert into public.match_stats(match_id, player_id, goals, entered_by) values(match_a, player, 2, actor_profile);
  update public.match_stats set validated_by = actor_profile, validated_at = now() where match_id = match_a and player_id = player;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: delegado no valida acta'; end if;
  update public.match_stats set goals = 3 where match_id = match_a and player_id = player;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: delegado modifica acta validada'; end if;
  denied := false;
  begin update public.matches set opponent = 'Cambio no permitido' where id = match_a;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: delegado cambia programación'; end if;
  denied := false;
  begin update public.matches set status = 'cancelled' where id = match_a;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: delegado cancela partido'; end if;
  denied := false;
  begin insert into public.matches(season_id, team_id, opponent, scheduled_at)
    values(season, team_a, 'No permitido', '2097-10-03T12:00:00Z');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: delegado crea partido'; end if;
  delete from public.matches where id = match_a;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: delegado elimina partido'; end if;
  execute 'reset role';

  delete from public.team_staff where profile_id = actor_profile;
  insert into public.profile_permissions(profile_id, permission) values(actor_profile, 'manage_trainings');
  execute 'set local role authenticated';
  if not public.can_manage_training_of(team_b) or public.can_manage_match_of(team_b) then
    raise exception 'FAIL: permiso modular entrenamiento';
  end if;
  insert into public.training_blocks(team_id, label, weekdays, start_date, end_date, start_time, end_time)
    values(team_b, 'Prueba bloque', array[1]::smallint[], '2097-10-01', '2097-10-31', '18:00', '19:00') returning id into block_id;
  affected := public.atomic_replace_training_schedule(team_b, array[]::uuid[],
    jsonb_build_array(jsonb_build_object('block_id', block_id, 'scheduled_at', '2097-10-07T16:00:00Z', 'duration_minutes', 60)));
  if affected <> 1 then raise exception 'FAIL: permiso modular no genera sesiones'; end if;
  execute 'reset role';

  delete from public.profile_permissions where profile_id = actor_profile;
  insert into public.profile_permissions(profile_id, permission) values(actor_profile, 'manage_matches');
  execute 'set local role authenticated';
  if public.can_manage_training_of(team_b) or not public.can_manage_match_of(team_b) then raise exception 'FAIL: permiso modular partidos'; end if;
  update public.matches set notes = 'Gestor de partidos' where id = match_b;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: gestor no edita partido'; end if;
  update public.match_callups set cap_number = 5 where match_id = match_a and player_id = player;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: gestor no cambia dorsal'; end if;
  execute 'reset role';

  delete from public.profile_permissions where profile_id = actor_profile;
  update public.profiles set auth_user_id = null where id = actor_profile;
  update public.profiles set auth_user_id = actor where id = player;
  execute 'set local role authenticated';
  update public.match_callups set status = 'confirmed' where match_id = match_a and player_id = player;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: jugador no puede responder convocatoria'; end if;
  denied := false;
  begin update public.match_callups set cap_number = 6 where match_id = match_a and player_id = player;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'FAIL: jugador cambia dorsal'; end if;
  execute 'reset role';

  if has_function_privilege('anon', 'public.can_manage_training_of(uuid)', 'execute')
    or has_function_privilege('anon', 'public.can_manage_match_of(uuid)', 'execute') then
    raise exception 'FAIL: permisos anónimos';
  end if;
end;
$test$;
rollback;
select 'OK: roles, scopes, delegates, modular permissions, RSVP and RLS; fixtures rolled back' as result;
