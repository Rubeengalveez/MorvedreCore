create or replace function private.season_ranking_attendance(p_season_id uuid)
returns table (profile_id uuid, attended integer, total integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with eligible as (
    select distinct r.player_id, ts.id, coalesce(ts.joint_id,ts.id) as joint_id, ts.scheduled_at
    from public.training_sessions ts
    join public.teams t on t.id=ts.team_id
    join public.team_rosters r on r.team_id=ts.team_id
    where t.season_id=p_season_id and not ts.cancelled and ts.scheduled_at <= now()
      and (ts.player_ids is null or r.player_id=any(ts.player_ids))
      and r.joined_at <= (ts.scheduled_at at time zone 'Europe/Madrid')::date
      and (r.left_at is null or r.left_at >= (ts.scheduled_at at time zone 'Europe/Madrid')::date)
  ), sessions as (
    select e.player_id,e.joint_id,e.scheduled_at,
      coalesce((array_agg(a.present order by a.updated_at desc, e.id desc)
        filter (where a.player_id is not null))[1],true) as present
    from eligible e
    left join public.training_attendance a on a.session_id=e.id and a.player_id=e.player_id
    group by e.player_id,e.joint_id,e.scheduled_at
  )
  select player_id,count(*) filter (where present)::integer,count(*)::integer
  from sessions group by player_id;
$$;

revoke all on function private.season_ranking_attendance(uuid) from public, anon, authenticated;

with snapshots as (
  select s.id as season_id,r.*
  from public.seasons s
  cross join lateral private.season_ranking_attendance(s.id) r
  where s.archived_at is not null
)
update public.historical_player_stats h
set trainings_attended=r.attended,trainings_total=r.total,
  attendance_pct=round(100.0*r.attended/r.total,2)
from snapshots r
where h.profile_id=r.profile_id and h.season_id=r.season_id;
