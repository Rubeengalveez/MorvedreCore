create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent text not null,
  competition_type text not null default 'league' check (competition_type in ('league', 'cup', 'tournament', 'friendly')),
  is_home boolean not null default true,
  location text,
  pool_name text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'played', 'cancelled', 'postponed')),
  logistics_enabled boolean not null default false,
  notes text,
  final_score_us smallint,
  final_score_them smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_season_id_idx on public.matches (season_id);
create index matches_team_id_idx on public.matches (team_id);
create index matches_scheduled_at_idx on public.matches (scheduled_at);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

alter table public.matches enable row level security;

create policy matches_select_authenticated
  on public.matches
  for select
  to authenticated
  using (true);

create policy matches_insert_admin_coach
  on public.matches
  for insert
  to authenticated
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy matches_update_admin_coach
  on public.matches
  for update
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id))
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy matches_delete_admin_coach
  on public.matches
  for delete
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id));
