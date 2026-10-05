create or replace function public.is_team_official_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.profiles actor
    where actor.auth_user_id = (select auth.uid()) and actor.is_active and (
      exists (select 1 from public.user_roles r where r.profile_id = actor.id and r.scope_team_id = p_team_id and r.role in ('coach','delegate'))
      or exists (select 1 from public.team_staff s where s.profile_id = actor.id and s.team_id = p_team_id and s.role in ('head_coach','assistant_coach','delegate'))
    )
  );
$$;
revoke execute on function public.is_team_official_of(uuid) from public, anon;
grant execute on function public.is_team_official_of(uuid) to authenticated, service_role;

create or replace function public.can_manage_match_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.has_permission('manage_matches') or public.is_team_official_of(p_team_id); $$;
create or replace function public.can_manage_training_of(p_team_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$ select public.has_permission('manage_trainings') or public.is_team_official_of(p_team_id); $$;
revoke execute on function public.can_manage_match_of(uuid) from public, anon;
revoke execute on function public.can_manage_training_of(uuid) from public, anon;
grant execute on function public.can_manage_match_of(uuid) to authenticated, service_role;
grant execute on function public.can_manage_training_of(uuid) to authenticated, service_role;

alter policy matches_insert_admin_coach on public.matches with check (public.can_manage_match_of(team_id));
alter policy matches_update_admin_coach on public.matches using (public.can_manage_match_of(team_id)) with check (public.can_manage_match_of(team_id));
alter policy matches_delete_admin_coach on public.matches using (public.can_manage_match_of(team_id));
alter policy training_blocks_insert_admin_coach on public.training_blocks with check (public.can_manage_training_of(team_id));
alter policy training_blocks_update_admin_coach on public.training_blocks using (public.can_manage_training_of(team_id)) with check (public.can_manage_training_of(team_id));
alter policy training_blocks_delete_admin_coach on public.training_blocks using (public.can_manage_training_of(team_id));
alter policy training_sessions_insert_admin_coach on public.training_sessions with check (public.can_manage_training_of(team_id));
alter policy training_sessions_update_admin_coach on public.training_sessions using (public.can_manage_training_of(team_id)) with check (public.can_manage_training_of(team_id));
alter policy training_sessions_delete_admin_coach on public.training_sessions using (public.can_manage_training_of(team_id));
alter policy team_staff_insert_admin on public.team_staff with check (public.has_permission('manage_staff'));
alter policy team_staff_update_admin on public.team_staff using (public.has_permission('manage_staff')) with check (public.has_permission('manage_staff'));
alter policy team_staff_delete_admin on public.team_staff using (public.has_permission('manage_staff'));

create or replace function public.sync_team_staff_access()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare access_role text;
begin
  if tg_op in ('DELETE','UPDATE') then
    access_role := case when old.role in ('head_coach','assistant_coach') then 'coach' when old.role = 'delegate' then 'delegate' end;
    if access_role is not null then
      perform pg_advisory_xact_lock(hashtextextended(old.profile_id::text || old.team_id::text, 0));
      if not exists (select 1 from public.team_staff s where s.team_id = old.team_id and s.profile_id = old.profile_id and
        (s.role = old.role or (access_role = 'coach' and s.role in ('head_coach','assistant_coach')))) then
        delete from public.user_roles where profile_id = old.profile_id and scope_team_id = old.team_id and role = access_role;
      end if;
    end if;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    access_role := case when new.role in ('head_coach','assistant_coach') then 'coach' when new.role = 'delegate' then 'delegate' end;
    if access_role is not null then
      perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text || new.team_id::text, 0));
      insert into public.user_roles(profile_id,role,scope_team_id,granted_by)
        values(new.profile_id,access_role,new.team_id,new.granted_by)
        on conflict(profile_id,role,scope_team_id) do nothing;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke execute on function public.sync_team_staff_access() from public, anon, authenticated;
create trigger team_staff_sync_access after insert or update or delete on public.team_staff for each row execute function public.sync_team_staff_access();
insert into public.user_roles(profile_id,role,scope_team_id,granted_by)
  select profile_id,case when role = 'delegate' then 'delegate' else 'coach' end,team_id,granted_by
  from public.team_staff where role in ('head_coach','assistant_coach','delegate')
  on conflict(profile_id,role,scope_team_id) do nothing;

do $$
declare routine record; definition text; updated text;
begin
  for routine in select oid from pg_proc where pronamespace = 'public'::regnamespace and prokind = 'f'
    and proname in ('save_live_match_sheet','prepare_live_match_caps','prevent_duplicate_match_caps') loop
    definition := pg_get_functiondef(routine.oid);
    updated := regexp_replace(definition, 'role[[:space:]]*=[[:space:]]*''delegate''', 'role in (''coach'',''head_coach'',''assistant_coach'',''delegate'')', 'g');
    updated := replace(updated, 'Solo el delegado de este equipo puede preparar el acta.', 'Solo el entrenador o delegado de este equipo puede preparar el acta.');
    if updated is distinct from definition then execute updated; end if;
  end loop;
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

drop policy swim_time_entries_insert_coach on public.swim_time_entries;
drop policy swim_time_entries_update_coach on public.swim_time_entries;
create policy swim_time_entries_insert_coach
  on public.swim_time_entries for insert to authenticated
  with check (
    test_date <= (now() at time zone 'Europe/Madrid')::date
    and voided_at is null
    and voided_by is null
    and void_reason is null
    and exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and actor.id = created_by
        and actor.id = updated_by
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role in ('coach','delegate')
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach', 'delegate')
          )
        )
    )
    and exists (
      select 1
      from public.team_rosters tr
      join public.teams t on t.id = tr.team_id
      join public.seasons s on s.id = t.season_id
      where tr.team_id = swim_time_entries.team_id
        and tr.player_id = swim_time_entries.player_id
        and swim_time_entries.season_id = t.season_id
        and swim_time_entries.test_date between s.start_date and s.end_date
        and swim_time_entries.test_date >= tr.joined_at
        and (tr.left_at is null or swim_time_entries.test_date <= tr.left_at)
    )
  );

create policy swim_time_entries_update_coach
  on public.swim_time_entries for update to authenticated
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role in ('coach','delegate')
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach', 'delegate')
          )
        )
    )
  )
  with check (
    test_date <= (now() at time zone 'Europe/Madrid')::date
    and exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and actor.id = updated_by
        and (voided_at is null or voided_by = actor.id)
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role in ('coach','delegate')
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach', 'delegate')
          )
        )
    )
    and exists (
      select 1
      from public.team_rosters tr
      join public.teams t on t.id = tr.team_id
      join public.seasons s on s.id = t.season_id
      where tr.team_id = swim_time_entries.team_id
        and tr.player_id = swim_time_entries.player_id
        and swim_time_entries.season_id = t.season_id
        and swim_time_entries.test_date between s.start_date and s.end_date
        and swim_time_entries.test_date >= tr.joined_at
        and (tr.left_at is null or swim_time_entries.test_date <= tr.left_at)
    )
  );
