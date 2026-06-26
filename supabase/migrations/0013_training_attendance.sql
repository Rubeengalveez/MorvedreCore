create table public.training_attendance (
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  present boolean not null default false,
  reason text,
  marked_by uuid references public.profiles(id),
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index training_attendance_player_id_idx on public.training_attendance (player_id);

create trigger training_attendance_set_updated_at
  before update on public.training_attendance
  for each row execute function public.set_updated_at();

alter table public.training_attendance enable row level security;

create policy training_attendance_select_authenticated
  on public.training_attendance
  for select
  to authenticated
  using (true);

create policy training_attendance_insert_admin_coach
  on public.training_attendance
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.training_sessions s
      where s.id = session_id
        and public.is_coach_of(s.team_id)
    )
  );

create policy training_attendance_update_admin_coach
  on public.training_attendance
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.training_sessions s
      where s.id = session_id
        and public.is_coach_of(s.team_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.training_sessions s
      where s.id = session_id
        and public.is_coach_of(s.team_id)
    )
  );

create policy training_attendance_delete_admin
  on public.training_attendance
  for delete
  to authenticated
  using (public.is_admin());
