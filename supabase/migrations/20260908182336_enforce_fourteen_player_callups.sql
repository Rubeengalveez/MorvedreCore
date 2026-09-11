create or replace function public.prevent_duplicate_match_caps() returns trigger
language plpgsql security definer set search_path = '' as $$
declare active_players integer;
begin
  if tg_op='UPDATE' and new.match_id=old.match_id and new.cap_number is not distinct from old.cap_number and new.status=old.status then return new; end if;
  if new.status not in ('called','confirmed') then return new; end if;
  perform 1 from public.matches where id=new.match_id for update;
  select count(*) into active_players from public.match_callups
    where match_id=new.match_id and player_id<>new.player_id and status in ('called','confirmed');
  if active_players>=14 then
    raise exception 'La convocatoria ya tiene el máximo de 14 jugadores.' using errcode='23514';
  end if;
  if new.cap_number is null then return new; end if;
  if new.cap_number not between 1 and 99 then raise exception 'El gorro debe estar entre 1 y 99.' using errcode='23514'; end if;
  if exists(select 1 from public.match_callups where match_id=new.match_id and player_id<>new.player_id and status in ('called','confirmed') and cap_number=new.cap_number) then
    raise exception 'El gorro % ya está ocupado. Elige otro número.',new.cap_number using errcode='23514';
  end if;
  return new;
end; $$;

revoke all on function public.prevent_duplicate_match_caps() from public,anon,authenticated;

create or replace function public.prepare_live_match_caps(p_match uuid, p_actor uuid, p_players jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare m public.matches; actor uuid; supplied integer;
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
  if supplied<1 or supplied>14
    or (select count(distinct value->>'id') from jsonb_array_elements(p_players))<>supplied
    or (select count(distinct (value->>'cap')::integer) from jsonb_array_elements(p_players))<>supplied
    or exists(select 1 from jsonb_array_elements(p_players) e where (e->>'cap')::integer not between 1 and 99 or e->>'cap' is null or not exists(select 1 from public.match_callups c where c.match_id=p_match and c.player_id=(e->>'id')::uuid and c.status in ('called','confirmed')))
  then raise exception 'Elige entre 1 y 14 jugadores y asigna un gorro diferente a cada uno.'; end if;
  update public.match_callups c set status='withdrawn',cap_number=null
    where c.match_id=p_match and c.status in ('called','confirmed')
      and not exists(select 1 from jsonb_array_elements(p_players) e where (e.value->>'id')::uuid=c.player_id);
  update public.match_callups c set cap_number=null
    where c.match_id=p_match and c.status in ('called','confirmed');
  update public.match_callups c set cap_number=(e.value->>'cap')::smallint
    from jsonb_array_elements(p_players) e where c.match_id=p_match and c.player_id=(e.value->>'id')::uuid;
end; $$;

revoke all on function public.prepare_live_match_caps(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_live_match_caps(uuid,uuid,jsonb) to service_role;

create or replace function public.prevent_live_match_document_downgrade() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce((old.document->>'version')::integer,1)>=2
    and coalesce((new.document->>'version')::integer,1)<2 then
    raise exception 'Esta acta contiene datos nuevos. Actualiza la aplicación antes de continuar.' using errcode='23514';
  end if;
  return new;
end; $$;

revoke all on function public.prevent_live_match_document_downgrade() from public,anon,authenticated;
drop trigger if exists live_match_sheets_prevent_downgrade on public.live_match_sheets;
create trigger live_match_sheets_prevent_downgrade
before update of document on public.live_match_sheets
for each row execute function public.prevent_live_match_document_downgrade();
