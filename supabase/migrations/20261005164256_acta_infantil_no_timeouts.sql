do $$
declare
  definition text;
  prior text := 'category in (''benjamin'',''alevin'',''escuela'')';
begin
  definition := pg_get_functiondef('public.guard_live_match_timeouts()'::regprocedure);
  if position(prior in definition) = 0 then
    raise exception 'No se reconoce el perfil de tiempos muertos';
  end if;
  execute replace(definition, prior, 'category in (''benjamin'',''alevin'',''infantil'',''escuela'')');
end;
$$;
