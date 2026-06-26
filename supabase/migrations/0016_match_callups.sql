create table public.match_callups (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  cap_number smallint,
  status text not null default 'called' check (status in ('called', 'confirmed', 'declined', 'withdrawn', 'no_show')),
  confirmed_at timestamptz,
  source_team_id uuid references public.teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index match_callups_player_id_idx on public.match_callups (player_id);

create trigger match_callups_set_updated_at
  before update on public.match_callups
  for each row execute function public.set_updated_at();

create or replace function public.match_callups_protect_rsvp_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_is_privileged boolean;
begin
  if (
    new.cap_number is distinct from old.cap_number
    or new.source_team_id is distinct from old.source_team_id
  ) then
    select exists (
      select 1
      from public.matches m
      where m.id = new.match_id
        and (
          public.is_admin()
          or public.is_coach_of(m.team_id)
        )
    ) into actor_is_privileged;
    if not actor_is_privileged then
      raise exception 'No tienes permisos para modificar el dorsal o el equipo de origen de una convocatoria.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger match_callups_protect_rsvp_columns
  before update on public.match_callups
  for each row execute function public.match_callups_protect_rsvp_columns();

revoke execute on function public.match_callups_protect_rsvp_columns() from public;
grant execute on function public.match_callups_protect_rsvp_columns() to authenticated;

alter table public.match_callups enable row level security;

create policy match_callups_select_authenticated
  on public.match_callups
  for select
  to authenticated
  using (true);

create policy match_callups_insert_admin_coach
  on public.match_callups
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  );

create policy match_callups_update_admin_coach
  on public.match_callups
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  );

create policy match_callups_update_player_rsvp
  on public.match_callups
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

create policy match_callups_delete_admin_coach
  on public.match_callups
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
  );
