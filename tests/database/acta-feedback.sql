begin;
do $test$
declare
  actor_auth uuid := gen_random_uuid();
  actor uuid;
  player uuid;
  second_player uuid;
  season uuid;
  team uuid;
  mid uuid;
  device uuid := gen_random_uuid();
  category text;
  players jsonb;
  events jsonb;
  doc jsonb;
  next_doc jsonb;
  rev integer;
  rejected boolean;
  row_totals jsonb;
  score_value integer;
begin
  insert into auth.users(id) values(actor_auth);
  insert into public.profiles(auth_user_id,full_name) values(actor_auth,'Prueba feedback delegado') returning id into actor;
  insert into public.profiles(full_name) values('Prueba feedback jugador') returning id into player;
  insert into public.profiles(full_name) values('Prueba feedback segundo jugador') returning id into second_player;
  insert into public.seasons(label,start_date,end_date,is_current)
    values('Prueba feedback ' || gen_random_uuid(),'2095-09-01','2096-07-31',false) returning id into season;
  foreach category in array array['benjamin','alevin','infantil','cadete','juvenil','absoluto'] loop
    insert into public.teams(season_id,category_code,gender,label) values(season,category,'male','Prueba feedback ' || category) returning id into team;
    insert into public.matches(season_id,team_id,opponent,scheduled_at) values(season,team,'Rival prueba','2095-10-01T12:00:00Z') returning id into mid;
    insert into public.match_callups(match_id,player_id,cap_number) values(mid,player,1);
    insert into public.match_callups(match_id,player_id,cap_number) values(mid,second_player,2);
    insert into public.team_staff(team_id,profile_id,role) values(team,actor,'delegate');
    players := jsonb_build_array(jsonb_build_object('id',player,'cap',1,'name','Jugador de prueba'),
      jsonb_build_object('id',second_player,'cap',2,'name','Segundo jugador de prueba'));
    events := jsonb_build_array(
      jsonb_build_object('id',gen_random_uuid(),'side','us','cap',1,'kind','goal_counter','period',1,'keeper',null,'deleted',false),
      jsonb_build_object('id',gen_random_uuid(),'side','us','cap',1,'kind','shot_deflected','period',1,'keeper',null,'deleted',false),
      jsonb_build_object('id',gen_random_uuid(),'side','us','cap',1,'kind','defensive_block','period',1,'keeper',null,'deleted',false),
      jsonb_build_object('id',gen_random_uuid(),'side','them','cap',2,'kind','goal_extra','period',1,'keeper',1,'deleted',false)
    );
    doc := jsonb_build_object('version',1,'category',category,'players',players,'opponentCaps','[1,2]'::jsonb,
      'periods',4,'period',1,'phase','playing','keeper',1,'baseline','[]'::jsonb,'baselineThem',0,'events',events);
    execute 'set local role service_role';
    rev := public.save_live_match_sheet(mid,actor,device,0,gen_random_uuid(),doc);
    select goals into score_value from public.match_stats where match_id=mid and player_id=player;
    if score_value <> 1 then raise exception 'FAIL counter goal projection'; end if;
    if category not in ('benjamin','alevin') then
      events := events || jsonb_build_array(
        jsonb_build_object('id',gen_random_uuid(),'side','us','cap',null,'kind','timeout','period',1,'keeper',null,'deleted',false),
        jsonb_build_object('id',gen_random_uuid(),'side','us','cap',null,'kind','timeout','period',1,'keeper',null,'deleted',false),
        jsonb_build_object('id',gen_random_uuid(),'side','them','cap',null,'kind','timeout','period',1,'keeper',null,'deleted',false),
        jsonb_build_object('id',gen_random_uuid(),'side','them','cap',null,'kind','timeout','period',1,'keeper',null,'deleted',false)
      );
      doc := jsonb_set(doc,'{events}',events);
      rev := public.save_live_match_sheet(mid,actor,device,rev,gen_random_uuid(),doc);
    end if;
    for score_value in 1..2 loop
      next_doc := jsonb_set(doc,'{events}',events || jsonb_build_array(jsonb_build_object(
        'id',gen_random_uuid(),'side',case when score_value=1 then 'us' else 'them' end,
        'cap',null,'kind','timeout','period',1,'keeper',null,'deleted',false)));
      rejected := false;
      begin
        perform public.save_live_match_sheet(mid,actor,device,rev,gen_random_uuid(),next_doc);
      exception when others then
        if sqlerrm not like '%tiempos muertos%' then raise; end if;
        rejected := true;
      end;
      if not rejected then raise exception 'FAIL timeout cap for %', category; end if;
    end loop;
    doc := jsonb_set(doc,'{phase}','"finished"');
    if category = 'infantil' then
      doc := jsonb_set(doc,'{version}','3');
      doc := jsonb_set(doc,'{players}',jsonb_build_array(
        jsonb_build_object('id',player,'cap',2,'name','Jugador de prueba'),
        jsonb_build_object('id',second_player,'cap',1,'name','Segundo jugador de prueba')));
      select jsonb_agg(case when e->>'side'='us' and e->>'cap'='1' then e || jsonb_build_object('cap',2,'playerId',player,'capAtEvent',1)
        when e->>'side'='them' and e->>'keeper'='1' then e || jsonb_build_object('keeper',2,'keeperId',player,'keeperCapAtEvent',1) else e end)
        into events from jsonb_array_elements(doc->'events') e;
      doc := jsonb_set(doc,'{events}',events);
      rev := public.save_live_match_sheet(mid,actor,device,rev,gen_random_uuid(),doc,false,true);
      if not exists(select 1 from public.match_callups where match_id=mid and player_id=second_player and cap_number=1)
        then raise exception 'FAIL offline keeper swap callups'; end if;
    else
      rev := public.save_live_match_sheet(mid,actor,device,rev,gen_random_uuid(),doc);
    end if;
    if not exists(select 1 from public.matches where id=mid and final_score_us=1 and final_score_them=1 and status='played')
      then raise exception 'FAIL counter final score'; end if;
    execute 'reset role';
  end loop;
  select totals into row_totals from private.season_ranking_totals(season) where profile_id=player;
  if (row_totals->>'goals')::integer <> 6 or (row_totals->>'shots')::integer <> 12 or (row_totals->>'conceded')::integer <> 6
    then raise exception 'FAIL rankings totals: %', row_totals; end if;
  if has_function_privilege('authenticated','public.save_live_match_sheet(uuid,uuid,uuid,integer,uuid,jsonb,boolean,boolean)','execute')
    then raise exception 'FAIL direct client write'; end if;
end;
$test$;
select 'PASS: six categories, both teams, counter goals, blocked attempts, final score and rankings' as result;
rollback;
