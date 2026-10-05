do $$
declare
  definition text;
  old_guard text := 'm.status = ''played'' or p_document->>''phase'' = ''finished'' or p_document->>''version'' not in (''3'',''4'')';
begin
  definition := pg_get_functiondef('public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)'::regprocedure);
  if position(old_guard in definition) = 0 then raise exception 'No se reconoce la protección de convocatoria.'; end if;
  definition := replace(definition, old_guard, 'm.status = ''played'' or p_document->>''version'' not in (''3'',''4'')');
  execute definition;
end;
$$;
