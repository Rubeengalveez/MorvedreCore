create table public.opponent_stats (
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

create index opponent_stats_lookup_idx on public.opponent_stats (season_id, team_id, opponent);

alter table public.opponent_stats enable row level security;

create policy opponent_stats_select_all
  on public.opponent_stats
  for select
  to authenticated
  using (true);

create policy opponent_stats_admin_all
  on public.opponent_stats
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.refresh_opponent_stats()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category text;
begin
  if (tg_op = 'UPDATE' and old.status = 'played' and new.status = 'played'
      and old.final_score_us is not distinct from new.final_score_us
      and old.final_score_them is not distinct from new.final_score_them) then
    return new;
  end if;
  if new.status is distinct from 'played' then
    return new;
  end if;
  if new.final_score_us is null or new.final_score_them is null then
    return new;
  end if;

  select category_code into v_category from public.teams where id = new.team_id;

  insert into public.opponent_stats
    (season_id, team_id, opponent, category_code, matches_played, wins, draws, losses, goals_for, goals_against, last_match_at)
  values
    (new.season_id, new.team_id, new.opponent, coalesce(v_category, 'unknown'), 1,
     case when new.final_score_us > new.final_score_them then 1 else 0 end,
     case when new.final_score_us = new.final_score_them then 1 else 0 end,
     case when new.final_score_us < new.final_score_them then 1 else 0 end,
     new.final_score_us, new.final_score_them, new.scheduled_at)
  on conflict (season_id, team_id, opponent) do update set
    matches_played = public.opponent_stats.matches_played + 1,
    wins = public.opponent_stats.wins + (case when new.final_score_us > new.final_score_them then 1 else 0 end),
    draws = public.opponent_stats.draws + (case when new.final_score_us = new.final_score_them then 1 else 0 end),
    losses = public.opponent_stats.losses + (case when new.final_score_us < new.final_score_them then 1 else 0 end),
    goals_for = public.opponent_stats.goals_for + new.final_score_us,
    goals_against = public.opponent_stats.goals_against + new.final_score_them,
    last_match_at = greatest(public.opponent_stats.last_match_at, new.scheduled_at),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists matches_refresh_opponent_stats on public.matches;
create trigger matches_refresh_opponent_stats
  after insert or update of status, final_score_us, final_score_them on public.matches
  for each row execute function public.refresh_opponent_stats();
