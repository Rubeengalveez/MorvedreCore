create function public.register_admin_player(p_input jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target public.teams;
  season public.seasons;
  created public.profiles;
  player_year integer := (p_input->>'birth_year')::integer;
  cap integer := (p_input->>'cap_number')::integer;
  age integer;
  category_index integer;
  team_index integer;
  has_template boolean;
begin
  if current_user <> 'service_role' then
    raise exception 'El alta solo puede realizarse desde el servidor.' using errcode = '42501';
  end if;
  if char_length(btrim(p_input->>'full_name')) not between 2 and 100
    or player_year is null or player_year < 1900 or player_year > extract(year from current_date)
    or (cap is not null and cap not between 1 and 14)
  then raise exception 'Revisa el nombre, el año de nacimiento y el gorro.'; end if;

  select * into target from public.teams where id = (p_input->>'team_id')::uuid for update;
  select * into season from public.seasons where id = target.season_id and is_current;
  if season.id is null then raise exception 'Selecciona un equipo de la temporada actual.'; end if;
  age := extract(year from season.start_date)::integer - player_year;
  category_index := case when age <= 11 then 0 when age <= 13 then 1 when age <= 15 then 2 when age <= 17 then 3 when age <= 19 then 4 else 5 end;
  team_index := array_position(array['benjamin','alevin','infantil','cadete','juvenil','absoluto'], target.category_code) - 1;
  if age < 0 or (target.category_code <> 'escuela' and (team_index is null or team_index < category_index or team_index > category_index + 1))
  then raise exception 'El año de nacimiento no encaja con ese equipo.'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(lower(regexp_replace(btrim(p_input->>'full_name'), '\s+', ' ', 'g')) || ':' || player_year, 0));
  if exists (select 1 from public.profiles p join public.user_roles r on r.profile_id = p.id and r.role = 'player'
    where lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(p_input->>'full_name'), '\s+', ' ', 'g')) and p.birth_year = player_year)
  then raise exception 'Ya existe un jugador con ese nombre y año. Busca su ficha antes de registrarlo de nuevo.'; end if;
  has_template := exists (select 1 from public.team_callup_templates where team_id = target.id);
  if cap is not null and (
    exists (select 1 from public.team_callup_templates where team_id = target.id and cap_number = cap)
    or (not has_template and exists (select 1 from public.team_rosters where team_id = target.id and left_at is null and squad_number = cap)))
  then raise exception 'Ese gorro ya está asignado. Elige otro o deja al jugador sin gorro.'; end if;
  if cap is not null and has_template and (select count(*) from public.team_callup_templates where team_id = target.id) >= 14
  then raise exception 'La convocatoria por defecto ya tiene 14 jugadores. Regístralo sin gorro y revisa la convocatoria en Equipos.'; end if;

  insert into public.profiles (full_name, birth_year, gender, cap_number, phone_e164, email_contact,
    photo_url, team_color, school_enrolled, school_payment_paid, must_change_password, license_active, is_active, notes)
  values (btrim(p_input->>'full_name'), player_year, coalesce(p_input->>'gender', 'prefer_not_to_say'), cap,
    p_input->>'phone_e164', p_input->>'email_contact', p_input->>'photo_url', p_input->>'team_color',
    coalesce((p_input->>'school_enrolled')::boolean,false), coalesce((p_input->>'school_payment_paid')::boolean,false),
    false,true,true,p_input->>'notes')
  returning * into created;
  insert into public.team_rosters (team_id,player_id,squad_number) values (target.id,created.id,cap);
  insert into public.user_roles (profile_id,role,scope_team_id) values (created.id,'player',null);
  if cap is not null and has_template then
    insert into public.team_callup_templates (team_id,player_id,cap_number) values (target.id,created.id,cap);
  end if;
  return to_jsonb(created);
end;
$$;
revoke all on function public.register_admin_player(jsonb) from public, anon, authenticated;
grant execute on function public.register_admin_player(jsonb) to service_role;
