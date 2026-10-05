create or replace function public.live_match_emergency_keeper_caps(p_document jsonb, p_side text)
returns integer[]
language plpgsql immutable security invoker
set search_path = ''
as $$
declare
  roles integer[] := array[1,13];
  assigned integer[] := array[]::integer[];
  playing text[];
  keeper text;
  lineup jsonb;
  change jsonb;
  event jsonb;
  outgoing integer;
  incoming integer;
  through_event bigint;
  exclusions integer;
  incoming_exclusions integer;
  quarter integer;
  personal_limit integer := case when p_document->>'category' in ('benjamin','escuela') then 4 else 3 end;
begin
  if p_side not in ('us','them') or not coalesce((p_document->'participation'->>'enabled')::boolean, false) then
    return assigned;
  end if;
  for quarter in 1..least(coalesce((p_document->>'period')::integer,1),4) loop
    select value into lineup from jsonb_array_elements(coalesce(p_document->'participation'->'lineups','[]'::jsonb))
      where value->>'side' = p_side and (value->>'period')::integer = quarter limit 1;
    if lineup is null then continue; end if;
    keeper := lineup->>'keeper';
    select array[keeper] || coalesce(array_agg(value),array[]::text[]) into playing
      from jsonb_array_elements_text(lineup->'field');
    for change in select value from jsonb_array_elements(coalesce(p_document->'participation'->'changes','[]'::jsonb))
      where value->>'side' = p_side and (value->>'period')::integer = quarter and value->>'reason' = 'sanction'
    loop
      if not (change->>'outgoing' = any(playing)) then continue; end if;
      if p_side = 'us' then
        select (value->>'cap')::integer into outgoing from jsonb_array_elements(p_document->'players') where value->>'id' = change->>'outgoing';
        select (value->>'cap')::integer into incoming from jsonb_array_elements(p_document->'players')
          where value->>'id' = change->>'incoming' and not coalesce((value->>'retired')::boolean,false);
      else
        outgoing := (change->>'outgoing')::integer;
        incoming := (change->>'incoming')::integer;
        if not exists(select 1 from jsonb_array_elements_text(p_document->'opponentCaps') cap where cap::integer = incoming) then continue; end if;
      end if;
      if outgoing is null or incoming is null or outgoing = incoming then continue; end if;
      select value, ordinality into event, through_event
        from jsonb_array_elements(p_document->'events') with ordinality
        where value->>'id' = change->>'eventId' limit 1;
      if event is null or coalesce((event->>'deleted')::boolean,false) or event->>'side' <> p_side
        or (event->>'period')::integer <> quarter or (event->>'cap')::integer <> outgoing
        or event->>'kind' not in ('red','exclusion','penalty') then continue; end if;
      select count(*) into exclusions from jsonb_array_elements(p_document->'events') with ordinality
        where ordinality <= through_event and not coalesce((value->>'deleted')::boolean,false)
          and value->>'side' = p_side and (value->>'cap')::integer = outgoing and value->>'kind' in ('exclusion','penalty');
      if p_side = 'us' then
        exclusions := exclusions + coalesce((select (value->>'exclusions')::integer from jsonb_array_elements(p_document->'baseline') where (value->>'cap')::integer = outgoing),0);
      end if;
      if event->>'kind' <> 'red' and exclusions < personal_limit then continue; end if;
      if exists(select 1 from jsonb_array_elements(p_document->'events') with ordinality
        where ordinality <= through_event and not coalesce((value->>'deleted')::boolean,false)
          and value->>'side' = p_side and (value->>'cap')::integer = incoming and value->>'kind' = 'red') then continue; end if;
      select count(*) into incoming_exclusions from jsonb_array_elements(p_document->'events') with ordinality
        where ordinality <= through_event and not coalesce((value->>'deleted')::boolean,false)
          and value->>'side' = p_side and (value->>'cap')::integer = incoming and value->>'kind' in ('exclusion','penalty');
      if p_side = 'us' then
        incoming_exclusions := incoming_exclusions + coalesce((select (value->>'exclusions')::integer from jsonb_array_elements(p_document->'baseline') where (value->>'cap')::integer = incoming),0);
      end if;
      if incoming_exclusions >= personal_limit then continue; end if;
      if change->>'outgoing' = keeper and outgoing = any(roles) then
        roles := array_append(roles,incoming);
        if incoming not in (1,13) then assigned := array_append(assigned,incoming); end if;
        keeper := change->>'incoming';
      elsif change->>'incoming' = any(playing) then continue;
      end if;
      playing := array_append(array_remove(playing,change->>'outgoing'),change->>'incoming');
    end loop;
  end loop;
  return array(select distinct cap from unnest(assigned) cap order by cap);
end;
$$;

revoke all on function public.live_match_emergency_keeper_caps(jsonb,text) from public, anon, authenticated;
grant execute on function public.live_match_emergency_keeper_caps(jsonb,text) to service_role;

do $$
declare
  doc jsonb := '{"category":"infantil","period":4,"players":[{"id":"p1","cap":1},{"id":"p2","cap":2},{"id":"p8","cap":8},{"id":"p9","cap":9},{"id":"p13","cap":13}],"opponentCaps":[1,2,8,9,13],"baseline":[],"events":[{"id":"red1","side":"us","cap":1,"period":4,"kind":"red","deleted":false}],"participation":{"enabled":true,"lineups":[{"side":"us","period":4,"keeper":"p1","field":["p2"]}],"changes":[{"side":"us","period":4,"outgoing":"p1","incoming":"p9","reason":"sanction","eventId":"red1"}]}}';
  test jsonb;
begin
  assert public.live_match_emergency_keeper_caps(doc,'us') = array[9], 'Roja del portero';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{period}','5'),'us') = array[9], 'Portero de emergencia persiste en cuarto 5';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{events,0,deleted}','true'),'us') = array[]::integer[], 'Sancion anulada';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{events,0,period}','3'),'us') = array[]::integer[], 'Cuarto de sancion incorrecto';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{participation,lineups,0,keeper}','"p13"'),'us') = array[]::integer[], 'Portero expulsado no era el del cuarto';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{participation,lineups}','[]'),'us') = array[]::integer[], 'Sin alineacion';
  assert public.live_match_emergency_keeper_caps(jsonb_set(doc,'{participation,changes,0,reason}','"injury"'),'us') = array[]::integer[], 'No admite lesion como prueba';
  test := jsonb_set(jsonb_set(doc,'{participation,changes,0,outgoing}','"p2"'),'{events,0,cap}','2');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[]::integer[], 'Expulsion de campo no convierte en portero';
  test := jsonb_set(doc,'{events}','[{"id":"red9","side":"us","cap":9,"period":4,"kind":"red","deleted":false},{"id":"red1","side":"us","cap":1,"period":4,"kind":"red","deleted":false}]');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[]::integer[], 'No admite sustituto expulsado';
  test := jsonb_set(doc,'{participation,changes,0,incoming}','"p2"');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[2], 'Jugador activo pasa a porteria';
  test := jsonb_set(doc,'{events}',(doc->'events') || '[{"id":"red9","side":"us","cap":9,"period":4,"kind":"red","deleted":false}]'::jsonb);
  test := jsonb_set(test,'{participation,changes}',(doc->'participation'->'changes') || '[{"side":"us","period":4,"outgoing":"p9","incoming":"p8","reason":"sanction","eventId":"red9"}]'::jsonb);
  assert public.live_match_emergency_keeper_caps(test,'us') = array[8,9], 'Sustituciones sucesivas';
  test := jsonb_set(doc,'{events}','[{"id":"x1","side":"us","cap":1,"period":4,"kind":"exclusion","deleted":false},{"id":"x2","side":"us","cap":1,"period":4,"kind":"penalty","deleted":false},{"id":"x3","side":"us","cap":1,"period":4,"kind":"exclusion","deleted":false}]');
  test := jsonb_set(test,'{participation,changes,0,eventId}','"x3"');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[9], 'Infantil tres expulsiones';
  test := jsonb_set(test,'{category}','"benjamin"');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[]::integer[], 'Benjamin tres no es definitiva';
  test := jsonb_set(test,'{events}',(test->'events') || '[{"id":"x4","side":"us","cap":1,"period":4,"kind":"exclusion","deleted":false}]'::jsonb);
  test := jsonb_set(test,'{participation,changes,0,eventId}','"x4"');
  assert public.live_match_emergency_keeper_caps(test,'us') = array[9], 'Benjamin cuatro expulsiones';
  test := jsonb_set(doc,'{events,0,side}','"them"');
  test := jsonb_set(test,'{participation,lineups}','[{"side":"them","period":4,"keeper":"1","field":["2"]}]');
  test := jsonb_set(test,'{participation,changes}','[{"side":"them","period":4,"outgoing":"1","incoming":"9","reason":"sanction","eventId":"red1"}]');
  assert public.live_match_emergency_keeper_caps(test,'them') = array[9], 'Rival portero de emergencia';
end;
$$;

do $$
declare
  definition text;
  original text := 'and (p_document->>''keeper'')::integer not in (1,13) then';
  replacement text := 'and (p_document->>''keeper'')::integer not in (1,13)
    and not ((p_document->>''keeper'')::integer = any(public.live_match_emergency_keeper_caps(p_document,''us''))) then';
begin
  select pg_get_functiondef('public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)'::regprocedure) into definition;
  if position(original in definition) = 0 or position('live_match_emergency_keeper_caps' in definition) > 0 then
    raise exception 'La validación del portero ha cambiado. Revisa la función antes de aplicar esta migración.';
  end if;
  execute replace(definition,original,replacement);
end;
$$;
