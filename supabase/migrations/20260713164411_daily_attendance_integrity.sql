alter table public.training_attendance
  add constraint training_attendance_reason_length_check
  check (reason is null or char_length(reason) <= 500) not valid;

alter table public.training_attendance
  validate constraint training_attendance_reason_length_check;

create or replace function public.enforce_training_attendance_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid;
  session_team_id uuid;
  session_date date;
begin
  select
    training_sessions.team_id,
    (training_sessions.scheduled_at at time zone 'Europe/Madrid')::date
  into session_team_id, session_date
  from public.training_sessions
  where training_sessions.id = new.session_id;

  if session_team_id is null then
    raise exception 'La sesión de entrenamiento no existe.' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.team_rosters
    where team_rosters.team_id = session_team_id
      and team_rosters.player_id = new.player_id
      and team_rosters.joined_at <= session_date
      and (team_rosters.left_at is null or team_rosters.left_at >= session_date)
  ) then
    raise exception 'El jugador no pertenecía a la plantilla en la fecha del entrenamiento.'
      using errcode = '23514';
  end if;

  if (select auth.uid()) is not null then
    select profiles.id
    into actor_id
    from public.profiles
    where profiles.auth_user_id = (select auth.uid());

    if actor_id is null then
      raise exception 'No existe un perfil para la persona autenticada.' using errcode = '23503';
    end if;

    new.marked_by := actor_id;
    new.marked_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists training_attendance_enforce_integrity on public.training_attendance;

create trigger training_attendance_enforce_integrity
  before insert or update on public.training_attendance
  for each row execute function public.enforce_training_attendance_integrity();

revoke all on function public.enforce_training_attendance_integrity() from public, anon, authenticated;
