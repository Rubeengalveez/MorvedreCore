drop policy if exists match_stats_update_admin_coach on public.match_stats;
drop policy if exists match_stats_update_delegate on public.match_stats;
drop policy if exists match_stats_update_authorized on public.match_stats;
drop policy if exists match_stats_update_staff on public.match_stats;

create policy match_stats_update_authorized
  on public.match_stats
  for update
  to authenticated
  using (
    public.is_admin()
    or (
      validated_at is null
      and exists (
        select 1
        from public.matches m
        where m.id = match_id
          and public.is_match_staff_of(m.team_id)
      )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_match_staff_of(m.team_id)
    )
  );
