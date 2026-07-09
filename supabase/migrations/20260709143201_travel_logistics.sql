alter table public.matches
  add column travel_meeting_point text,
  add column travel_compensation_cents integer not null default 3000
    check (travel_compensation_cents between 0 and 100000);

create table public.travel_offers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_label text not null check (char_length(vehicle_label) between 2 and 80),
  seats_total smallint not null check (seats_total between 1 and 6),
  seats_taken smallint not null default 0 check (seats_taken between 0 and 6),
  departure_from text not null check (char_length(departure_from) between 2 and 160),
  departure_at timestamptz not null,
  notes text check (notes is null or char_length(notes) <= 300),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, driver_id)
);

create table public.travel_reservations (
  offer_id uuid not null references public.travel_offers(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  primary key (offer_id, player_id)
);

create index travel_offers_match_id_idx on public.travel_offers (match_id);
create index travel_offers_driver_id_idx on public.travel_offers (driver_id);
create index travel_reservations_player_id_idx on public.travel_reservations (player_id);
create unique index travel_reservations_one_active_offer_per_match
  on public.travel_reservations (match_id, player_id)
  where cancelled_at is null;

create trigger travel_offers_set_updated_at
  before update on public.travel_offers
  for each row execute function public.set_updated_at();

create or replace function public.validate_travel_reservation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  offer_match_id uuid;
  offer_cancelled boolean;
  offer_seats_total smallint;
  offer_seats_taken smallint;
  match_logistics_enabled boolean;
  match_is_home boolean;
  match_status text;
begin
  select
    o.match_id,
    o.cancelled,
    o.seats_total,
    o.seats_taken,
    m.logistics_enabled,
    m.is_home,
    m.status
  into
    offer_match_id,
    offer_cancelled,
    offer_seats_total,
    offer_seats_taken,
    match_logistics_enabled,
    match_is_home,
    match_status
  from public.travel_offers o
  join public.matches m on m.id = o.match_id
  where o.id = new.offer_id
  for update of o;

  if offer_match_id is null then
    raise exception 'OFFER_NOT_FOUND';
  end if;

  new.match_id := offer_match_id;

  if new.cancelled_at is null then
    if offer_cancelled or not match_logistics_enabled or match_is_home or match_status not in ('scheduled', 'postponed') then
      raise exception 'OFFER_NOT_AVAILABLE';
    end if;

    if tg_op = 'INSERT' then
      if offer_seats_taken >= offer_seats_total then
        raise exception 'OFFER_FULL';
      end if;
    elsif old.cancelled_at is not null or old.offer_id <> new.offer_id then
      if offer_seats_taken >= offer_seats_total then
        raise exception 'OFFER_FULL';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger travel_reservations_validate
  before insert or update of offer_id, cancelled_at on public.travel_reservations
  for each row execute function public.validate_travel_reservation();

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
    select count(*)::smallint
    from public.travel_reservations
    where offer_id = target_offer_id
      and cancelled_at is null
  )
  where id = target_offer_id;

  return coalesce(new, old);
end;
$$;

create trigger travel_reservations_sync_seats
  after insert or update of cancelled_at or delete on public.travel_reservations
  for each row execute function public.sync_travel_seats_taken();

alter table public.travel_offers enable row level security;
alter table public.travel_reservations enable row level security;

grant select, insert, update, delete on public.travel_offers to authenticated;
grant select, insert, update, delete on public.travel_reservations to authenticated;

create policy travel_offers_select
  on public.travel_offers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches
      where id = travel_offers.match_id
        and logistics_enabled
    )
  );

create policy travel_offers_insert_own
  on public.travel_offers
  for insert
  to authenticated
  with check (
    driver_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.matches
      where id = travel_offers.match_id
        and logistics_enabled
        and not is_home
        and status in ('scheduled', 'postponed')
    )
  );

create policy travel_offers_update_owner_staff
  on public.travel_offers
  for update
  to authenticated
  using (
    driver_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.matches m
      where m.id = travel_offers.match_id
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
    driver_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.matches m
      where m.id = travel_offers.match_id
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
  );

create policy travel_reservations_select
  on public.travel_reservations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.travel_offers o
      join public.matches m on m.id = o.match_id
      where o.id = travel_reservations.offer_id
        and m.logistics_enabled
    )
  );

create policy travel_reservations_insert_player_parent
  on public.travel_reservations
  for insert
  to authenticated
  with check (
    player_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
        and pcl.child_profile_id = player_id
    )
  );

create policy travel_reservations_update_player_parent_staff
  on public.travel_reservations
  for update
  to authenticated
  using (
    player_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
        and pcl.child_profile_id = player_id
    )
    or exists (
      select 1
      from public.travel_offers o
      join public.matches m on m.id = o.match_id
      where o.id = travel_reservations.offer_id
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
    player_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
        and pcl.child_profile_id = player_id
    )
    or exists (
      select 1
      from public.travel_offers o
      join public.matches m on m.id = o.match_id
      where o.id = travel_reservations.offer_id
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
  );

create or replace function public.reserve_travel_seat(p_offer_id uuid, p_player_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  offer_row public.travel_offers%rowtype;
  actor_profile_id uuid;
begin
  select id into actor_profile_id
  from public.profiles
  where auth_user_id = (select auth.uid());

  if actor_profile_id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p_player_id <> actor_profile_id and not exists (
    select 1
    from public.parent_child_links
    where parent_profile_id = actor_profile_id
      and child_profile_id = p_player_id
  ) then
    raise exception 'PLAYER_NOT_ALLOWED';
  end if;

  select o.* into offer_row
  from public.travel_offers o
  join public.matches m on m.id = o.match_id
  where o.id = p_offer_id
    and m.logistics_enabled
    and not m.is_home
    and m.status in ('scheduled', 'postponed')
  for update of o;

  if not found or offer_row.cancelled then
    raise exception 'OFFER_NOT_AVAILABLE';
  end if;

  if offer_row.seats_taken >= offer_row.seats_total then
    raise exception 'OFFER_FULL';
  end if;

  if exists (
    select 1
    from public.travel_reservations r
    where r.match_id = offer_row.match_id
      and r.player_id = p_player_id
      and r.cancelled_at is null
  ) then
    raise exception 'PLAYER_ALREADY_RESERVED';
  end if;

  insert into public.travel_reservations (offer_id, match_id, player_id)
  values (p_offer_id, offer_row.match_id, p_player_id)
  on conflict (offer_id, player_id)
  do update set cancelled_at = null, created_at = now();
end;
$$;

revoke execute on function public.reserve_travel_seat(uuid, uuid) from public;
revoke execute on function public.reserve_travel_seat(uuid, uuid) from anon;
grant execute on function public.reserve_travel_seat(uuid, uuid) to authenticated;
