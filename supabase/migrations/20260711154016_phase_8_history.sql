create schema if not exists private;

create table public.historical_player_stats (
  profile_id uuid not null references public.profiles(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  profile_name text not null,
  category_code text not null check (category_code in (
    'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'absoluto', 'escuela'
  )),
  team_label text not null,
  matches_played integer not null default 0 check (matches_played >= 0),
  matches_called integer not null default 0 check (matches_called >= 0),
  goals integer not null default 0 check (goals >= 0),
  exclusions integer not null default 0 check (exclusions >= 0),
  trainings_attended integer not null default 0 check (trainings_attended >= 0),
  trainings_total integer not null default 0 check (trainings_total >= 0),
  attendance_pct numeric(5,2) not null default 0 check (attendance_pct between 0 and 100),
  mvp_count integer not null default 0 check (mvp_count >= 0),
  archived_at timestamptz not null default now(),
  primary key (profile_id, season_id)
);

create index historical_player_stats_season_idx
  on public.historical_player_stats (season_id);
create index historical_player_stats_goals_idx
  on public.historical_player_stats (goals desc, profile_id);
create index historical_player_stats_matches_idx
  on public.historical_player_stats (matches_played desc, profile_id);
create index historical_player_stats_mvp_idx
  on public.historical_player_stats (mvp_count desc, profile_id);
create index historical_player_stats_attendance_idx
  on public.historical_player_stats (attendance_pct desc, trainings_total desc, profile_id);

alter table public.historical_player_stats enable row level security;

create policy historical_player_stats_select_authenticated
  on public.historical_player_stats
  for select
  to authenticated
  using (true);

create table public.historical_team_matchups (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  team_label text not null,
  category_code text not null check (category_code in (
    'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'absoluto', 'escuela'
  )),
  opponent text not null,
  opponent_key text not null,
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  goals_for integer not null default 0 check (goals_for >= 0),
  goals_against integer not null default 0 check (goals_against >= 0),
  last_match_at timestamptz,
  archived_at timestamptz not null default now(),
  unique (season_id, team_id, opponent_key)
);

create index historical_team_matchups_season_idx
  on public.historical_team_matchups (season_id);
create index historical_team_matchups_opponent_idx
  on public.historical_team_matchups (opponent_key, matches_played desc);
create index historical_team_matchups_team_idx
  on public.historical_team_matchups (team_id);

alter table public.historical_team_matchups enable row level security;

create policy historical_team_matchups_select_authenticated
  on public.historical_team_matchups
  for select
  to authenticated
  using (true);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'archive_season')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_table_row_idx on public.audit_log (table_name, row_id, created_at desc);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy audit_log_select_admin
  on public.audit_log
  for select
  to authenticated
  using ((select public.is_admin()));

create or replace function private.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_row_id uuid;
begin
  select p.id
  into v_actor_id
  from public.profiles p
  where p.auth_user_id = (select auth.uid());

  if tg_op = 'DELETE' then
    v_row_id := nullif(to_jsonb(old) ->> tg_argv[0], '')::uuid;
  else
    v_row_id := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  end if;

  insert into public.audit_log (actor_id, table_name, row_id, action, before_data, after_data)
  values (
    v_actor_id,
    tg_table_name,
    v_row_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function private.audit_sensitive_change() from public, anon, authenticated;

create or replace function private.protect_archived_season()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.archived_at is not null then
    raise exception 'Una temporada archivada es inmutable.' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_archived_season() from public, anon, authenticated;

create trigger protect_archived_season_changes
  before update or delete on public.seasons
  for each row execute function private.protect_archived_season();

create trigger audit_user_roles_changes
  after insert or update or delete on public.user_roles
  for each row execute function private.audit_sensitive_change('profile_id');

create trigger audit_profiles_changes
  after insert or update or delete on public.profiles
  for each row execute function private.audit_sensitive_change('id');

create trigger audit_seasons_changes
  after insert or update or delete on public.seasons
  for each row execute function private.audit_sensitive_change('id');

create trigger audit_treasury_closures_changes
  after insert or update or delete on public.treasury_period_closures
  for each row execute function private.audit_sensitive_change('id');

create or replace function public.archive_season(
  p_season_id uuid,
  p_new_label text,
  p_new_start_date date,
  p_new_end_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_source public.seasons%rowtype;
  v_new_season_id uuid;
  v_start_year integer;
  v_player_count integer;
  v_matchup_count integer;
  v_team_count integer;
  v_roster_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('morvedre:archive-season', 0));

  if not (select public.is_admin()) then
    raise exception 'No tienes permisos de administrador.' using errcode = '42501';
  end if;

  if p_new_label is null or length(btrim(p_new_label)) < 3 then
    raise exception 'La etiqueta de la nueva temporada no es válida.' using errcode = '22023';
  end if;

  if p_new_end_date <= p_new_start_date then
    raise exception 'La fecha de fin debe ser posterior a la fecha de inicio.' using errcode = '22023';
  end if;

  select *
  into v_source
  from public.seasons
  where id = p_season_id
  for update;

  if not found then
    raise exception 'La temporada no existe.' using errcode = 'P0002';
  end if;

  if v_source.archived_at is not null then
    raise exception 'La temporada ya está archivada.' using errcode = '23505';
  end if;

  if not v_source.is_current then
    raise exception 'Solo puedes cerrar la temporada actual.' using errcode = '22023';
  end if;

  if p_new_start_date <= v_source.end_date then
    raise exception 'La nueva temporada debe comenzar después de que termine la temporada actual.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.seasons s
    where lower(btrim(s.label)) = lower(btrim(p_new_label))
  ) then
    raise exception 'Ya existe una temporada con ese nombre.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.matches m
    where m.season_id = p_season_id
      and m.status in ('scheduled', 'in_progress', 'postponed')
  ) then
    raise exception 'Todavía hay partidos pendientes. Juégalos o cancélalos antes de cerrar la temporada.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.matches m
    where m.season_id = p_season_id
      and m.status = 'played'
      and (m.final_score_us is null or m.final_score_them is null)
  ) then
    raise exception 'Hay partidos jugados sin resultado final.' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.match_stats ms
    join public.matches m on m.id = ms.match_id
    where m.season_id = p_season_id
      and m.status = 'played'
      and ms.validated_at is null
  ) then
    raise exception 'Hay actas de partido pendientes de validar.' using errcode = '23514';
  end if;

  select p.id
  into v_actor_id
  from public.profiles p
  where p.auth_user_id = (select auth.uid());

  v_start_year := extract(year from p_new_start_date)::integer;

  with roster_players as (
    select tr.player_id
    from public.team_rosters tr
    join public.teams t on t.id = tr.team_id
    where t.season_id = p_season_id
    union
    select mc.player_id
    from public.match_callups mc
    join public.matches m on m.id = mc.match_id
    where m.season_id = p_season_id
  ),
  team_labels as (
    select
      tr.player_id,
      string_agg(distinct t.label, ', ' order by t.label) as labels
    from public.team_rosters tr
    join public.teams t on t.id = tr.team_id
    where t.season_id = p_season_id
    group by tr.player_id
  ),
  callup_totals as (
    select mc.player_id, count(*)::integer as matches_called
    from public.match_callups mc
    join public.matches m on m.id = mc.match_id
    where m.season_id = p_season_id
    group by mc.player_id
  ),
  stat_totals as (
    select
      ms.player_id,
      count(*)::integer as matches_played,
      coalesce(sum(ms.goals), 0)::integer as goals,
      coalesce(sum(ms.exclusions), 0)::integer as exclusions,
      count(*) filter (where ms.mvp)::integer as mvp_count
    from public.match_stats ms
    join public.matches m on m.id = ms.match_id
    where m.season_id = p_season_id
      and m.status = 'played'
      and ms.validated_at is not null
    group by ms.player_id
  ),
  attendance_totals as (
    select
      ta.player_id,
      count(*) filter (where ta.present)::integer as trainings_attended,
      count(*)::integer as trainings_total
    from public.training_attendance ta
    join public.training_sessions ts on ts.id = ta.session_id
    join public.teams t on t.id = ts.team_id
    where t.season_id = p_season_id
      and not ts.cancelled
    group by ta.player_id
  )
  insert into public.historical_player_stats (
    profile_id,
    season_id,
    profile_name,
    category_code,
    team_label,
    matches_played,
    matches_called,
    goals,
    exclusions,
    trainings_attended,
    trainings_total,
    attendance_pct,
    mvp_count
  )
  select
    p.id,
    p_season_id,
    p.full_name,
    case
      when extract(year from v_source.start_date)::integer - p.birth_year <= 11 then 'benjamin'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 13 then 'alevin'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 15 then 'infantil'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 17 then 'cadete'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 19 then 'juvenil'
      else 'absoluto'
    end,
    coalesce(tl.labels, 'Sin equipo'),
    coalesce(st.matches_played, 0),
    coalesce(ct.matches_called, 0),
    coalesce(st.goals, 0),
    coalesce(st.exclusions, 0),
    coalesce(at.trainings_attended, 0),
    coalesce(at.trainings_total, 0),
    case
      when coalesce(at.trainings_total, 0) = 0 then 0
      else round(at.trainings_attended::numeric * 100 / at.trainings_total, 2)
    end,
    coalesce(st.mvp_count, 0)
  from roster_players rp
  join public.profiles p on p.id = rp.player_id
  left join team_labels tl on tl.player_id = p.id
  left join callup_totals ct on ct.player_id = p.id
  left join stat_totals st on st.player_id = p.id
  left join attendance_totals at on at.player_id = p.id
  where p.birth_year is not null;

  get diagnostics v_player_count = row_count;

  insert into public.historical_team_matchups (
    season_id,
    team_id,
    team_label,
    category_code,
    opponent,
    opponent_key,
    matches_played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    last_match_at
  )
  select
    p_season_id,
    t.id,
    t.label,
    t.category_code,
    min(btrim(m.opponent)),
    lower(regexp_replace(btrim(m.opponent), '\s+', ' ', 'g')),
    count(*)::integer,
    count(*) filter (where m.final_score_us > m.final_score_them)::integer,
    count(*) filter (where m.final_score_us = m.final_score_them)::integer,
    count(*) filter (where m.final_score_us < m.final_score_them)::integer,
    sum(m.final_score_us)::integer,
    sum(m.final_score_them)::integer,
    max(m.scheduled_at)
  from public.matches m
  join public.teams t on t.id = m.team_id
  where m.season_id = p_season_id
    and m.status = 'played'
    and m.final_score_us is not null
    and m.final_score_them is not null
  group by t.id, t.label, t.category_code, lower(regexp_replace(btrim(m.opponent), '\s+', ' ', 'g'));

  get diagnostics v_matchup_count = row_count;

  insert into public.seasons (label, start_date, end_date, is_current)
  values (btrim(p_new_label), p_new_start_date, p_new_end_date, false)
  returning id into v_new_season_id;

  create temporary table phase8_team_map (
    old_team_id uuid primary key,
    new_team_id uuid not null
  ) on commit drop;

  with created as (
    insert into public.teams (
      season_id, category_code, label, gender, team_type, color, home_pool, notes
    )
    select
      v_new_season_id, category_code, label, gender, team_type, color, home_pool, notes
    from public.teams
    where season_id = p_season_id
    order by label
    returning id, label
  )
  insert into pg_temp.phase8_team_map (old_team_id, new_team_id)
  select old_team.id, created.id
  from public.teams old_team
  join created on created.label = old_team.label
  where old_team.season_id = p_season_id;

  select count(*) into v_team_count from pg_temp.phase8_team_map;

  insert into public.team_staff (team_id, profile_id, role, granted_by, granted_at)
  select tm.new_team_id, ts.profile_id, ts.role, coalesce(v_actor_id, ts.granted_by), now()
  from public.team_staff ts
  join pg_temp.phase8_team_map tm on tm.old_team_id = ts.team_id;

  insert into public.user_roles (profile_id, role, scope_team_id, granted_by, granted_at)
  select ur.profile_id, ur.role, tm.new_team_id, coalesce(v_actor_id, ur.granted_by), now()
  from public.user_roles ur
  join pg_temp.phase8_team_map tm on tm.old_team_id = ur.scope_team_id
  on conflict (profile_id, role, scope_team_id) do nothing;

  insert into public.team_rosters (team_id, player_id, squad_number, joined_at)
  select
    tm.new_team_id,
    tr.player_id,
    tr.squad_number,
    p_new_start_date
  from public.team_rosters tr
  join pg_temp.phase8_team_map tm on tm.old_team_id = tr.team_id
  join public.teams nt on nt.id = tm.new_team_id
  join public.profiles p on p.id = tr.player_id
  where tr.left_at is null
    and p.birth_year is not null
    and p.birth_year <= v_start_year
    and (
      nt.team_type = 'school'
      or nt.category_code = case
        when v_start_year - p.birth_year <= 11 then 'benjamin'
        when v_start_year - p.birth_year <= 13 then 'alevin'
        when v_start_year - p.birth_year <= 15 then 'infantil'
        when v_start_year - p.birth_year <= 17 then 'cadete'
        when v_start_year - p.birth_year <= 19 then 'juvenil'
        else 'absoluto'
      end
    );

  get diagnostics v_roster_count = row_count;

  update public.seasons
  set is_current = false, archived_at = now()
  where id = p_season_id;

  update public.seasons
  set is_current = true
  where id = v_new_season_id;

  insert into public.audit_log (actor_id, table_name, row_id, action, before_data, after_data)
  values (
    v_actor_id,
    'seasons',
    p_season_id,
    'archive_season',
    to_jsonb(v_source),
    jsonb_build_object(
      'archived_season_id', p_season_id,
      'new_season_id', v_new_season_id,
      'historical_players', v_player_count,
      'historical_matchups', v_matchup_count,
      'teams_created', v_team_count,
      'rosters_carried', v_roster_count
    )
  );

  return jsonb_build_object(
    'new_season_id', v_new_season_id,
    'historical_players', v_player_count,
    'historical_matchups', v_matchup_count,
    'teams_created', v_team_count,
    'rosters_carried', v_roster_count
  );
end;
$$;

revoke execute on function public.archive_season(uuid, text, date, date) from public, anon;
grant execute on function public.archive_season(uuid, text, date, date) to authenticated;

grant select on public.historical_player_stats to authenticated;
grant select on public.historical_team_matchups to authenticated;
grant select on public.audit_log to authenticated;
