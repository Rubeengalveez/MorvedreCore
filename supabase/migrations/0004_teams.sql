create table public.teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category_code text not null check (category_code in (
    'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'absoluto', 'escuela'
  )),
  label text not null,
  gender text not null check (gender in ('male', 'female', 'mixed')),
  team_type text not null default 'competitive' check (team_type in ('competitive', 'school')),
  color text not null default '#0A2E5C' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  home_pool text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index teams_season_id_label_unique
  on public.teams (season_id, label);

create index teams_season_id_idx on public.teams (season_id);
create index teams_category_code_idx on public.teams (category_code);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.teams enable row level security;

create policy teams_select_authenticated
  on public.teams
  for select
  to authenticated
  using (true);

create policy teams_insert_admin
  on public.teams
  for insert
  to authenticated
  with check (public.is_admin());

create policy teams_update_admin
  on public.teams
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy teams_delete_admin
  on public.teams
  for delete
  to authenticated
  using (public.is_admin());
