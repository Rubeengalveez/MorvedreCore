-- Migration: delegate match management and RLS hardening
-- Allows team delegates (via user_roles or team_staff) to manage match callups, input match stats, and validate sheets.

create or replace function public.is_delegate_of(team_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id
    where p.auth_user_id = (select auth.uid())
      and ur.role = 'delegate'
      and ur.scope_team_id = team_id
  ) or exists (
    select 1
    from public.team_staff ts
    join public.profiles p on p.id = ts.profile_id
    where p.auth_user_id = (select auth.uid())
      and ts.role = 'delegate'
      and ts.team_id = team_id
  );
$$;

revoke execute on function public.is_delegate_of(uuid) from public, anon;
grant execute on function public.is_delegate_of(uuid) to authenticated, service_role;

create or replace function public.is_match_staff_of(team_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select public.is_admin()
    or public.is_coach_of(team_id)
    or public.is_delegate_of(team_id);
$$;

revoke execute on function public.is_match_staff_of(uuid) from public, anon;
grant execute on function public.is_match_staff_of(uuid) to authenticated, service_role;

-- 1. match_callups: Insert
drop policy if exists match_callups_insert_admin_coach on public.match_callups;
drop policy if exists match_callups_insert_staff on public.match_callups;
create policy match_callups_insert_staff
  on public.match_callups
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  );

-- 2. match_callups: Update (staff + player RSVP + guardian RSVP)
drop policy if exists match_callups_update_authorized on public.match_callups;
create policy match_callups_update_authorized
  on public.match_callups
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches as match
      where match.id = match_id
        and public.is_match_staff_of(match.team_id)
    )
    or player_id = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links as link
      join public.profiles as parent on parent.id = link.parent_profile_id
      join public.profiles as child on child.id = link.child_profile_id
      where parent.auth_user_id = (select auth.uid())
        and parent.is_active
        and child.is_active
        and link.child_profile_id = player_id
        and (child.birth_year is null or child.birth_year > extract(year from current_date)::integer - 18)
    )
  )
  with check (
    exists (
      select 1
      from public.matches as match
      where match.id = match_id
        and public.is_match_staff_of(match.team_id)
    )
    or player_id = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links as link
      join public.profiles as parent on parent.id = link.parent_profile_id
      join public.profiles as child on child.id = link.child_profile_id
      where parent.auth_user_id = (select auth.uid())
        and parent.is_active
        and child.is_active
        and link.child_profile_id = player_id
        and (child.birth_year is null or child.birth_year > extract(year from current_date)::integer - 18)
    )
  );

-- 3. match_callups: Delete
drop policy if exists match_callups_delete_admin_coach on public.match_callups;
drop policy if exists match_callups_delete_staff on public.match_callups;
create policy match_callups_delete_staff
  on public.match_callups
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  );

-- 4. match_stats: Insert and Update
drop policy if exists match_stats_insert_admin_coach_delegate on public.match_stats;
drop policy if exists match_stats_insert_staff on public.match_stats;
create policy match_stats_insert_staff
  on public.match_stats
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  );

drop policy if exists match_stats_update_admin_coach on public.match_stats;
drop policy if exists match_stats_update_staff on public.match_stats;
create policy match_stats_update_staff
  on public.match_stats
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  );
