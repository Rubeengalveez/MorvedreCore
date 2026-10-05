create or replace function public.register_admin_player(p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.teams;
  season public.seasons;
  created public.profiles;
  player_year integer := (p_input->>'birth_year')::integer;
  cap integer := (p_input->>'cap_number')::integer;
  age integer;
  category_index integer;
  team_index integer;
  has_template boolean;
begin
  if current_user <> 'service_role' then
    raise exception 'El alta solo puede realizarse desde el servidor.' using errcode = '42501';
  end if;
  if char_length(btrim(p_input->>'full_name')) not between 2 and 100
    or player_year is null or player_year < 1900 or player_year > extract(year from current_date)
    or (cap is not null and cap not between 1 and 14)
  then raise exception 'Revisa el nombre, el año de nacimiento y el gorro.'; end if;

  select * into target from public.teams where id = (p_input->>'team_id')::uuid for update;
  select * into season from public.seasons where id = target.season_id and is_current;
  if season.id is null then raise exception 'Selecciona un equipo de la temporada actual.'; end if;
  age := extract(year from season.start_date)::integer - player_year;
  category_index := case when age <= 9 then 0 when age <= 11 then 1 when age <= 13 then 2 when age <= 15 then 3 when age <= 17 then 4 else 5 end;
  team_index := array_position(array['benjamin','alevin','infantil','cadete','juvenil','absoluto'], target.category_code) - 1;
  if age < 0 or (target.category_code <> 'escuela' and (team_index is null or team_index < category_index or team_index > category_index + 1))
  then raise exception 'El año de nacimiento no encaja con ese equipo.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(regexp_replace(btrim(p_input->>'full_name'), '\s+', ' ', 'g')) || ':' || player_year, 0));
  if exists (select 1 from public.profiles p join public.user_roles r on r.profile_id = p.id and r.role = 'player'
    where lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(p_input->>'full_name'), '\s+', ' ', 'g')) and p.birth_year = player_year)
  then raise exception 'Ya existe un jugador con ese nombre y año. Busca su ficha antes de registrarlo de nuevo.'; end if;
  has_template := exists (select 1 from public.team_callup_templates where team_id = target.id);
  if cap is not null and (
    exists (select 1 from public.team_callup_templates where team_id = target.id and cap_number = cap)
    or (not has_template and exists (select 1 from public.team_rosters where team_id = target.id and left_at is null and squad_number = cap)))
  then raise exception 'Ese gorro ya está asignado. Elige otro o deja al jugador sin gorro.'; end if;
  if cap is not null and has_template and (select count(*) from public.team_callup_templates where team_id = target.id) >= 14
  then raise exception 'La convocatoria por defecto ya tiene 14 jugadores. Regístralo sin gorro y revisa la convocatoria en Equipos.'; end if;

  insert into public.profiles (full_name, birth_year, gender, cap_number, phone_e164, email_contact,
    photo_url, team_color, school_enrolled, school_payment_paid, must_change_password, license_active, is_active, notes)
  values (btrim(p_input->>'full_name'), player_year, coalesce(p_input->>'gender', 'prefer_not_to_say'), cap,
    p_input->>'phone_e164', p_input->>'email_contact', p_input->>'photo_url', p_input->>'team_color',
    coalesce((p_input->>'school_enrolled')::boolean,false), coalesce((p_input->>'school_payment_paid')::boolean,false),
    false,true,true,p_input->>'notes')
  returning * into created;
  insert into public.team_rosters (team_id,player_id,squad_number) values (target.id,created.id,cap);
  insert into public.user_roles (profile_id,role,scope_team_id) values (created.id,'player',null);
  if cap is not null and has_template then
    insert into public.team_callup_templates (team_id,player_id,cap_number) values (target.id,created.id,cap);
  end if;
  return to_jsonb(created);
end;
$$;
revoke all on function public.register_admin_player(jsonb) from public, anon, authenticated;
grant execute on function public.register_admin_player(jsonb) to service_role;

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
      when extract(year from v_source.start_date)::integer - p.birth_year <= 9 then 'benjamin'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 11 then 'alevin'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 13 then 'infantil'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 15 then 'cadete'
      when extract(year from v_source.start_date)::integer - p.birth_year <= 17 then 'juvenil'
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
        when v_start_year - p.birth_year <= 9 then 'benjamin'
        when v_start_year - p.birth_year <= 11 then 'alevin'
        when v_start_year - p.birth_year <= 13 then 'infantil'
        when v_start_year - p.birth_year <= 15 then 'cadete'
        when v_start_year - p.birth_year <= 17 then 'juvenil'
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

update public.ranking_snapshots r
set scope_key = case
  when extract(year from s.start_date)::integer - p.birth_year <= 9 then 'benjamin'
  when extract(year from s.start_date)::integer - p.birth_year <= 11 then 'alevin'
  when extract(year from s.start_date)::integer - p.birth_year <= 13 then 'infantil'
  when extract(year from s.start_date)::integer - p.birth_year <= 15 then 'cadete'
  when extract(year from s.start_date)::integer - p.birth_year <= 17 then 'juvenil'
  else 'absoluto'
end
from public.profiles p, public.seasons s
where r.player_id = p.id and r.season_id = s.id and r.scope = 'category'
  and r.scope_key <> 'escuela' and p.birth_year is not null
  and p.birth_year <= extract(year from s.start_date)::integer;
