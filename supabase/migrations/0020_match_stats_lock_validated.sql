-- S2: A validated match_stat should be locked. Only admin can re-edit.

drop policy if exists match_stats_update_admin_coach on public.match_stats;

create policy match_stats_update_admin_coach
  on public.match_stats
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.id = match_id and public.is_coach_of(m.team_id)
    )
  )
  with check (
    public.is_admin()
    or (
      exists (
        select 1 from public.matches m
        where m.id = match_id and public.is_coach_of(m.team_id)
      )
      and validated_at is null
    )
  );
