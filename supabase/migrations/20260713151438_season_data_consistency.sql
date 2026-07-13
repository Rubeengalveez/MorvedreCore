alter table public.seasons disable trigger protect_archived_season_changes;

update public.seasons
set archived_at = null
where is_current
  and archived_at is not null;

alter table public.seasons enable trigger protect_archived_season_changes;

delete from public.seasons future
where not future.is_current
  and future.archived_at is null
  and future.start_date > (
    select current.end_date
    from public.seasons current
    where current.is_current
  )
  and not exists (select 1 from public.teams t where t.season_id = future.id)
  and not exists (select 1 from public.matches m where m.season_id = future.id);

alter table public.seasons
  add constraint seasons_current_not_archived
  check (not (is_current and archived_at is not null));

create policy access_request_children_explicit_deny
  on public.access_request_children
  for all
  to anon, authenticated
  using (false)
  with check (false);
