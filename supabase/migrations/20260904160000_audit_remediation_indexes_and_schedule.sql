-- Migration: index on training_attendance_audit(changed_by) and atomic training schedule replacement

create index if not exists training_attendance_audit_changed_by_idx
  on public.training_attendance_audit (changed_by);

create or replace function public.atomic_replace_training_schedule(
  p_team_id uuid,
  p_removable_session_ids uuid[],
  p_sessions_to_insert jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted_count integer := 0;
begin
  if not (public.is_admin() or public.is_coach_of(p_team_id)) then
    raise exception 'No tienes permisos para modificar el horario de este equipo.';
  end if;

  if p_removable_session_ids is not null and array_length(p_removable_session_ids, 1) > 0 then
    if exists (
      select 1 from public.training_attendance
      where session_id = any(p_removable_session_ids)
    ) then
      raise exception 'No se pueden eliminar sesiones que ya tienen asistencia registrada.';
    end if;

    delete from public.training_sessions
    where id = any(p_removable_session_ids)
      and team_id = p_team_id;
  end if;

  if p_sessions_to_insert is not null and jsonb_array_length(p_sessions_to_insert) > 0 then
    insert into public.training_sessions (
      block_id,
      team_id,
      scheduled_at,
      duration_minutes,
      location,
      maps_url
    )
    select
      (item->>'block_id')::uuid,
      p_team_id,
      (item->>'scheduled_at')::timestamptz,
      (item->>'duration_minutes')::integer,
      item->>'location',
      item->>'maps_url'
    from jsonb_array_elements(p_sessions_to_insert) as item;

    get diagnostics v_inserted_count = row_count;
  end if;

  return v_inserted_count;
end;
$$;

revoke execute on function public.atomic_replace_training_schedule(uuid, uuid[], jsonb) from public, anon;
grant execute on function public.atomic_replace_training_schedule(uuid, uuid[], jsonb) to authenticated, service_role;
