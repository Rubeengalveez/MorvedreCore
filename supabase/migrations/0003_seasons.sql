create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  is_current boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index seasons_only_one_current
  on public.seasons (is_current)
  where is_current = true;

create trigger seasons_set_updated_at
  before update on public.seasons
  for each row execute function public.set_updated_at();

alter table public.seasons enable row level security;

create policy seasons_select_authenticated
  on public.seasons
  for select
  to authenticated
  using (true);

create policy seasons_insert_admin
  on public.seasons
  for insert
  to authenticated
  with check (public.is_admin());

create policy seasons_update_admin
  on public.seasons
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy seasons_delete_admin
  on public.seasons
  for delete
  to authenticated
  using (public.is_admin());
