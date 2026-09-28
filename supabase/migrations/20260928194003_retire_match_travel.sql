create table if not exists private.retired_match_travel_archive (
  id integer primary key check (id = 1),
  archived_at timestamptz not null default now(),
  offers jsonb not null,
  reservations jsonb not null,
  companions jsonb not null,
  match_settings jsonb not null
);

alter table private.retired_match_travel_archive enable row level security;
revoke all on private.retired_match_travel_archive from public, anon, authenticated;
grant select on private.retired_match_travel_archive to service_role;

insert into private.retired_match_travel_archive (
  id, offers, reservations, companions, match_settings
)
select 1,
  coalesce((select jsonb_agg(to_jsonb(item)) from public.travel_offers item), '[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(item)) from public.travel_reservations item), '[]'::jsonb),
  coalesce((select jsonb_agg(to_jsonb(item)) from public.travel_companions item), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object(
    'id', item.id,
    'logistics_enabled', item.logistics_enabled,
    'travel_meeting_point', item.travel_meeting_point,
    'travel_compensation_cents', item.travel_compensation_cents
  )) from public.matches item), '[]'::jsonb)
on conflict (id) do nothing;

drop table if exists public.travel_companions;
drop table if exists public.travel_reservations;
drop table if exists public.travel_offers;

drop function if exists public.reserve_travel_seat(uuid, uuid);
drop function if exists public.validate_travel_companion();
drop function if exists public.validate_travel_reservation();
drop function if exists public.sync_travel_seats_taken();
drop function if exists private.protect_travel_companion_identity();

alter table public.matches
  drop column if exists travel_meeting_point,
  drop column if exists travel_compensation_cents,
  drop column if exists logistics_enabled;
