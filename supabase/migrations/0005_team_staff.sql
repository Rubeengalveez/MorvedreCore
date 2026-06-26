create table public.team_staff (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in (
    'head_coach', 'assistant_coach', 'delegate', 'physical_trainer'
  )),
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (team_id, profile_id, role)
);

create index team_staff_profile_id_idx on public.team_staff (profile_id);

alter table public.team_staff enable row level security;

create policy team_staff_select_authenticated
  on public.team_staff
  for select
  to authenticated
  using (true);

create policy team_staff_insert_admin
  on public.team_staff
  for insert
  to authenticated
  with check (public.is_admin());

create policy team_staff_update_admin
  on public.team_staff
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy team_staff_delete_admin
  on public.team_staff
  for delete
  to authenticated
  using (public.is_admin());
