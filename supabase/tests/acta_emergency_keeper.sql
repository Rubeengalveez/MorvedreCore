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

