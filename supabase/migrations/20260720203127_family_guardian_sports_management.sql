drop policy if exists match_callups_update_authorized on public.match_callups;
create policy match_callups_update_authorized
  on public.match_callups
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches as match
      where match.id = match_id
        and public.is_coach_of(match.team_id)
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
    public.is_admin()
    or exists (
      select 1
      from public.matches as match
      where match.id = match_id
        and public.is_coach_of(match.team_id)
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

drop policy if exists match_availability_insert_self_or_admin on public.match_availability;
create policy match_availability_insert_self_or_admin
  on public.match_availability
  for insert
  to authenticated
  with check (
    public.is_admin()
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

drop policy if exists match_availability_update_self_or_admin on public.match_availability;
create policy match_availability_update_self_or_admin
  on public.match_availability
  for update
  to authenticated
  using (
    public.is_admin()
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
    public.is_admin()
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

drop policy if exists match_availability_delete_self_or_admin on public.match_availability;
create policy match_availability_delete_self_or_admin
  on public.match_availability
  for delete
  to authenticated
  using (
    public.is_admin()
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
