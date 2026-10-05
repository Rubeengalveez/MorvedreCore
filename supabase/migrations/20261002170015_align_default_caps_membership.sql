create or replace function public.save_team_default_caps(p_team_id uuid, p_players jsonb, p_expected jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  current_caps jsonb;
  expected_caps jsonb;
  item jsonb;
  had_template boolean;
begin
  if not public.has_permission('manage_teams') then
    raise exception 'No tienes permiso para editar este equipo.' using errcode = '42501';
  end if;
  perform 1 from public.teams where id = p_team_id for update;
  if not found then raise exception 'El equipo no existe.'; end if;
  perform 1 from public.team_rosters where team_id = p_team_id and left_at is null for update;
  perform 1 from public.team_callup_templates where team_id = p_team_id for update;

  if jsonb_typeof(p_players) is distinct from 'array' or jsonb_typeof(p_expected) is distinct from 'array'
    or jsonb_array_length(p_players) > 500
    or exists (select 1 from jsonb_array_elements(p_players) p where p->>'player_id' is null
      or (p->>'cap_number')::integer not between 1 and 14)
    or (select count(distinct p->>'player_id') from jsonb_array_elements(p_players) p) <> jsonb_array_length(p_players)
    or (select count(distinct p->>'cap_number') from jsonb_array_elements(p_players) p)
      <> (select count(*) from jsonb_array_elements(p_players) p where p->>'cap_number' is not null)
  then raise exception 'Revisa los jugadores y los gorros del 1 al 14.'; end if;

  select coalesce(jsonb_object_agg(s.player_id::text, s.cap), '{}'::jsonb) into current_caps from (
    select r.player_id, case when exists (select 1 from public.team_callup_templates existing where existing.team_id = p_team_id) then t.cap_number else r.squad_number end as cap
    from public.team_rosters r left join public.team_callup_templates t on t.team_id = r.team_id and t.player_id = r.player_id
    where r.team_id = p_team_id and r.left_at is null
    union all
    select t.player_id, t.cap_number from public.team_callup_templates t
    where t.team_id = p_team_id and not exists (select 1 from public.team_rosters r where r.team_id = p_team_id and r.player_id = t.player_id and r.left_at is null)
  ) s;
  select coalesce(jsonb_object_agg(p->>'player_id', p->'cap_number'), '{}'::jsonb) into expected_caps from jsonb_array_elements(p_expected) p;
  if expected_caps is distinct from current_caps
    or (select coalesce(array_agg(key order by key), array[]::text[]) from jsonb_object_keys(current_caps) key)
      is distinct from (select coalesce(array_agg(p->>'player_id' order by p->>'player_id'), array[]::text[]) from jsonb_array_elements(p_players) p)
  then raise exception 'La plantilla o los gorros han cambiado. Actualiza y vuelve a intentarlo.'; end if;

  select exists(select 1 from public.team_callup_templates where team_id = p_team_id) into had_template;
  if not had_template then
    insert into public.team_callup_templates (team_id,player_id,cap_number)
    select p_team_id, (p->>'player_id')::uuid, null
    from jsonb_array_elements(p_players) p
    order by (p->>'cap_number')::integer nulls last, p->>'player_id' limit 14;
  end if;
  update public.team_callup_templates set cap_number = null where team_id = p_team_id;
  for item in select value from jsonb_array_elements(p_players) loop
    update public.team_rosters set squad_number = (item->>'cap_number')::smallint
    where team_id = p_team_id and player_id = (item->>'player_id')::uuid and left_at is null;
    update public.team_callup_templates set cap_number = (item->>'cap_number')::smallint
    where team_id = p_team_id and player_id = (item->>'player_id')::uuid;
    if not found and item->>'cap_number' is not null
      and (item->'cap_number') is distinct from (current_caps->(item->>'player_id')) then
      if (select count(*) from public.team_callup_templates where team_id = p_team_id) >= 14 then
        raise exception 'La convocatoria por defecto ya tiene 14 jugadores. Revísala desde Editar convocatoria.';
      end if;
      insert into public.team_callup_templates (team_id,player_id,cap_number)
      values (p_team_id,(item->>'player_id')::uuid,(item->>'cap_number')::smallint);
    end if;
  end loop;
end;
$$;
revoke all on function public.save_team_default_caps(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_team_default_caps(uuid,jsonb,jsonb) to authenticated;
