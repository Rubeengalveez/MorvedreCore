create or replace function public.can_manage_attendance_for(target_team_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles as actor
    join public.profile_permissions as permission
      on permission.profile_id = actor.id
      and permission.permission = 'manage_attendance'
    join public.teams as target_team
      on target_team.id = target_team_id
    where actor.auth_user_id = (select auth.uid())
      and exists (
        select 1
        from public.team_staff as staff
        join public.teams as staff_team on staff_team.id = staff.team_id
        join public.user_roles as coach_role
          on coach_role.profile_id = staff.profile_id
          and coach_role.role = 'coach'
          and coach_role.scope_team_id = staff.team_id
        where staff.profile_id = actor.id
          and staff.role in ('head_coach', 'assistant_coach')
          and staff_team.season_id = target_team.season_id
      )
  );
$$;

revoke all on function public.can_manage_attendance_for(uuid) from public, anon;
grant execute on function public.can_manage_attendance_for(uuid) to authenticated;

drop policy training_attendance_insert_admin_coach on public.training_attendance;
drop policy training_attendance_update_admin_coach on public.training_attendance;

create policy training_attendance_insert_authorized_coach
  on public.training_attendance
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.training_sessions as session
      where session.id = session_id
        and public.can_manage_attendance_for(session.team_id)
    )
  );

create policy training_attendance_update_authorized_coach
  on public.training_attendance
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.training_sessions as session
      where session.id = session_id
        and public.can_manage_attendance_for(session.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.training_sessions as session
      where session.id = session_id
        and public.can_manage_attendance_for(session.team_id)
    )
  );
