create or replace function public.is_assigned_coach_of(p_team_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles as role
    join public.profiles as profile
      on profile.id = role.profile_id
    where profile.auth_user_id = (select auth.uid())
      and role.role = 'coach'
      and role.scope_team_id = p_team_id
  );
$$;

revoke all on function public.is_assigned_coach_of(uuid) from public, anon;
grant execute on function public.is_assigned_coach_of(uuid) to authenticated, service_role;

drop policy if exists training_blocks_insert_admin_coach on public.training_blocks;
drop policy if exists training_blocks_update_admin_coach on public.training_blocks;
drop policy if exists training_blocks_delete_admin_coach on public.training_blocks;

create policy training_blocks_insert_admin_coach
  on public.training_blocks
  for insert
  to authenticated
  with check (public.is_admin() or public.is_assigned_coach_of(team_id));

create policy training_blocks_update_admin_coach
  on public.training_blocks
  for update
  to authenticated
  using (public.is_admin() or public.is_assigned_coach_of(team_id))
  with check (public.is_admin() or public.is_assigned_coach_of(team_id));

create policy training_blocks_delete_admin_coach
  on public.training_blocks
  for delete
  to authenticated
  using (public.is_admin() or public.is_assigned_coach_of(team_id));
