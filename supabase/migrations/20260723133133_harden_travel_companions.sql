delete from public.travel_companions
where btrim(full_name) = '';

with ranked_companions as (
  select
    id,
    row_number() over (
      partition by reservation_offer_id, reservation_player_id, lower(btrim(full_name))
      order by created_at, id
    ) as duplicate_position
  from public.travel_companions
  where cancelled_at is null
)
delete from public.travel_companions as companion
using ranked_companions as ranked
where companion.id = ranked.id
  and ranked.duplicate_position > 1;

update public.travel_companions
set
  offer_id = reservation_offer_id,
  full_name = btrim(full_name)
where offer_id is distinct from reservation_offer_id
  or full_name is distinct from btrim(full_name);

alter table public.travel_companions
  add constraint travel_companions_offer_matches_reservation
  check (offer_id = reservation_offer_id);

alter table public.travel_companions
  add constraint travel_companions_full_name_normalized
  check (full_name = btrim(full_name) and full_name ~ '[^[:space:]]');

create or replace function private.protect_travel_companion_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.offer_id is distinct from old.offer_id
    or new.reservation_offer_id is distinct from old.reservation_offer_id
    or new.reservation_player_id is distinct from old.reservation_player_id then
    raise exception 'No se puede mover un acompañante a otra reserva.';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_travel_companion_identity()
  from public, anon, authenticated;
grant execute on function private.protect_travel_companion_identity() to service_role;

create trigger travel_companions_protect_identity
  before update on public.travel_companions
  for each row execute function private.protect_travel_companion_identity();

revoke all on function public.sync_travel_seats_taken() from public, anon, authenticated;
revoke all on function public.validate_travel_companion() from public, anon, authenticated;
grant execute on function public.sync_travel_seats_taken() to service_role;
grant execute on function public.validate_travel_companion() to service_role;

grant all on table public.travel_companions to service_role;
