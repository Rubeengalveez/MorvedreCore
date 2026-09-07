begin;
do $test$
declare
  actor uuid := gen_random_uuid();
  actor_profile uuid;
  player uuid;
  other_player uuid;
  season uuid;
  v_closure_id uuid;
  visible_count integer;
begin
  insert into auth.users(id) values(actor);
  insert into public.profiles(auth_user_id, full_name, birth_year)
    values(actor, 'Prueba permiso exportación', 1980) returning id into actor_profile;
  insert into public.profiles(full_name, birth_year)
    values('Jugador prueba exportación', 2010) returning id into player;
  insert into public.profiles(full_name, birth_year)
    values('Otro jugador prueba exportación', 2012) returning id into other_player;
  insert into public.seasons(label, start_date, end_date, is_current)
    values('Prueba exportación', '2096-09-01', '2097-07-31', false) returning id into season;
  insert into public.treasury_period_closures(season_id, period_label, period_start, period_end, generated_by, total_cents)
    values(season, 'Prueba', '2096-09-01', '2096-09-30', actor_profile, 200) returning id into v_closure_id;
  insert into public.treasury_lines(closure_id, profile_id, source_type, description, amount_cents)
    values(v_closure_id, player, 'concept', 'Cuota de prueba', 100),
      (v_closure_id, other_player, 'concept', 'Otra cuota de prueba', 100);
  insert into public.profile_permissions(profile_id, permission) values(actor_profile, 'manage_treasury');
  perform set_config('request.jwt.claim.sub', actor::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if public.is_admin() or not public.has_permission('manage_treasury') then
    raise exception 'FAIL: la prueba no representa al gestor modular';
  end if;
  select count(*) into visible_count from public.treasury_period_closures c where c.id = v_closure_id;
  if visible_count <> 1 then raise exception 'FAIL: el gestor no ve el cierre'; end if;
  select count(*) into visible_count from public.treasury_lines l
    join public.profiles p on p.id = l.profile_id
    where l.closure_id = v_closure_id;
  if visible_count <> 2 then raise exception 'FAIL: el gestor no ve todas las líneas y nombres'; end if;
  execute 'reset role';
  delete from public.profile_permissions where profile_id = actor_profile;
  insert into public.parent_child_links(parent_profile_id, child_profile_id, relation) values(actor_profile, player, 'father');
  execute 'set local role authenticated';
  if public.has_permission('manage_treasury') then raise exception 'FAIL: permiso revocado persiste'; end if;
  select count(*) into visible_count from public.treasury_period_closures c where c.id = v_closure_id;
  if visible_count <> 0 then raise exception 'FAIL: una familia ve el cierre completo'; end if;
  select count(*) into visible_count from public.treasury_lines l where l.closure_id = v_closure_id;
  if visible_count <> 1 then raise exception 'FAIL: alcance financiero familiar'; end if;
  execute 'reset role';
end;
$test$;
rollback;
select 'OK: gestor modular, lectura completa con nombres, revocación y alcance familiar; fixtures revertidos' as result;
