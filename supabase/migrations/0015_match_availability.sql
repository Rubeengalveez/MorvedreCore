create table public.match_availability (
  player_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  available boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (player_id, date)
);

create index match_availability_date_idx on public.match_availability (date);

create trigger match_availability_set_updated_at
  before update on public.match_availability
  for each row execute function public.set_updated_at();

alter table public.match_availability enable row level security;

create policy match_availability_select_authenticated
  on public.match_availability
  for select
  to authenticated
  using (true);

create policy match_availability_insert_self_or_admin
  on public.match_availability
  for insert
  to authenticated
  with check (
    public.is_admin()
    or player_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy match_availability_update_self_or_admin
  on public.match_availability
  for update
  to authenticated
  using (
    public.is_admin()
    or player_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or player_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy match_availability_delete_self_or_admin
  on public.match_availability
  for delete
  to authenticated
  using (
    public.is_admin()
    or player_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );
