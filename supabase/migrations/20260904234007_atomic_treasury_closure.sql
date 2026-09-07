create or replace function public.atomic_save_treasury_closure(p_closure jsonb, p_lines jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_closure public.treasury_period_closures%rowtype;
  v_id uuid;
  v_total integer;
  v_count integer;
begin
  if jsonb_typeof(p_closure) is distinct from 'object'
    or jsonb_typeof(p_lines) is distinct from 'array'
    or (p_closure->>'period_start')::date > (p_closure->>'period_end')::date then
    raise exception 'Datos de cierre inválidos.';
  end if;

  select coalesce(sum(x.amount_cents), 0), count(*)
    into v_total, v_count
    from jsonb_to_recordset(p_lines) as x(amount_cents integer);

  insert into public.treasury_period_closures
    (season_id, period_label, period_start, period_end, generated_by, sent_to_email, total_cents)
  values (
    (p_closure->>'season_id')::uuid, p_closure->>'period_label',
    (p_closure->>'period_start')::date, (p_closure->>'period_end')::date,
    (p_closure->>'generated_by')::uuid, p_closure->>'sent_to_email', v_total
  )
  on conflict (season_id, period_start, period_end) do nothing;

  select * into strict v_closure
    from public.treasury_period_closures
    where season_id = (p_closure->>'season_id')::uuid
      and period_start = (p_closure->>'period_start')::date
      and period_end = (p_closure->>'period_end')::date
    for update;
  v_id := v_closure.id;

  perform id from public.treasury_lines where closure_id = v_id order by id for update;

  if v_closure.status <> 'draft' or v_closure.sent_at is not null then
    raise exception 'Este cierre ya está enviado o archivado. No se puede regenerar.';
  end if;
  if exists (select 1 from public.treasury_lines where closure_id = v_id and (paid or paid_at is not null)) then
    raise exception 'Este cierre tiene cobros registrados. No se puede regenerar sin perder su historial.';
  end if;

  update public.treasury_period_closures
    set period_label = p_closure->>'period_label',
        generated_by = (p_closure->>'generated_by')::uuid,
        generated_at = now(),
        sent_to_email = p_closure->>'sent_to_email',
        total_cents = v_total
    where id = v_id;

  delete from public.treasury_lines where closure_id = v_id;
  insert into public.treasury_lines
    (closure_id, profile_id, concept_id, source_type, source_id, description, amount_cents)
  select v_id, x.profile_id, x.concept_id, x.source_type, x.source_id, x.description, x.amount_cents
    from jsonb_to_recordset(p_lines) as x(
      profile_id uuid, concept_id uuid, source_type text,
      source_id uuid, description text, amount_cents integer
    );

  return jsonb_build_object('id', v_id, 'total_cents', v_total, 'line_count', v_count);
end;
$$;

revoke all on function public.atomic_save_treasury_closure(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.atomic_save_treasury_closure(jsonb, jsonb) to service_role;
