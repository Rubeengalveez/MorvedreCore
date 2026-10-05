create or replace function private.season_ranking_attendance(p_season_id uuid)
returns table (profile_id uuid, attended integer, total integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with sessions as (
    select ta.player_id, coalesce(ts.joint_id,ts.id) as joint_id, ts.scheduled_at,
      bool_or(ta.present) as present
    from public.training_attendance ta
    join public.training_sessions ts on ts.id=ta.session_id
    join public.teams t on t.id=ts.team_id
    where t.season_id=p_season_id and not ts.cancelled and ts.scheduled_at <= now()
      and (ts.player_ids is null or ta.player_id=any(ts.player_ids))
      and exists (
        select 1 from public.team_rosters r
        where r.team_id=ts.team_id and r.player_id=ta.player_id
          and r.joined_at <= (ts.scheduled_at at time zone 'Europe/Madrid')::date
          and (r.left_at is null or r.left_at >= (ts.scheduled_at at time zone 'Europe/Madrid')::date)
      )
    group by ta.player_id, coalesce(ts.joint_id,ts.id), ts.scheduled_at
  )
  select player_id, count(*) filter (where present)::integer, count(*)::integer
  from sessions group by player_id;
$$;

revoke all on function private.season_ranking_attendance(uuid) from public, anon, authenticated;

create or replace function private.capture_ranking_attendance_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  with snapshots as materialized (
    select s.season_id, r.*
    from (select distinct season_id from inserted_attendance) s
    cross join lateral private.season_ranking_attendance(s.season_id) r
  )
  update public.historical_player_stats h
  set trainings_attended=r.attended, trainings_total=r.total,
    attendance_pct=round(100.0*r.attended/r.total,2)
  from snapshots r
  where h.profile_id=r.profile_id and h.season_id=r.season_id
    and exists (select 1 from inserted_attendance i where i.profile_id=h.profile_id and i.season_id=h.season_id);
  return null;
end;
$$;

revoke all on function private.capture_ranking_attendance_history() from public, anon, authenticated;

create trigger capture_ranking_attendance_history
after insert on public.historical_player_stats
referencing new table as inserted_attendance
for each statement execute function private.capture_ranking_attendance_history();

with snapshots as (
  select s.id as season_id, r.*
  from public.seasons s
  cross join lateral private.season_ranking_attendance(s.id) r
  where s.archived_at is not null
)
update public.historical_player_stats h
set trainings_attended=r.attended, trainings_total=r.total,
  attendance_pct=round(100.0*r.attended/r.total,2)
from snapshots r
where h.profile_id=r.profile_id and h.season_id=r.season_id;
