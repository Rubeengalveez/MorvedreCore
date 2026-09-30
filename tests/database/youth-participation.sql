do $$
declare
  doc jsonb;
  invalid jsonb;
  denied boolean;
begin
  doc := '{"version":4,"category":"infantil","period":1,"periods":6,"players":[{"id":"00000000-0000-4000-8000-000000000001","cap":1},{"id":"00000000-0000-4000-8000-000000000002","cap":2}],"opponentCaps":[1,2,3,4,5,6,7],"events":[],"participation":{"rulesVersion":1,"enabled":true,"opponentConfirmed":true,"fixedKeepers":{"us":null,"them":null},"lineups":[{"period":1,"side":"us","keeper":"00000000-0000-4000-8000-000000000001","field":["00000000-0000-4000-8000-000000000002"],"incident":"Faltan jugadores"},{"period":1,"side":"them","keeper":"1","field":["2","3","4","5","6","7"]}],"changes":[]}}'::jsonb;
  perform public.validate_live_participation(doc,'infantil');
  denied := false;
  begin perform public.validate_live_participation(doc,'cadete'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: categoría manipulada aceptada'; end if;
  invalid := jsonb_set(doc,'{participation,lineups,1,field}','["2","3","4","5","6","99"]');
  denied := false;
  begin perform public.validate_live_participation(invalid,'infantil'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: rival inexistente aceptado'; end if;
  invalid := jsonb_set(doc,'{participation,lineups,1,field}','["2","3","4","5","6","6"]');
  denied := false;
  begin perform public.validate_live_participation(invalid,'infantil'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: jugador duplicado aceptado'; end if;
  invalid := jsonb_set(doc,'{participation,fixedKeepers,us}','"no-existe"');
  denied := false;
  begin perform public.validate_live_participation(invalid,'infantil'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: portero inexistente aceptado'; end if;
  invalid := jsonb_set(doc,'{participation,lineups}',(doc->'participation'->'lineups') || jsonb_build_array(doc->'participation'->'lineups'->0));
  denied := false;
  begin perform public.validate_live_participation(invalid,'infantil'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: cuarto duplicado aceptado'; end if;
  invalid := jsonb_set(doc,'{events}','[{"side":"them","cap":2,"kind":"exclusion","deleted":false},{"side":"them","cap":2,"kind":"exclusion","deleted":false},{"side":"them","cap":2,"kind":"penalty","deleted":false},{"side":"them","cap":2,"kind":"exclusion","deleted":false}]');
  denied := false;
  begin perform public.validate_live_participation(invalid,'infantil'); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: cuarta expulsión infantil aceptada'; end if;
  invalid := jsonb_set(invalid,'{category}','"benjamin"');
  invalid := jsonb_set(invalid,'{participation,lineups,1,field}','["2","3","4","5","6"]');
  perform public.validate_live_participation(invalid,'benjamin');
  if has_function_privilege('authenticated','public.validate_live_participation(jsonb,text)','execute') or
    has_function_privilege('anon','public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)','execute') then
    raise exception 'FAIL: función privilegiada accesible al cliente';
  end if;
end;
$$;
