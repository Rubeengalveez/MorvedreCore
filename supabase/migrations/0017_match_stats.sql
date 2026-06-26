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
  );
$$;

revoke execute on function public.is_delegate_of(uuid) from public;
grant execute on function public.is_delegate_of(uuid) to authenticated;

create table public.match_stats (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  goals smallint not null default 0,
  exclusions smallint not null default 0,
  mvp boolean not null default false,
  entered_by uuid references public.profiles(id),
  entered_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index match_stats_player_id_idx on public.match_stats (player_id);

create trigger match_stats_set_updated_at
  before update on public.match_stats
  for each row execute function public.set_updated_at();

alter table public.match_stats enable row level security;

create policy match_stats_select_authenticated
  on public.match_stats
  for select
  to authenticated
  using (true);

create policy match_stats_insert_admin_coach_delegate
  on public.match_stats
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (public.is_coach_of(m.team_id) or public.is_delegate_of(m.team_id))
    )
  );

create policy match_stats_update_admin_coach
  on public.match_stats
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  );

create policy match_stats_update_delegate
  on public.match_stats
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_delegate_of(m.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_delegate_of(m.team_id)
    )
    and validated_by is null
    and validated_at is null
  );

create policy match_stats_delete_admin
  on public.match_stats
  for delete
  to authenticated
  using (public.is_admin());
