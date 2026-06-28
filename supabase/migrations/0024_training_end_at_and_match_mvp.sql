-- 0024: end_at para training_sessions + columna mvp_player_id en matches
-- Los entrenamientos tienen hora de inicio (scheduled_at) y hora de fin (end_at).
-- Tambien se anade match.mvp_player_id para registrar el MVP computado.

alter table public.training_sessions
  add column if not exists end_at timestamptz;

-- Backfill: end_at = scheduled_at + duration_minutes
update public.training_sessions
  set end_at = scheduled_at + (duration_minutes || ' minutes')::interval
  where end_at is null;

-- Trigger: mantener end_at sincronizado con scheduled_at + duration_minutes
-- Si alguien inserta o actualiza con un end_at custom, lo respetamos.
create or replace function public.training_sessions_sync_end_at()
returns trigger
language plpgsql
as $$
begin
  if new.end_at is null then
    new.end_at := new.scheduled_at + (new.duration_minutes || ' minutes')::interval;
  end if;
  return new;
end;
$$;

drop trigger if exists training_sessions_sync_end_at_trg on public.training_sessions;
create trigger training_sessions_sync_end_at_trg
  before insert or update of scheduled_at, duration_minutes on public.training_sessions
  for each row execute function public.training_sessions_sync_end_at();

create index if not exists training_sessions_end_at_idx on public.training_sessions (end_at);

-- En matches anadimos mvp_player_id para registrar el MVP computado del partido.
-- Se calcula en el server action cuando se valida el acta.
alter table public.matches
  add column if not exists mvp_player_id uuid references public.profiles(id) on delete set null;

create index if not exists matches_mvp_player_id_idx on public.matches (mvp_player_id);
