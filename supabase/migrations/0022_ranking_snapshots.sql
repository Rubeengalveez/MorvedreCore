create table public.ranking_snapshots (
  season_id uuid not null references public.seasons(id) on delete cascade,
  scope text not null check (scope in ('season', 'category', 'team')),
  scope_key text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  matches_played smallint not null default 0,
  matches_called smallint not null default 0,
  goals smallint not null default 0,
  exclusions smallint not null default 0,
  mvp_count smallint not null default 0,
  trainings_attended smallint not null default 0,
  trainings_total smallint not null default 0,
  attendance_pct numeric(5,2) not null default 0,
  attendance_streak smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season_id, scope, scope_key, player_id)
);

create index ranking_snapshots_player_idx on public.ranking_snapshots (player_id);
create index ranking_snapshots_scope_idx on public.ranking_snapshots (season_id, scope, scope_key, goals desc);
create index ranking_snapshots_exclusions_idx on public.ranking_snapshots (season_id, scope, scope_key, exclusions desc);
create index ranking_snapshots_mvp_idx on public.ranking_snapshots (season_id, scope, scope_key, mvp_count desc);
create index ranking_snapshots_attendance_idx on public.ranking_snapshots (season_id, scope, scope_key, attendance_pct desc);

alter table public.ranking_snapshots enable row level security;

create policy ranking_snapshots_select_all
  on public.ranking_snapshots
  for select
  to authenticated
  using (true);

create policy ranking_snapshots_admin_all
  on public.ranking_snapshots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
