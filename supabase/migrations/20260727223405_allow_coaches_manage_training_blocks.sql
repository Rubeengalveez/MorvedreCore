drop policy if exists training_blocks_insert_admin on public.training_blocks;
drop policy if exists training_blocks_update_admin on public.training_blocks;
drop policy if exists training_blocks_delete_admin on public.training_blocks;

create policy training_blocks_insert_admin_coach
  on public.training_blocks
  for insert
  to authenticated
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy training_blocks_update_admin_coach
  on public.training_blocks
  for update
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id))
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy training_blocks_delete_admin_coach
  on public.training_blocks
  for delete
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id));
