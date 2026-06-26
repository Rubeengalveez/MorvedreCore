create table public.team_rosters (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  squad_number smallint check (squad_number is null or (squad_number between 0 and 99)),
  joined_at date not null default current_date,
  left_at date check (left_at is null or left_at >= joined_at),
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create index team_rosters_player_id_idx on public.team_rosters (player_id);

alter table public.team_rosters enable row level security;

create policy team_rosters_select_authenticated
  on public.team_rosters
  for select
  to authenticated
  using (true);

create policy team_rosters_insert_admin
  on public.team_rosters
  for insert
  to authenticated
  with check (public.is_admin());

create policy team_rosters_update_admin
  on public.team_rosters
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy team_rosters_delete_admin
  on public.team_rosters
  for delete
  to authenticated
  using (public.is_admin());
