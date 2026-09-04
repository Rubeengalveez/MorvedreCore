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
    join public.teams as target_team
      on target_team.id = target_team_id
    where actor.auth_user_id = (select auth.uid())
      and exists (
        select 1
        from public.team_staff as staff
        join public.teams as staff_team
          on staff_team.id = staff.team_id
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
