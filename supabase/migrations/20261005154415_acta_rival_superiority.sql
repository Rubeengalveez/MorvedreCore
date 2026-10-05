do $$
declare
  definition text;
  prior text := 'e->>''side'' = ''them'' and e->>''kind'' = ''goal''';
begin
  definition := pg_get_functiondef('public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)'::regprocedure);
  if position(prior in definition) = 0 then
    raise exception 'No se reconoce el cálculo de goles rivales';
  end if;
  execute replace(definition, prior, 'e->>''side'' = ''them'' and e->>''kind'' in (''goal'',''goal_extra'')');
end;
$$;
