-- 0025: rachas
-- 5 tipos de rachas:
--   1. goals_consec: partidos seguidos marcando gol
--   2. excl_consec:  partidos seguidos con al menos 1 exclusion
--   3. train_consec: dias seguidos yendo a entrenar
--   4. mvp_consec:   partidos seguidos siendo MVP
--   5. wins_consec:  partidos ganados seguidos (por equipo)
--
-- subject_type = 'player' (4 primeros) o 'team' (wins_consec).
-- Cada (subject, streak_type) tiene su current_value y best_value (mejor historica).
-- best_at = cuando se alcanzo la mejor racha por primera vez.

create table public.streaks (
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

create index streaks_subject_idx on public.streaks (subject_type, subject_id);
create index streaks_season_idx on public.streaks (season_id, streak_type, current_value desc);

alter table public.streaks enable row level security;

create policy streaks_select_all
  on public.streaks
  for select
  to authenticated
  using (true);

-- Solo el sistema escribe (via service role o RPC). El admin no debe tocar a mano.
create policy streaks_admin_all
  on public.streaks
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
