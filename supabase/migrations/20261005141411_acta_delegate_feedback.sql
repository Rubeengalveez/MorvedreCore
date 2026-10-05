do $$
declare
  signature text;
  definition text;
begin
  foreach signature in array array[
    'public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)',
    'private.season_ranking_totals(uuid)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    if position('''goal'',''goal_extra'',''goal_penalty''' in definition) = 0 then
      raise exception 'No se reconoce el cálculo de goles de %', signature;
    end if;
    definition := replace(definition,
      '''goal'',''goal_extra'',''goal_penalty''',
      '''goal'',''goal_extra'',''goal_penalty'',''goal_counter''');
    definition := replace(definition,
      '''shot_out'',''shot_saved'',''shot_blocked'',''shot_corner'',''penalty_missed''',
      '''shot_out'',''shot_saved'',''shot_blocked'',''shot_corner'',''penalty_missed'',''shot_deflected''');
    execute definition;
  end loop;
end;
$$;

create function public.guard_live_match_timeouts()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  category text;
  timeout_limit integer;
  side text;
  before_count integer;
  after_count integer;
  prior jsonb;
begin
  select t.category_code into category from public.matches m
    join public.teams t on t.id = m.team_id where m.id = new.match_id;
  timeout_limit := case when category in ('benjamin','alevin','escuela') then 0 else 2 end;
  prior := case when tg_op = 'UPDATE' then old.document else '{}'::jsonb end;
  foreach side in array array['us','them'] loop
    select count(*) into before_count from jsonb_array_elements(coalesce(prior->'events','[]'::jsonb)) e
      where e->>'side' = side and e->>'kind' = 'timeout' and not coalesce((e->>'deleted')::boolean,false);
    select count(*) into after_count from jsonb_array_elements(new.document->'events') e
      where e->>'side' = side and e->>'kind' = 'timeout' and not coalesce((e->>'deleted')::boolean,false);
    if after_count > greatest(timeout_limit, before_count) or
      (after_count > timeout_limit and exists(
        select 1 from jsonb_array_elements(new.document->'events') e
        where e->>'side' = side and e->>'kind' = 'timeout' and not coalesce((e->>'deleted')::boolean,false)
          and not exists(select 1 from jsonb_array_elements(coalesce(prior->'events','[]'::jsonb)) p
            where p->>'id' = e->>'id' and p->>'side' = side and p->>'kind' = 'timeout'
              and not coalesce((p->>'deleted')::boolean,false))
      )) then
      if timeout_limit = 0 then raise exception 'En esta categoría no se permiten tiempos muertos.'; end if;
      raise exception 'Este equipo ya ha usado sus % tiempos muertos por partido.', timeout_limit;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.guard_live_match_timeouts() from public,anon,authenticated;
create trigger guard_live_match_timeouts before insert or update of document
  on public.live_match_sheets for each row execute function public.guard_live_match_timeouts();
