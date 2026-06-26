create or replace function public.match_callups_protect_rsvp_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_is_privileged boolean;
begin
  if (
    new.cap_number is distinct from old.cap_number
    or new.source_team_id is distinct from old.source_team_id
  ) then
    select exists (
      select 1
      from public.matches m
      where m.id = new.match_id
        and (
          public.is_admin()
          or public.is_coach_of(m.team_id)
        )
    ) into actor_is_privileged;
    if not actor_is_privileged then
      raise exception 'No tienes permisos para modificar el dorsal o el equipo de origen de una convocatoria.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists match_callups_protect_rsvp_columns on public.match_callups;

create trigger match_callups_protect_rsvp_columns
  before update on public.match_callups
  for each row execute function public.match_callups_protect_rsvp_columns();

revoke execute on function public.match_callups_protect_rsvp_columns() from public;
grant execute on function public.match_callups_protect_rsvp_columns() to authenticated;
