create or replace function public.match_callups_protect_rsvp_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_is_privileged boolean;
begin
  if new.match_id is distinct from old.match_id or new.player_id is distinct from old.player_id then
    raise exception 'No puedes cambiar la identidad de una convocatoria.'
      using errcode = '42501';
  end if;

  actor_is_privileged := current_user in ('postgres', 'service_role') or exists (
    select 1
    from public.matches as match
    where match.id = new.match_id
      and (
        public.is_admin()
        or public.is_coach_of(match.team_id)
      )
  );

  if not actor_is_privileged then
    if new.cap_number is distinct from old.cap_number
      or new.source_team_id is distinct from old.source_team_id then
      raise exception 'No tienes permisos para modificar el dorsal o el equipo de origen de una convocatoria.'
        using errcode = '42501';
    end if;

    if new.status not in ('confirmed', 'declined', 'withdrawn') then
      raise exception 'La respuesta de una convocatoria no admite ese estado.'
        using errcode = '42501';
    end if;

    new.confirmed_at := case
      when new.status = 'confirmed' then now()
      else null
    end;
  end if;

  return new;
end;
$$;

revoke execute on function public.match_callups_protect_rsvp_columns() from public;
grant execute on function public.match_callups_protect_rsvp_columns() to authenticated;
