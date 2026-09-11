create or replace function public.save_live_match_sheet(
  p_match uuid, p_actor uuid, p_device uuid, p_revision integer, p_mutation uuid, p_document jsonb,
  p_takeover boolean default false
) returns integer language plpgsql security invoker set search_path = '' as $$
declare m public.matches; previous public.live_match_sheets; actor uuid; item jsonb; g integer; x integer; next_revision integer;
begin
  select * into m from public.matches where id = p_match for update;
  if m.id is null then raise exception 'El partido no existe.'; end if;
  select id into actor from public.profiles where id = p_actor and is_active and auth_user_id is not null;
  if actor is null or not (
    exists(select 1 from public.user_roles where profile_id = actor and role = 'delegate' and scope_team_id = m.team_id)
    or exists(select 1 from public.team_staff where profile_id = actor and team_id = m.team_id and role = 'delegate')
  ) then raise exception 'No tienes permiso para anotar este partido.' using errcode = '42501'; end if;
  select * into previous from public.live_match_sheets where match_id = p_match;
  if previous.mutation_id = p_mutation and previous.owner_id = actor and previous.device_id = p_device then return previous.revision; end if;
  if coalesce(previous.revision, 0) <> p_revision then raise exception 'CONFLICT: Hay una versión más reciente. Conservamos tus cambios en el móvil.'; end if;
  if previous.match_id is not null and (previous.owner_id <> actor or previous.device_id <> p_device) and not p_takeover then
    raise exception 'CONFLICT: Otro dispositivo lleva este partido. Puedes consultar el acta o tomar el relevo.';
  end if;
  if p_takeover and previous.match_id is not null and p_document is distinct from previous.document then raise exception 'El relevo debe conservar el acta actual.'; end if;
  if previous.document->>'phase' = 'finished' and p_document is distinct from previous.document then raise exception 'El acta está cerrada.'; end if;
  if exists(select 1 from public.match_stats where match_id = p_match and validated_at is not null) and p_document is distinct from previous.document then raise exception 'El acta está validada.'; end if;
  if m.status in ('cancelled','postponed') then raise exception 'El partido está cancelado o aplazado.'; end if;
  if jsonb_typeof(p_document->'players') <> 'array' or jsonb_typeof(p_document->'events') <> 'array' then raise exception 'Acta inválida.'; end if;
  for item in select value from jsonb_array_elements(p_document->'players') loop
    if not exists(select 1 from public.match_callups where match_id = p_match and player_id = (item->>'id')::uuid and cap_number = (item->>'cap')::integer) then raise exception 'La convocatoria o un gorro ha cambiado. Revisa el equipo.'; end if;
  end loop;
  next_revision := p_revision + 1;
  insert into public.live_match_sheets(match_id, owner_id, device_id, revision, mutation_id, document)
  values(p_match, actor, p_device, next_revision, p_mutation, p_document)
  on conflict(match_id) do update set owner_id = actor, device_id = p_device, revision = next_revision, mutation_id = p_mutation, document = p_document, updated_at = now();
  for item in select value from jsonb_array_elements(p_document->'players') loop
    select count(*) filter(where e->>'kind' in ('goal','goal_extra','goal_penalty')),
      count(*) filter(where e->>'kind' in ('exclusion','penalty')) into g,x
      from jsonb_array_elements(p_document->'events') e
      where e->>'side' = 'us' and (e->>'cap')::integer = (item->>'cap')::integer and not (e->>'deleted')::boolean;
    select g + coalesce(sum((b->>'goals')::integer),0), x + coalesce(sum((b->>'exclusions')::integer),0) into g,x
      from jsonb_array_elements(p_document->'baseline') b where (b->>'cap')::integer = (item->>'cap')::integer;
    if x > 3 then raise exception 'Máximo tres expulsiones por jugador.'; end if;
    insert into public.match_stats(match_id,player_id,goals,exclusions,entered_by)
      values(p_match,(item->>'id')::uuid,g,x,actor)
      on conflict(match_id,player_id) do update set goals=excluded.goals, exclusions=excluded.exclusions, entered_by=actor, entered_at=now();
  end loop;
  if p_document->>'phase' = 'finished' then
    select coalesce(sum(goals),0) into g from public.match_stats where match_id = p_match;
    select count(*) + (p_document->>'baselineThem')::integer into x from jsonb_array_elements(p_document->'events') e
      where e->>'side' = 'them' and e->>'kind' = 'goal' and not (e->>'deleted')::boolean;
    update public.matches set status='played', final_score_us=g, final_score_them=x where id=p_match;
    update public.match_stats set validated_by=actor,validated_at=now() where match_id=p_match and validated_at is null;
  end if;
  return next_revision;
end; $$;
revoke all on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean) to service_role;


alter policy live_match_sheets_read on public.live_match_sheets using (
  exists(select 1 from public.profiles p join public.matches m on m.id=match_id
    where p.auth_user_id=(select auth.uid()) and p.is_active and (
      exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='delegate' and r.scope_team_id=m.team_id)
      or exists(select 1 from public.team_staff t where t.profile_id=p.id and t.role='delegate' and t.team_id=m.team_id)
    ))
);
create or replace function public.prepare_live_match_caps(p_match uuid, p_actor uuid, p_players jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare m public.matches; actor uuid; supplied integer; eligible integer;
begin
  select * into m from public.matches where id=p_match for update;
  select id into actor from public.profiles where id=p_actor and is_active and auth_user_id is not null;
  if m.id is null or actor is null or not (
    exists(select 1 from public.user_roles where profile_id=actor and role='delegate' and scope_team_id=m.team_id)
    or exists(select 1 from public.team_staff where profile_id=actor and role='delegate' and team_id=m.team_id)
  ) then raise exception 'Solo el delegado de este equipo puede preparar el acta.' using errcode='42501'; end if;
  if m.status in ('played','cancelled','postponed') or exists(select 1 from public.live_match_sheets where match_id=p_match) or exists(select 1 from public.match_stats where match_id=p_match and validated_at is not null) then raise exception 'El partido ya no permite cambiar los gorros desde aquí.'; end if;
  perform 1 from public.match_callups where match_id=p_match for update;
  if jsonb_typeof(p_players) <> 'array' then raise exception 'Revisa los gorros.'; end if;
  supplied:=jsonb_array_length(p_players);
  select count(*) into eligible from public.match_callups where match_id=p_match and status in ('called','confirmed');
  if supplied<1 or supplied>30 or supplied<>eligible
    or (select count(distinct value->>'id') from jsonb_array_elements(p_players))<>supplied
    or (select count(distinct (value->>'cap')::integer) from jsonb_array_elements(p_players))<>supplied
    or exists(select 1 from jsonb_array_elements(p_players) e where (e->>'cap')::integer not between 1 and 99 or e->>'cap' is null or not exists(select 1 from public.match_callups c where c.match_id=p_match and c.player_id=(e->>'id')::uuid and c.status in ('called','confirmed')))
  then raise exception 'La convocatoria ha cambiado o hay gorros repetidos. Vuelve a revisarla.'; end if;
  update public.match_callups c set cap_number=(e.value->>'cap')::smallint
    from jsonb_array_elements(p_players) e where c.match_id=p_match and c.player_id=(e.value->>'id')::uuid;
end; $$;
revoke all on function public.prepare_live_match_caps(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_live_match_caps(uuid,uuid,jsonb) to service_role;
create or replace function public.protect_live_match_totals() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role') in ('postgres','service_role') then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if exists(select 1 from public.live_match_sheets where match_id = case when tg_op = 'DELETE' then old.match_id else new.match_id end) then
    raise exception 'Este partido se registra desde el acta en directo.' using errcode='42501';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;
create or replace function public.protect_live_match_score() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role') in ('postgres','service_role') then return new; end if;
  if (new.final_score_us is distinct from old.final_score_us or new.final_score_them is distinct from old.final_score_them or new.status is distinct from old.status)
    and exists(select 1 from public.live_match_sheets where match_id=old.id) then
    raise exception 'El resultado de este partido se guarda desde el acta en directo.' using errcode='42501';
  end if;
  return new;
end; $$;

revoke all on function public.protect_live_match_totals() from public,anon,authenticated;
revoke all on function public.protect_live_match_score() from public,anon,authenticated;
