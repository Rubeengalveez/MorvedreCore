begin;
do $test$
declare
  v_profile uuid;
  v_season uuid;
  v_closure jsonb;
  v_lines jsonb;
  v_result jsonb;
  v_id uuid;
  v_line_id uuid;
  v_failed boolean;
begin
  insert into public.profiles(full_name) values ('Prueba transaccional tesorería') returning id into v_profile;
  insert into public.seasons(label, start_date, end_date, is_current)
    values ('Prueba transaccional', '2098-09-01', '2099-07-31', false) returning id into v_season;
  v_closure := jsonb_build_object('season_id', v_season, 'period_label', 'Prueba',
    'period_start', '2098-09-01', 'period_end', '2098-09-30', 'generated_by', v_profile);
  v_lines := jsonb_build_array(jsonb_build_object('profile_id', v_profile,
    'source_type', 'concept', 'description', 'Cuota de prueba', 'amount_cents', 6000));
  v_result := public.atomic_save_treasury_closure(v_closure, v_lines);
  v_id := (v_result->>'id')::uuid;
  if (v_result->>'total_cents')::integer <> 6000 or (v_result->>'line_count')::integer <> 1 then
    raise exception 'FAIL: creación';
  end if;
  select id into v_line_id from public.treasury_lines where closure_id = v_id;

  v_failed := false;
  begin
    perform public.atomic_save_treasury_closure(v_closure,
      jsonb_set(v_lines, '{0,profile_id}', to_jsonb(gen_random_uuid())));
  exception when foreign_key_violation then v_failed := true;
  end;
  if not v_failed or not exists (select 1 from public.treasury_lines where id = v_line_id and amount_cents = 6000) then
    raise exception 'FAIL: rollback de líneas';
  end if;

  v_result := public.atomic_save_treasury_closure(v_closure, jsonb_set(v_lines, '{0,amount_cents}', '7000'));
  if (v_result->>'id')::uuid <> v_id or (v_result->>'total_cents')::integer <> 7000 then
    raise exception 'FAIL: regeneración de borrador';
  end if;

  update public.treasury_lines set paid = true, paid_at = '2098-09-20' where closure_id = v_id;
  v_failed := false;
  begin
    perform public.atomic_save_treasury_closure(v_closure, v_lines);
  exception when raise_exception then
    if sqlerrm not like '%cobros registrados%' then raise; end if;
    v_failed := true;
  end;
  if not v_failed or not exists(select 1 from public.treasury_lines where closure_id = v_id and paid and amount_cents = 7000) then
    raise exception 'FAIL: protección de cobros';
  end if;

  update public.treasury_lines set paid = false, paid_at = null where closure_id = v_id;
  update public.treasury_period_closures set status = 'sent' where id = v_id;
  v_failed := false;
  begin
    perform public.atomic_save_treasury_closure(v_closure, v_lines);
  exception when raise_exception then
    if sqlerrm not like '%enviado o archivado%' then raise; end if;
    v_failed := true;
  end;
  if not v_failed then raise exception 'FAIL: protección de cierre enviado'; end if;

  if has_function_privilege('anon', 'public.atomic_save_treasury_closure(jsonb,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.atomic_save_treasury_closure(jsonb,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.atomic_save_treasury_closure(jsonb,jsonb)', 'execute') then
    raise exception 'FAIL: permisos de función';
  end if;
end;
$test$;
rollback;
select 'OK: creación, rollback, regeneración, cobros, cierre enviado y permisos; fixtures revertidos' as result;
