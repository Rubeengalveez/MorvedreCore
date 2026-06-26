create table public.training_blocks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null,
  weekdays smallint[] not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  location text,
  kind text not null default 'water' check (kind in ('water', 'dry', 'physical', 'technical', 'mixed')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index training_blocks_team_id_idx on public.training_blocks (team_id);

create trigger training_blocks_set_updated_at
  before update on public.training_blocks
  for each row execute function public.set_updated_at();

alter table public.training_blocks enable row level security;

create policy training_blocks_select_authenticated
  on public.training_blocks
  for select
  to authenticated
  using (true);

create policy training_blocks_insert_admin
  on public.training_blocks
  for insert
  to authenticated
  with check (public.is_admin());

create policy training_blocks_update_admin
  on public.training_blocks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy training_blocks_delete_admin
  on public.training_blocks
  for delete
  to authenticated
  using (public.is_admin());
