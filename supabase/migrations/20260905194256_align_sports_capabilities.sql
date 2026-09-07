create or replace function public.is_coach_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.is_assigned_coach_of(p_team_id); $$;

create or replace function public.can_manage_training_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.has_permission('manage_trainings') or public.is_assigned_coach_of(p_team_id); $$;

create or replace function public.can_manage_match_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.has_permission('manage_matches') or public.is_assigned_coach_of(p_team_id); $$;

create or replace function public.is_match_staff_of(team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.can_manage_match_of(team_id) or public.is_delegate_of(team_id); $$;

revoke execute on function public.can_manage_training_of(uuid) from public, anon;
revoke execute on function public.can_manage_match_of(uuid) from public, anon;
grant execute on function public.can_manage_training_of(uuid) to authenticated, service_role;
grant execute on function public.can_manage_match_of(uuid) to authenticated, service_role;
grant execute on function public.has_permission(text) to service_role;

alter policy training_blocks_insert_admin_coach on public.training_blocks
  with check (public.can_manage_training_of(team_id));
alter policy training_blocks_update_admin_coach on public.training_blocks
  using (public.can_manage_training_of(team_id)) with check (public.can_manage_training_of(team_id));
alter policy training_blocks_delete_admin_coach on public.training_blocks
  using (public.can_manage_training_of(team_id));
alter policy training_sessions_insert_admin_coach on public.training_sessions
  with check (public.can_manage_training_of(team_id));
alter policy training_sessions_update_admin_coach on public.training_sessions
  using (public.can_manage_training_of(team_id)) with check (public.can_manage_training_of(team_id));
alter policy training_sessions_delete_admin_coach on public.training_sessions
  using (public.can_manage_training_of(team_id));
alter policy matches_insert_admin_coach on public.matches
  with check (public.can_manage_match_of(team_id));
alter policy matches_delete_admin_coach on public.matches
  using (public.can_manage_match_of(team_id));
alter policy matches_update_admin_coach on public.matches
  using (public.is_match_staff_of(team_id)) with check (public.is_match_staff_of(team_id));

create or replace function public.matches_protect_delegate_columns()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role') then return new; end if;
  if public.can_manage_match_of(old.team_id) and public.can_manage_match_of(new.team_id) then
    return new;
  end if;
  if not public.is_delegate_of(old.team_id)
    or (to_jsonb(new) - array['status', 'final_score_us', 'final_score_them', 'updated_at'])
      is distinct from (to_jsonb(old) - array['status', 'final_score_us', 'final_score_them', 'updated_at'])
    or (new.status is distinct from old.status and new.status <> 'played') then
    raise exception 'Solo puedes guardar el resultado del acta de tu equipo.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.matches_protect_delegate_columns() from public, anon, authenticated;
create trigger matches_protect_delegate_columns before update on public.matches
for each row execute function public.matches_protect_delegate_columns();

create or replace function public.match_callups_protect_rsvp_columns()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare actor_is_privileged boolean;
begin
  if new.match_id is distinct from old.match_id or new.player_id is distinct from old.player_id then
    raise exception 'No puedes cambiar la identidad de una convocatoria.' using errcode = '42501';
  end if;
  actor_is_privileged := current_user in ('postgres', 'service_role') or exists (
    select 1 from public.matches as match
    where match.id = new.match_id and public.is_match_staff_of(match.team_id)
  );
  if not actor_is_privileged then
    if new.cap_number is distinct from old.cap_number or new.source_team_id is distinct from old.source_team_id then
      raise exception 'No tienes permisos para modificar el dorsal o el equipo de origen de una convocatoria.' using errcode = '42501';
    end if;
    if new.status not in ('confirmed', 'declined', 'withdrawn') then
      raise exception 'La respuesta de una convocatoria no admite ese estado.' using errcode = '42501';
    end if;
    new.confirmed_at := case when new.status = 'confirmed' then now() else null end;
  end if;
  return new;
end;
$$;

create or replace function public.atomic_replace_training_schedule(
  p_team_id uuid, p_removable_session_ids uuid[], p_sessions_to_insert jsonb
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_inserted_count integer := 0;
begin
  if not public.can_manage_training_of(p_team_id) then
    raise exception 'No tienes permisos para modificar el horario de este equipo.';
  end if;
  if p_removable_session_ids is not null and array_length(p_removable_session_ids, 1) > 0 then
    if exists (select 1 from public.training_attendance where session_id = any(p_removable_session_ids)) then
      raise exception 'No se pueden eliminar sesiones que ya tienen asistencia registrada.';
    end if;
    delete from public.training_sessions where id = any(p_removable_session_ids) and team_id = p_team_id;
  end if;
  if p_sessions_to_insert is not null and jsonb_array_length(p_sessions_to_insert) > 0 then
    insert into public.training_sessions(block_id, team_id, scheduled_at, duration_minutes, location, maps_url)
    select (item->>'block_id')::uuid, p_team_id, (item->>'scheduled_at')::timestamptz,
      (item->>'duration_minutes')::integer, item->>'location', item->>'maps_url'
    from jsonb_array_elements(p_sessions_to_insert) as item;
    get diagnostics v_inserted_count = row_count;
  end if;
  return v_inserted_count;
end;
$$;
