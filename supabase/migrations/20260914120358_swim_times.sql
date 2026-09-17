create table public.swim_time_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  test_date date not null,
  time_50_cs integer check (time_50_cs is null or time_50_cs between 1 and 359999),
  time_100_cs integer check (time_100_cs is null or time_100_cs between 1 and 359999),
  operation_id uuid not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  revision integer not null default 1 check (revision > 0),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete restrict,
  void_reason text check (void_reason is null or length(btrim(void_reason)) between 3 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swim_time_entries_has_time check (time_50_cs is not null or time_100_cs is not null),
  constraint swim_time_entries_void_state check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and void_reason is not null)
  ),
  unique (created_by, operation_id)
);

create index swim_time_entries_player_date_idx
  on public.swim_time_entries (player_id, test_date desc, created_at desc);
create index swim_time_entries_season_50_idx
  on public.swim_time_entries (season_id, time_50_cs, test_date)
  where voided_at is null and time_50_cs is not null;
create index swim_time_entries_season_100_idx
  on public.swim_time_entries (season_id, time_100_cs, test_date)
  where voided_at is null and time_100_cs is not null;
create index swim_time_entries_team_date_idx
  on public.swim_time_entries (team_id, test_date desc)
  where voided_at is null;

alter table public.swim_time_entries enable row level security;
revoke all on table public.swim_time_entries from anon, authenticated;
grant select, insert, update on table public.swim_time_entries to authenticated;

create policy swim_time_entries_select_club_member
  on public.swim_time_entries for select to authenticated
  using (
    exists (
      select 1 from public.profiles actor
      where actor.auth_user_id = (select auth.uid()) and actor.is_active
    )
  );

create policy swim_time_entries_insert_coach
  on public.swim_time_entries for insert to authenticated
  with check (
    test_date <= (now() at time zone 'Europe/Madrid')::date
    and voided_at is null
    and voided_by is null
    and void_reason is null
    and exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and actor.id = created_by
        and actor.id = updated_by
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role = 'coach'
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach')
          )
        )
    )
    and exists (
      select 1
      from public.team_rosters tr
      join public.teams t on t.id = tr.team_id
      join public.seasons s on s.id = t.season_id
      where tr.team_id = swim_time_entries.team_id
        and tr.player_id = swim_time_entries.player_id
        and swim_time_entries.season_id = t.season_id
        and swim_time_entries.test_date between s.start_date and s.end_date
        and swim_time_entries.test_date >= tr.joined_at
        and (tr.left_at is null or swim_time_entries.test_date <= tr.left_at)
    )
  );

create policy swim_time_entries_update_coach
  on public.swim_time_entries for update to authenticated
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role = 'coach'
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach')
          )
        )
    )
  )
  with check (
    test_date <= (now() at time zone 'Europe/Madrid')::date
    and exists (
      select 1
      from public.profiles actor
      where actor.auth_user_id = (select auth.uid())
        and actor.is_active
        and actor.id = updated_by
        and (voided_at is null or voided_by = actor.id)
        and (
          exists (
            select 1 from public.user_roles ur
            where ur.profile_id = actor.id
              and ur.role = 'coach'
              and ur.scope_team_id = swim_time_entries.team_id
          )
          or exists (
            select 1 from public.team_staff ts
            where ts.profile_id = actor.id
              and ts.team_id = swim_time_entries.team_id
              and ts.role in ('head_coach', 'assistant_coach')
          )
        )
    )
    and exists (
      select 1
      from public.team_rosters tr
      join public.teams t on t.id = tr.team_id
      join public.seasons s on s.id = t.season_id
      where tr.team_id = swim_time_entries.team_id
        and tr.player_id = swim_time_entries.player_id
        and swim_time_entries.season_id = t.season_id
        and swim_time_entries.test_date between s.start_date and s.end_date
        and swim_time_entries.test_date >= tr.joined_at
        and (tr.left_at is null or swim_time_entries.test_date <= tr.left_at)
    )
  );

create or replace function private.protect_swim_time_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.player_id is distinct from old.player_id
    or new.team_id is distinct from old.team_id
    or new.season_id is distinct from old.season_id
    or new.operation_id is distinct from old.operation_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'No puedes cambiar la identidad de una anotación de nado.' using errcode = '42501';
  end if;

  if new.revision <> old.revision + 1 then
    raise exception 'La revisión de la anotación no es válida.' using errcode = '40001';
  end if;

  if old.voided_at is not null and new.voided_at is null then
    new.voided_by := null;
    new.void_reason := null;
  elsif old.voided_at is null and new.voided_at is not null then
    if new.voided_by is null or new.void_reason is null then
      raise exception 'Indica quién anula la anotación y el motivo.' using errcode = '23514';
    end if;
  elsif old.voided_at is not null and new.voided_at is not null then
    if new.voided_at is distinct from old.voided_at
      or new.voided_by is distinct from old.voided_by
      or new.void_reason is distinct from old.void_reason then
      raise exception 'Restaura la anotación antes de cambiar su anulación.' using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.protect_swim_time_entry() from public, anon, authenticated;

create trigger protect_swim_time_entry_changes
  before update on public.swim_time_entries
  for each row execute function private.protect_swim_time_entry();

create trigger audit_swim_time_entry_changes
  after insert or update or delete on public.swim_time_entries
  for each row execute function private.audit_sensitive_change('id');
