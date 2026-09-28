create table public.team_callup_templates (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  cap_number smallint not null check (cap_number between 1 and 14),
  source_team_id uuid references public.teams(id) on delete set null,
  primary key (team_id, player_id),
  unique (team_id, cap_number)
);

alter table public.team_callup_templates enable row level security;
revoke all on public.team_callup_templates from anon;
grant select, insert, update, delete on public.team_callup_templates to authenticated;
grant all on public.team_callup_templates to service_role;

create policy team_callup_templates_select_staff on public.team_callup_templates
  for select to authenticated using (public.is_match_staff_of(team_id));
create policy team_callup_templates_insert_staff on public.team_callup_templates
  for insert to authenticated with check (public.is_match_staff_of(team_id));
create policy team_callup_templates_update_staff on public.team_callup_templates
  for update to authenticated using (public.is_match_staff_of(team_id))
  with check (public.is_match_staff_of(team_id));
create policy team_callup_templates_delete_staff on public.team_callup_templates
  for delete to authenticated using (public.is_match_staff_of(team_id));

create or replace function public.apply_team_callup_template()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.match_callups (match_id, player_id, cap_number, source_team_id, status)
  select new.id, template.player_id, template.cap_number, template.source_team_id, 'called'
  from public.team_callup_templates template
  join public.profiles player on player.id = template.player_id and player.is_active
  where template.team_id = new.team_id
  order by template.cap_number;
  return new;
end;
$$;

revoke all on function public.apply_team_callup_template() from public, anon, authenticated;
create trigger matches_apply_team_callup_template
  after insert on public.matches
  for each row execute function public.apply_team_callup_template();

create or replace function public.replace_match_callup(
  p_match_id uuid, p_players jsonb, p_save_template boolean
)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  target_match public.matches;
  item jsonb;
  selected_count integer;
  selected_player uuid;
  selected_cap smallint;
  selected_source uuid;
begin
  select * into target_match from public.matches where id = p_match_id for update;
  if target_match.id is null or not public.is_match_staff_of(target_match.team_id) then
    raise exception 'No tienes permiso para editar esta convocatoria.' using errcode = '42501';
  end if;
  if target_match.status not in ('scheduled', 'postponed')
    or exists (select 1 from public.live_match_sheets where match_id = p_match_id)
    or exists (select 1 from public.match_stats where match_id = p_match_id)
  then
    raise exception 'Este partido ya tiene un acta o estadísticas. La convocatoria no se puede sustituir.';
  end if;
  if jsonb_typeof(p_players) is distinct from 'array' then
    raise exception 'Revisa los jugadores seleccionados.';
  end if;
  selected_count := jsonb_array_length(p_players);
  if selected_count > 14
    or (select count(distinct value->>'player_id') from jsonb_array_elements(p_players)) <> selected_count
    or (select count(distinct value->>'cap_number') from jsonb_array_elements(p_players)) <> selected_count
    or exists (
      select 1 from jsonb_array_elements(p_players) entry
      where (entry.value->>'cap_number')::integer not between 1 and 14
        or entry.value->>'cap_number' is null
        or entry.value->>'player_id' is null
    )
  then
    raise exception 'Elige hasta 14 jugadores con gorros distintos del 1 al 14.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_players) entry
    left join public.profiles player on player.id = (entry.value->>'player_id')::uuid
    where player.id is null or not player.is_active
  ) then
    raise exception 'Hay un jugador que ya no está activo. Revisa la convocatoria.';
  end if;

  perform 1 from public.match_callups where match_id = p_match_id for update;
  update public.match_callups callup
  set status = 'withdrawn', cap_number = null, confirmed_at = null
  where callup.match_id = p_match_id
    and callup.status in ('called', 'confirmed')
    and not exists (
      select 1 from jsonb_array_elements(p_players) entry
      where (entry.value->>'player_id')::uuid = callup.player_id
    );
  update public.match_callups set cap_number = null
  where match_id = p_match_id and status in ('called', 'confirmed');

  if p_save_template then
    delete from public.team_callup_templates where team_id = target_match.team_id;
  end if;
  for item in select value from jsonb_array_elements(p_players) loop
    selected_player := (item->>'player_id')::uuid;
    selected_cap := (item->>'cap_number')::smallint;
    select case when roster.team_id <> target_match.team_id then roster.team_id else null end
      into selected_source
    from public.team_rosters roster
    where roster.player_id = selected_player and roster.left_at is null
    order by roster.joined_at desc limit 1;

    insert into public.match_callups (
      match_id, player_id, cap_number, source_team_id, status
    ) values (
      p_match_id, selected_player, selected_cap, selected_source, 'called'
    )
    on conflict (match_id, player_id) do update
      set cap_number = excluded.cap_number,
          source_team_id = excluded.source_team_id,
          status = case when match_callups.status = 'confirmed' then 'confirmed' else 'called' end,
          confirmed_at = case when match_callups.status = 'confirmed' then match_callups.confirmed_at else null end;

    if p_save_template then
      insert into public.team_callup_templates (team_id, player_id, cap_number, source_team_id)
      values (target_match.team_id, selected_player, selected_cap, selected_source);
    end if;
  end loop;
end;
$$;

revoke all on function public.replace_match_callup(uuid, jsonb, boolean) from public, anon;
grant execute on function public.replace_match_callup(uuid, jsonb, boolean) to authenticated;
