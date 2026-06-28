-- ====================================================================
-- SCRIPT CONSOLIDADO E IDEMPOTENTE PARA LA FASE 3 (MIGRACIONES 22 A 26)
-- ====================================================================
-- Puedes ejecutar este script completo en el editor SQL de Supabase.
-- Se han añadido comprobaciones para evitar errores si las tablas u objetos ya existen.

-- 1. Tabla de Snapshots de Rankings (0022)
create table if not exists public.ranking_snapshots (
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

create index if not exists ranking_snapshots_player_idx on public.ranking_snapshots (player_id);
create index if not exists ranking_snapshots_scope_idx on public.ranking_snapshots (season_id, scope, scope_key, goals desc);
create index if not exists ranking_snapshots_exclusions_idx on public.ranking_snapshots (season_id, scope, scope_key, exclusions desc);
create index if not exists ranking_snapshots_mvp_idx on public.ranking_snapshots (season_id, scope, scope_key, mvp_count desc);
create index if not exists ranking_snapshots_attendance_idx on public.ranking_snapshots (season_id, scope, scope_key, attendance_pct desc);

alter table public.ranking_snapshots enable row level security;

drop policy if exists ranking_snapshots_select_all on public.ranking_snapshots;
create policy ranking_snapshots_select_all
  on public.ranking_snapshots
  for select
  to authenticated
  using (true);

drop policy if exists ranking_snapshots_admin_all on public.ranking_snapshots;
create policy ranking_snapshots_admin_all
  on public.ranking_snapshots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 2. Tabla de Estadísticas de Rivales (0023)
create table if not exists public.opponent_stats (
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent text not null,
  category_code text not null,
  matches_played smallint not null default 0,
  wins smallint not null default 0,
  draws smallint not null default 0,
  losses smallint not null default 0,
  goals_for smallint not null default 0,
  goals_against smallint not null default 0,
  last_match_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (season_id, team_id, opponent)
);

alter table public.opponent_stats enable row level security;

drop policy if exists opponent_stats_select_all on public.opponent_stats;
create policy opponent_stats_select_all
  on public.opponent_stats
  for select
  to authenticated
  using (true);

drop policy if exists opponent_stats_admin_all on public.opponent_stats;
create policy opponent_stats_admin_all
  on public.opponent_stats
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 3. Columnas de Hora de fin en entrenamientos y MVP en partidos (0024)
alter table public.training_sessions
  add column if not exists end_at timestamptz;

update public.training_sessions
  set end_at = scheduled_at + (duration_minutes || ' minutes')::interval
  where end_at is null;

create index if not exists training_sessions_end_at_idx on public.training_sessions (end_at);

alter table public.matches
  add column if not exists mvp_player_id uuid references public.profiles(id) on delete set null;

create index if not exists matches_mvp_player_id_idx on public.matches (mvp_player_id);


-- 4. Tabla de Rachas (0025)
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  subject_type text not null check (subject_type in ('player', 'team')),
  subject_id uuid not null,
  streak_type text not null check (streak_type in ('goals_consec', 'excl_consec', 'train_consec', 'mvp_consec', 'wins_consec')),
  current_value smallint not null default 0,
  best_value smallint not null default 0,
  best_at timestamptz,
  last_event_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (season_id, subject_type, subject_id, streak_type)
);

create index if not exists streaks_subject_idx on public.streaks (subject_type, subject_id);
create index if not exists streaks_season_idx on public.streaks (season_id, streak_type, current_value desc);

alter table public.streaks enable row level security;

drop policy if exists streaks_select_all on public.streaks;
create policy streaks_select_all
  on public.streaks
  for select
  to authenticated
  using (true);

drop policy if exists streaks_admin_all on public.streaks;
create policy streaks_admin_all
  on public.streaks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- 5. Correcciones e Idempotencia (0026)

-- a. Eliminar política restrictiva anterior
drop policy if exists profiles_select_authenticated on public.profiles;

-- b. Recrear vista pública de perfiles
drop view if exists public.profiles_public;
create or replace view public.profiles_public as
select
  id,
  full_name,
  photo_url,
  birth_year,
  gender,
  cap_number,
  license_active,
  team_color
from public.profiles;

grant select on public.profiles_public to authenticated;

-- c. Recrear función para verificar visibilidad de datos personales (añadiendo entrenadores)
create or replace function public.can_see_profile_pii(target_profile_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select
    public.is_admin()
    or target_profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or target_profile_id in (
      select child_profile_id
      from public.parent_child_links
      where parent_profile_id in (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
    )
    or target_profile_id in (
      select parent_profile_id
      from public.parent_child_links
      where child_profile_id in (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
    )
    or exists (
      select 1
      from public.team_rosters tr
      where tr.player_id = target_profile_id
        and public.is_coach_of(tr.team_id)
    );
$$;

-- d. Políticas de actualización de estadísticas del partido
drop policy if exists match_stats_update_admin_coach on public.match_stats;
create policy match_stats_update_admin_coach
  on public.match_stats
  for update
  to authenticated
  using (
    public.is_admin()
    or (
      exists (
        select 1 from public.matches m
        where m.id = match_id and public.is_coach_of(m.team_id)
      )
      and validated_at is null
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.id = match_id and public.is_coach_of(m.team_id)
    )
  );

drop policy if exists match_stats_update_delegate on public.match_stats;
create policy match_stats_update_delegate
  on public.match_stats
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_delegate_of(m.team_id)
    )
    and validated_at is null
    and validated_by is null
  )
  with check (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_delegate_of(m.team_id)
    )
    and validated_at is null
    and validated_by is null
  );

-- e. Funciones y triggers para estadísticas de rivales
create or replace function public.recalculate_opponent_stats(p_season_id uuid, p_team_id uuid, p_opponent text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category text;
  v_matches_played smallint;
  v_wins smallint;
  v_draws smallint;
  v_losses smallint;
  v_goals_for smallint;
  v_goals_against smallint;
  v_last_match_at timestamptz;
begin
  select
    count(*)::smallint,
    coalesce(sum(case when final_score_us > final_score_them then 1 else 0 end), 0)::smallint,
    coalesce(sum(case when final_score_us = final_score_them then 1 else 0 end), 0)::smallint,
    coalesce(sum(case when final_score_us < final_score_them then 1 else 0 end), 0)::smallint,
    coalesce(sum(final_score_us), 0)::smallint,
    coalesce(sum(final_score_them), 0)::smallint,
    max(scheduled_at)
  into
    v_matches_played,
    v_wins,
    v_draws,
    v_losses,
    v_goals_for,
    v_goals_against,
    v_last_match_at
  from public.matches
  where season_id = p_season_id
    and team_id = p_team_id
    and opponent = p_opponent
    and status = 'played'
    and final_score_us is not null
    and final_score_them is not null;

  if v_matches_played = 0 then
    delete from public.opponent_stats
    where season_id = p_season_id
      and team_id = p_team_id
      and opponent = p_opponent;
  else
    select category_code into v_category from public.teams where id = p_team_id;

    insert into public.opponent_stats (
      season_id, team_id, opponent, category_code,
      matches_played, wins, draws, losses,
      goals_for, goals_against, last_match_at, updated_at
    )
    values (
      p_season_id, p_team_id, p_opponent, coalesce(v_category, 'unknown'),
      v_matches_played, v_wins, v_draws, v_losses,
      v_goals_for, v_goals_against, v_last_match_at, now()
    )
    on conflict (season_id, team_id, opponent) do update set
      category_code = excluded.category_code,
      matches_played = excluded.matches_played,
      wins = excluded.wins,
      draws = excluded.draws,
      losses = excluded.losses,
      goals_for = excluded.goals_for,
      goals_against = excluded.goals_against,
      last_match_at = excluded.last_match_at,
      updated_at = now();
  end if;
end;
$$;

create or replace function public.refresh_opponent_stats()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') then
    perform public.recalculate_opponent_stats(new.season_id, new.team_id, new.opponent);
  end if;

  if (tg_op = 'DELETE' or tg_op = 'UPDATE') then
    if tg_op = 'DELETE' or (
      old.season_id is distinct from new.season_id or
      old.team_id is distinct from new.team_id or
      old.opponent is distinct from new.opponent
    ) then
      perform public.recalculate_opponent_stats(old.season_id, old.team_id, old.opponent);
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists matches_refresh_opponent_stats on public.matches;
create trigger matches_refresh_opponent_stats
  after insert or update or delete on public.matches
  for each row execute function public.refresh_opponent_stats();


-- f. Sincronización automática de end_at en entrenamientos
create or replace function public.training_sessions_sync_end_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.end_at is null then
      new.end_at := new.scheduled_at + (new.duration_minutes || ' minutes')::interval;
    end if;
  elsif tg_op = 'UPDATE' then
    if (new.scheduled_at is distinct from old.scheduled_at or new.duration_minutes is distinct from old.duration_minutes) then
      if (new.end_at is null or new.end_at = old.end_at) then
        new.end_at := new.scheduled_at + (new.duration_minutes || ' minutes')::interval;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists training_sessions_sync_end_at_trg on public.training_sessions;
create trigger training_sessions_sync_end_at_trg
  before insert or update on public.training_sessions
  for each row execute function public.training_sessions_sync_end_at();


-- g. Índices para claves foráneas y rendimiento
create index if not exists training_sessions_block_id_idx on public.training_sessions(block_id);
create index if not exists match_callups_source_team_id_idx on public.match_callups(source_team_id);
create index if not exists notifications_related_match_id_idx on public.notifications(related_match_id);
create index if not exists notifications_related_training_session_id_idx on public.notifications(related_training_session_id);

drop index if exists public.opponent_stats_lookup_idx;


-- h. Restricción única en roles de usuario con NULLS NOT DISTINCT
alter table public.user_roles drop constraint if exists user_roles_unique;
alter table public.user_roles add constraint user_roles_unique unique nulls not distinct (profile_id, role, scope_team_id);
