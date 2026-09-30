do $test$
declare
  actor uuid := gen_random_uuid();
  delegate_id uuid;
  player uuid;
  season uuid;
  team uuid;
  mid uuid;
  device uuid := gen_random_uuid();
  mutation uuid := gen_random_uuid();
  doc jsonb;
  denied boolean;
begin
  insert into auth.users(id) values(actor);
  insert into public.profiles(auth_user_id,full_name) values(actor,'Prueba rotación delegado') returning id into delegate_id;
  insert into public.profiles(full_name) values('Prueba rotación jugador') returning id into player;
  insert into public.seasons(label,start_date,end_date,is_current) values('Prueba rotación','2095-09-01','2096-07-31',false) returning id into season;
  insert into public.teams(season_id,category_code,gender,label) values(season,'benjamin','mixed','Prueba rotación') returning id into team;
  insert into public.matches(season_id,team_id,opponent,scheduled_at) values(season,team,'Rival prueba','2095-10-01T12:00:00Z') returning id into mid;
  insert into public.match_callups(match_id,player_id,cap_number) values(mid,player,1);
  insert into public.team_staff(team_id,profile_id,role) values(team,delegate_id,'delegate');
  doc := jsonb_build_object('version',4,'category','benjamin','players',jsonb_build_array(jsonb_build_object('id',player,'name','Prueba','cap',1)),'opponentCaps','[1,2,3,4,5,6]'::jsonb,'periods',6,'period',1,'phase','playing','keeper',1,'baseline','[]'::jsonb,'baselineThem',0,'events',(select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'side','us','cap',1,'playerId',player,'kind','exclusion','period',1,'keeper',null,'deleted',false)) from generate_series(1,4)),
    'participation',jsonb_build_object('rulesVersion',1,'enabled',true,'opponentConfirmed',true,'fixedKeepers',jsonb_build_object('us',null,'them',null),'lineups',jsonb_build_array(jsonb_build_object('period',1,'side','us','keeper',player,'field','[]'::jsonb,'incident','Faltan jugadores'),jsonb_build_object('period',1,'side','them','keeper','1','field','["2","3","4","5","6"]'::jsonb)),'changes','[]'::jsonb));
  execute 'set local role service_role';
  if public.save_live_match_sheet(mid,delegate_id,device,0,mutation,doc) <> 1 then raise exception 'FAIL: guardado inicial'; end if;
  if not exists(select 1 from public.match_stats where match_id=mid and player_id=player and exclusions=4) then raise exception 'FAIL: cuarta expulsión Benjamín no guardada'; end if;
  if (select document->'participation' from public.live_match_sheets where match_id=mid) is distinct from doc->'participation' then raise exception 'FAIL: alineaciones perdidas'; end if;
  if public.save_live_match_sheet(mid,delegate_id,device,0,mutation,doc) <> 1 then raise exception 'FAIL: reintento duplicado'; end if;
  if public.save_live_match_sheet(mid,delegate_id,gen_random_uuid(),1,gen_random_uuid(),doc,true,false) <> 2 then raise exception 'FAIL: relevo con participación'; end if;
  execute 'reset role';
  update public.teams set category_code='infantil' where id=team;
  execute 'set local role service_role';
  denied := false;
  begin perform public.save_live_match_sheet(mid,delegate_id,device,2,gen_random_uuid(),doc,true,false); exception when others then denied := true; end;
  if not denied then raise exception 'FAIL: categoría manipulada aceptada'; end if;
  execute 'reset role';
end;
$test$;
