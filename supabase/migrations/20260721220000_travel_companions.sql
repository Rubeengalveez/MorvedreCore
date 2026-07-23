-- Compañantes de viaje
-- Permite que un jugador inscrito lleve acompañantes (ej: un padre/madre)
-- Cada acompañante ocupa una plaza adicional en el coche.

create table public.travel_companions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.travel_offers(id) on delete cascade,
  reservation_offer_id uuid not null,
  reservation_player_id uuid not null,
  full_name text not null check (char_length(full_name) between 1 and 80),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (reservation_offer_id, reservation_player_id)
    references public.travel_reservations(offer_id, player_id) on delete cascade
);

create index travel_companions_offer_id_idx on public.travel_companions (offer_id);
create index travel_companions_reservation_idx on public.travel_companions (reservation_offer_id, reservation_player_id);
create unique index travel_companions_unique_active
  on public.travel_companions (reservation_offer_id, reservation_player_id, lower(full_name))
  where cancelled_at is null;

-- Actualizar el sync de plazas para incluir acompañantes
create or replace function public.sync_travel_seats_taken()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_offer_id uuid;
begin
  target_offer_id := coalesce(new.offer_id, old.offer_id);

  update public.travel_offers
  set seats_taken = (
    select (
      select count(*)::smallint
      from public.travel_reservations
      where offer_id = target_offer_id
        and cancelled_at is null
    ) + (
      select count(*)::smallint
      from public.travel_companions
      where offer_id = target_offer_id
        and cancelled_at is null
    )
  )
  where id = target_offer_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists travel_reservations_sync_seats on public.travel_reservations;
create trigger travel_reservations_sync_seats
  after insert or update of cancelled_at or delete on public.travel_reservations
  for each row execute function public.sync_travel_seats_taken();

drop trigger if exists travel_companions_sync_seats on public.travel_companions;
create trigger travel_companions_sync_seats
  after insert or update of cancelled_at or delete on public.travel_companions
  for each row execute function public.sync_travel_seats_taken();

-- Validar acompañante antes de insertar/actualizar
create or replace function public.validate_travel_companion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  offer_row public.travel_offers%rowtype;
  current_count integer;
begin
  select o.* into offer_row
  from public.travel_offers o
  where o.id = new.offer_id
  for update of o;

  if not found then
    raise exception 'OFFER_NOT_FOUND';
  end if;

  if new.cancelled_at is null then
    if offer_row.cancelled then
      raise exception 'OFFER_NOT_AVAILABLE';
    end if;

    select (
      (select count(*) from public.travel_reservations where offer_id = new.offer_id and cancelled_at is null)
      + (select count(*) from public.travel_companions where offer_id = new.offer_id and cancelled_at is null)
    ) into current_count;

    if tg_op = 'UPDATE' and old.cancelled_at is null then
      current_count := current_count - 1;
    end if;

    if current_count >= offer_row.seats_total then
      raise exception 'OFFER_FULL';
    end if;
  end if;

  return new;
end;
$$;

create trigger travel_companions_validate
  before insert or update of cancelled_at on public.travel_companions
  for each row execute function public.validate_travel_companion();

alter table public.travel_companions enable row level security;

grant select, insert, update, delete on public.travel_companions to authenticated;

create policy travel_companions_select
  on public.travel_companions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.travel_offers o
      join public.matches m on m.id = o.match_id
      where o.id = travel_companions.offer_id
        and m.logistics_enabled
    )
  );

create policy travel_companions_insert_parent
  on public.travel_companions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.travel_reservations r
      join public.profiles as reservation_player on reservation_player.id = r.player_id
      left join public.parent_child_links pcl
        on pcl.child_profile_id = r.player_id
        and pcl.parent_profile_id = (
          select id from public.profiles where auth_user_id = (select auth.uid())
        )
      where r.offer_id = travel_companions.offer_id
        and r.player_id = travel_companions.reservation_player_id
        and r.cancelled_at is null
        and (
          reservation_player.auth_user_id = (select auth.uid())
          or pcl.parent_profile_id is not null
        )
    )
  );

create policy travel_companions_update_parent
  on public.travel_companions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.travel_reservations r
      join public.profiles as reservation_player on reservation_player.id = r.player_id
      left join public.parent_child_links pcl
        on pcl.child_profile_id = r.player_id
        and pcl.parent_profile_id = (
          select id from public.profiles where auth_user_id = (select auth.uid())
        )
      where r.offer_id = travel_companions.offer_id
        and r.player_id = travel_companions.reservation_player_id
        and r.cancelled_at is null
        and (
          reservation_player.auth_user_id = (select auth.uid())
          or pcl.parent_profile_id is not null
        )
    )
    or exists (
      select 1
      from public.travel_offers o
      join public.matches m on m.id = o.match_id
      where o.id = travel_companions.offer_id
        and (
          public.is_admin()
          or public.is_coach_of(m.team_id)
          or exists (
            select 1
            from public.user_roles ur
            where ur.profile_id = (
              select id from public.profiles where auth_user_id = (select auth.uid())
            )
              and ur.role = 'delegate'
              and ur.scope_team_id = m.team_id
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.travel_reservations r
      join public.profiles as reservation_player on reservation_player.id = r.player_id
      left join public.parent_child_links pcl
        on pcl.child_profile_id = r.player_id
        and pcl.parent_profile_id = (
          select id from public.profiles where auth_user_id = (select auth.uid())
        )
      where r.offer_id = travel_companions.offer_id
        and r.player_id = travel_companions.reservation_player_id
        and r.cancelled_at is null
        and (
          reservation_player.auth_user_id = (select auth.uid())
          or pcl.parent_profile_id is not null
        )
    )
  );
