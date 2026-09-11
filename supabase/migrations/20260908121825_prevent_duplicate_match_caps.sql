create or replace function public.prevent_duplicate_match_caps() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and new.match_id=old.match_id and new.cap_number is not distinct from old.cap_number and new.status=old.status then return new; end if;
  if new.status not in ('called','confirmed') or new.cap_number is null then return new; end if;
  if new.cap_number not between 1 and 99 then raise exception 'El gorro debe estar entre 1 y 99.' using errcode='23514'; end if;
  perform 1 from public.matches where id=new.match_id for update;
  if exists(select 1 from public.match_callups where match_id=new.match_id and player_id<>new.player_id and status in ('called','confirmed') and cap_number=new.cap_number) then
    raise exception 'El gorro % ya está ocupado. Elige otro número.',new.cap_number using errcode='23514';
  end if;
  return new;
end; $$;
revoke all on function public.prevent_duplicate_match_caps() from public,anon,authenticated;
create trigger match_callups_unique_active_cap before insert or update of cap_number,status,match_id on public.match_callups
for each row execute function public.prevent_duplicate_match_caps();
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
  update public.match_callups set cap_number=null where match_id=p_match and status in ('called','confirmed');
  update public.match_callups c set cap_number=(e.value->>'cap')::smallint
    from jsonb_array_elements(p_players) e where c.match_id=p_match and c.player_id=(e.value->>'id')::uuid;
end; $$;
revoke all on function public.prepare_live_match_caps(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_live_match_caps(uuid,uuid,jsonb) to service_role;
