-- 0026: Migration fixes for Milestone 1

-- a. Drop the permissive RLS policy profiles_select_authenticated on public.profiles table.
drop policy if exists profiles_select_authenticated on public.profiles;

-- b. Redefine the public.profiles_public view WITHOUT with (security_invoker = true)
-- Ensure you grant select on it to authenticated.
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

-- c. Update the public.can_see_profile_pii(target_profile_id uuid) function
-- to include checking if the current user auth.uid() is a coach of the target profile's team.
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

-- d. Modify update policies on public.match_stats
-- Ensure they check that the current row's validated_at (and validated_by for delegate) is null in the using clause
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

-- e. Redesign the public.refresh_opponent_stats() trigger function
-- First, helper function to recalculate for a specific (season_id, team_id, opponent)
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

-- Redesign refresh_opponent_stats trigger function to use the recalculate helper
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

-- Drop and recreate the trigger to run after insert or update or delete on public.matches
drop trigger if exists matches_refresh_opponent_stats on public.matches;
create trigger matches_refresh_opponent_stats
  after insert or update or delete on public.matches
  for each row execute function public.refresh_opponent_stats();

-- f. Correct the public.training_sessions_sync_end_at() function
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

-- Drop and recreate trigger to fire before insert or update on training_sessions
drop trigger if exists training_sessions_sync_end_at_trg on public.training_sessions;
create trigger training_sessions_sync_end_at_trg
  before insert or update on public.training_sessions
  for each row execute function public.training_sessions_sync_end_at();

-- g. Add indexes on foreign keys with cascade deletions:
create index if not exists training_sessions_block_id_idx on public.training_sessions(block_id);
create index if not exists match_callups_source_team_id_idx on public.match_callups(source_team_id);
create index if not exists notifications_related_match_id_idx on public.notifications(related_match_id);
create index if not exists notifications_related_training_session_id_idx on public.notifications(related_training_session_id);

-- h. Drop redundant index public.opponent_stats_lookup_idx
drop index if exists public.opponent_stats_lookup_idx;

-- i. Modify user_roles_unique constraint to use UNIQUE NULLS NOT DISTINCT
alter table public.user_roles drop constraint if exists user_roles_unique;
alter table public.user_roles add constraint user_roles_unique unique nulls not distinct (profile_id, role, scope_team_id);
