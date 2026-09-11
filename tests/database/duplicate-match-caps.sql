do $test$
declare actor uuid:=gen_random_uuid(); p uuid; one uuid; two uuid; three uuid; extra uuid; season uuid; team uuid; mid uuid; denied boolean; i integer;
begin
  insert into auth.users(id) values(actor);
  insert into public.profiles(auth_user_id,full_name) values(actor,'Prueba gorros delegado') returning id into p;
  insert into public.profiles(full_name) values('Prueba gorro uno') returning id into one;
  insert into public.profiles(full_name) values('Prueba gorro dos') returning id into two;
  insert into public.profiles(full_name) values('Prueba gorro tres') returning id into three;
  insert into public.seasons(label,start_date,end_date,is_current) values('Prueba gorros','2095-09-01','2096-07-31',false) returning id into season;
  insert into public.teams(season_id,category_code,gender,label) values(season,'cadete','male','Prueba gorros') returning id into team;
  insert into public.matches(season_id,team_id,opponent,scheduled_at) values(season,team,'Rival','2095-10-01T12:00:00Z') returning id into mid;
  insert into public.team_staff(team_id,profile_id,role) values(team,p,'delegate');
  insert into public.match_callups(match_id,player_id,cap_number) values(mid,one,1);
  denied:=false;begin insert into public.match_callups(match_id,player_id,cap_number) values(mid,two,1);exception when check_violation then denied:=true;end;
  if not denied then raise exception 'FAIL duplicate insertion accepted';end if;
  insert into public.match_callups(match_id,player_id,cap_number) values(mid,two,2);
  denied:=false;begin update public.match_callups set cap_number=1 where match_id=mid and player_id=two;exception when check_violation then denied:=true;end;
  if not denied then raise exception 'FAIL duplicate update accepted';end if;
  insert into public.match_callups(match_id,player_id,cap_number,status) values(mid,three,1,'declined');
  denied:=false;begin update public.match_callups set status='confirmed' where match_id=mid and player_id=three;exception when check_violation then denied:=true;end;
  if not denied then raise exception 'FAIL occupied cap reactivation accepted';end if;
  for i in 1..12 loop
    insert into public.profiles(full_name) values('Prueba límite '||i) returning id into extra;
    insert into public.match_callups(match_id,player_id,cap_number) values(mid,extra,i+2);
  end loop;
  insert into public.profiles(full_name) values('Prueba jugador quince') returning id into extra;
  denied:=false;begin insert into public.match_callups(match_id,player_id,cap_number) values(mid,extra,15);exception when check_violation then denied:=true;end;
  if not denied then raise exception 'FAIL fifteenth active callup accepted';end if;
  execute 'set local role service_role';
  perform public.prepare_live_match_caps(mid,p,jsonb_build_array(jsonb_build_object('id',one,'cap',2),jsonb_build_object('id',two,'cap',1)));
  if not exists(select 1 from public.match_callups where match_id=mid and player_id=one and cap_number=2) then raise exception 'FAIL atomic cap swap';end if;
  if (select count(*) from public.match_callups where match_id=mid and status in ('called','confirmed'))<>2 then raise exception 'FAIL omitted players not withdrawn';end if;
  execute 'reset role';
end;$test$;
