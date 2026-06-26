create table public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references public.training_blocks(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes smallint not null default 90,
  location text,
  cancelled boolean not null default false,
  cancellation_reason text,
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index training_sessions_team_id_idx on public.training_sessions (team_id);
create index training_sessions_scheduled_at_idx on public.training_sessions (scheduled_at);
create index training_sessions_team_id_scheduled_at_idx on public.training_sessions (team_id, scheduled_at);

create trigger training_sessions_set_updated_at
  before update on public.training_sessions
  for each row execute function public.set_updated_at();

alter table public.training_sessions enable row level security;

create policy training_sessions_select_authenticated
  on public.training_sessions
  for select
  to authenticated
  using (true);

create policy training_sessions_insert_admin_coach
  on public.training_sessions
  for insert
  to authenticated
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy training_sessions_update_admin_coach
  on public.training_sessions
  for update
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id))
  with check (public.is_admin() or public.is_coach_of(team_id));

create policy training_sessions_delete_admin_coach
  on public.training_sessions
  for delete
  to authenticated
  using (public.is_admin() or public.is_coach_of(team_id));
