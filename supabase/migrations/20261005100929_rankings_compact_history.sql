alter table public.historical_player_stats
  add column ranking_totals jsonb check (ranking_totals is null or jsonb_typeof(ranking_totals) = 'object');

create or replace function private.season_ranking_totals(p_season_id uuid)
returns table (profile_id uuid, totals jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  with sheets as materialized (
    select l.match_id, l.document
    from public.live_match_sheets l
    join public.matches m on m.id = l.match_id
    where m.season_id = p_season_id and m.status = 'played'
      and l.document->>'phase' = 'finished'
  ), players as (
    select s.match_id, s.document, (p->>'id')::uuid as player_id, (p->>'cap')::integer as cap
    from sheets s
    cross join lateral jsonb_array_elements(s.document->'players') p
  ), full_records as (
    select p.match_id, p.player_id,
      coalesce(b.goals, 0) + e.goals + t.goals as goals,
      coalesce(b.exclusions, 0) + e.exclusions as exclusions,
      e.assists, e.goals + t.goals as shot_goals,
      e.goals + e.misses + t.shots as shots,
      e.saves + t.saves as saves, e.conceded + t.conceded as conceded,
      true as advanced, false as manual_mvp
    from players p
    cross join lateral (
      select sum((b->>'goals')::integer)::integer as goals,
        sum((b->>'exclusions')::integer)::integer as exclusions
      from jsonb_array_elements(coalesce(p.document->'baseline', '[]'::jsonb)) b
      where case when b->>'playerId' is not null then b->>'playerId' = p.player_id::text
        else (b->>'cap')::integer = p.cap end
    ) b
    cross join lateral (
      select
        count(*) filter (where own and kind in ('goal','goal_extra','goal_penalty'))::integer as goals,
        count(*) filter (where own and kind in ('exclusion','penalty'))::integer as exclusions,
        count(*) filter (where own and kind = 'assist')::integer as assists,
        count(*) filter (where own and kind in ('shot_out','shot_saved','shot_blocked','shot_corner','penalty_missed'))::integer as misses,
        count(*) filter (where own and kind in ('save','penalty_save'))::integer as saves,
        count(*) filter (where keeper and kind in ('goal','goal_extra','goal_penalty'))::integer as conceded
      from (
        select e->>'kind' as kind,
          e->>'side' = 'us' and case when e->>'playerId' is not null
            then e->>'playerId' = p.player_id::text else (e->>'cap')::integer = p.cap end as own,
          e->>'side' = 'them' and case when e->>'keeperId' is not null
            then e->>'keeperId' = p.player_id::text else (e->>'keeper')::integer = p.cap end as keeper
        from jsonb_array_elements(coalesce(p.document->'events', '[]'::jsonb)) e
        where not coalesce((e->>'deleted')::boolean, false)
      ) events
    ) e
    cross join lateral (
      select count(*) filter (where own and outcome = 'goal')::integer as goals,
        count(*) filter (where own)::integer as shots,
        count(*) filter (where keeper and outcome = 'save')::integer as saves,
        count(*) filter (where keeper and outcome = 'goal')::integer as conceded
      from (
        select s->>'outcome' as outcome,
          s->>'side' = 'us' and case when s->>'playerId' is not null
            then s->>'playerId' = p.player_id::text else (s->>'cap')::integer = p.cap end as own,
          s->>'side' = 'them' and case when s->>'keeperId' is not null
            then s->>'keeperId' = p.player_id::text else (s->>'keeper')::integer = p.cap end as keeper
        from jsonb_array_elements(coalesce(p.document->'shootout'->'shots', '[]'::jsonb)) s
      ) shots
    ) t
  ), all_records as (
    select * from full_records
    union all
    select ms.match_id, ms.player_id, ms.goals, ms.exclusions,
      0, 0, 0, 0, 0, false, ms.mvp
    from public.match_stats ms
    join public.matches m on m.id = ms.match_id
    where m.season_id = p_season_id and m.status = 'played'
      and not exists (select 1 from public.live_match_sheets l where l.match_id = m.id)
  ), ranked as (
    select r.*, rank() over (partition by match_id order by goals + assists desc, exclusions asc) as mvp_rank
    from all_records r
  )
  select player_id,
    jsonb_build_object(
      'version', 1,
      'matches', count(*), 'goals', sum(goals), 'exclusions', sum(exclusions),
      'mvp', count(*) filter (where case when advanced then goals + assists > 0 and mvp_rank = 1 else manual_mvp end),
      'assists', sum(assists), 'shotGoals', sum(shot_goals), 'shots', sum(shots),
      'saves', sum(saves), 'conceded', sum(conceded),
      'advancedMatches', count(*) filter (where advanced)
    )
  from ranked
  group by player_id;
$$;

revoke all on function private.season_ranking_totals(uuid) from public, anon, authenticated;

create or replace function private.capture_ranking_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  with snapshots as materialized (
    select s.season_id, r.profile_id, r.totals
    from (select distinct season_id from inserted_rankings) s
    cross join lateral private.season_ranking_totals(s.season_id) r
  )
  update public.historical_player_stats h
  set ranking_totals = r.totals,
      matches_played = (r.totals->>'matches')::integer,
      goals = (r.totals->>'goals')::integer,
      exclusions = (r.totals->>'exclusions')::integer,
      mvp_count = (r.totals->>'mvp')::integer
  from snapshots r
  where h.season_id = r.season_id and h.profile_id = r.profile_id
    and exists (select 1 from inserted_rankings i where i.season_id=h.season_id and i.profile_id=h.profile_id);
  return null;
end;
$$;

revoke all on function private.capture_ranking_history() from public, anon, authenticated;

create trigger capture_ranking_history
after insert on public.historical_player_stats
referencing new table as inserted_rankings
for each statement execute function private.capture_ranking_history();

with snapshots as (
  select s.id as season_id, r.profile_id, r.totals
  from public.seasons s
  cross join lateral private.season_ranking_totals(s.id) r
  where s.archived_at is not null
)
update public.historical_player_stats h
set ranking_totals = r.totals,
    matches_played = (r.totals->>'matches')::integer,
    goals = (r.totals->>'goals')::integer,
    exclusions = (r.totals->>'exclusions')::integer,
    mvp_count = (r.totals->>'mvp')::integer
from snapshots r
where h.season_id = r.season_id and h.profile_id = r.profile_id;
