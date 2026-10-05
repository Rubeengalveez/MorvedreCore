begin;
select set_config('request.jwt.claim.sub',(select p.auth_user_id::text from public.profiles p join public.user_roles r on r.profile_id=p.id where r.role='admin' and r.scope_team_id is null and exists(select 1 from public.user_roles c where c.profile_id=p.id and c.role='coach') limit 1),true);
do $$
declare
  v_season uuid; v_team uuid:=gen_random_uuid(); v_team2 uuid:=gen_random_uuid(); v_series uuid:=gen_random_uuid(); v_block uuid:=gen_random_uuid(); v_block2 uuid:=gen_random_uuid(); v_joint uuid:=gen_random_uuid(); v_session uuid; v_exception uuid; v_conflict uuid:=gen_random_uuid(); v_date date:=(now() at time zone 'Europe/Madrid')::date+120; v_at timestamptz; v_payload jsonb; v_count int; v_failed boolean; v_player uuid:=gen_random_uuid();
begin
  select id into v_season from public.seasons where is_current;
  insert into public.teams(id,season_id,category_code,label,gender) values(v_team,v_season,'cadete','QA entrenamiento A','male'),(v_team2,v_season,'juvenil','QA entrenamiento B','male');
  insert into public.profiles(id,full_name,birth_year) values(v_player,'QA Participante',2010);
  insert into public.team_rosters(team_id,player_id) values(v_team,v_player);
  set local role authenticated;
  v_at:=(v_date+time '18:00') at time zone 'Europe/Madrid';
  v_payload:=jsonb_build_object('team_ids',jsonb_build_array(v_team,v_team2),'series_id',v_series,'block_ids','[]'::jsonb,'blocks',jsonb_build_array(
    jsonb_build_object('id',v_block,'schedule_slot_id',v_block,'team_id',v_team,'label','QA conjunto','kind','water','weekdays',jsonb_build_array(extract(isodow from v_date)),'start_date',v_date,'end_date',v_date+7,'start_time','18:00','end_time','19:30','location','QA piscina'),
    jsonb_build_object('id',v_block2,'schedule_slot_id',v_block2,'team_id',v_team2,'label','QA conjunto','kind','water','weekdays',jsonb_build_array(extract(isodow from v_date)),'start_date',v_date,'end_date',v_date+7,'start_time','18:00','end_time','19:30','location','QA piscina')),
    'sessions',jsonb_build_array(jsonb_build_object('block_id',v_block,'team_id',v_team,'joint_id',v_joint,'label','QA conjunto','kind','water','scheduled_at',v_at,'duration_minutes',90),jsonb_build_object('block_id',v_block2,'team_id',v_team2,'joint_id',v_joint,'label','QA conjunto','kind','water','scheduled_at',v_at,'duration_minutes',90)));
  perform public.manage_training_plan(v_payload);
  if (select count(*) from public.training_sessions where joint_id=v_joint)<>2 then raise exception 'FAIL joint training'; end if;
  select id into v_session from public.training_sessions where team_id=v_team and joint_id=v_joint;
  perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','edit','date',v_date,'start_time','17:00','end_time','18:30','player_ids',jsonb_build_array(v_player)));
  if not exists(select 1 from public.training_sessions where id=v_session and is_exception and original_scheduled_at=v_at and player_ids=array[v_player]) then raise exception 'FAIL exception'; end if;
  perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','cancel','reason','QA vacaciones'));
  v_payload:=jsonb_set(v_payload,'{block_ids}',jsonb_build_array(v_block,v_block2));
  v_block:=gen_random_uuid();v_block2:=gen_random_uuid();
  v_payload:=jsonb_set(v_payload,'{blocks,0,id}',to_jsonb(v_block));v_payload:=jsonb_set(v_payload,'{blocks,1,id}',to_jsonb(v_block2));v_payload:=jsonb_set(v_payload,'{sessions,0,block_id}',to_jsonb(v_block));v_payload:=jsonb_set(v_payload,'{sessions,1,block_id}',to_jsonb(v_block2));
  perform public.manage_training_plan(v_payload);
  if not exists(select 1 from public.training_sessions where id=v_session and cancelled) or (select count(*) from public.training_sessions where team_id=v_team)<>1 then raise exception 'FAIL cancelled exception preserved'; end if;
  insert into public.training_sessions(id,team_id,label,kind,scheduled_at,duration_minutes) values(v_conflict,v_team,'QA choque al reactivar','meeting',(v_date+time '17:00') at time zone 'Europe/Madrid',60);
  v_failed:=false;
  begin
    perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','restore'));
  exception when others then v_failed:=true; end;
  if not v_failed or not exists(select 1 from public.training_sessions where id=v_session and cancelled) then raise exception 'FAIL restore conflict'; end if;
  delete from public.training_sessions where id=v_conflict;
  perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','restore'));
  v_exception:=v_session;
  if exists(select 1 from public.training_sessions where id=v_session and cancelled) then raise exception 'FAIL restore'; end if;
  select count(*) into v_count from public.training_sessions where team_id in(v_team,v_team2);
  v_failed:=false;
  begin
    perform public.manage_training_plan(jsonb_build_object('team_ids',jsonb_build_array(v_team2),'blocks','[]'::jsonb,'sessions',jsonb_build_array(jsonb_build_object('team_id',v_team2,'joint_id',gen_random_uuid(),'kind','meeting','label','QA conflicto','scheduled_at',v_at,'duration_minutes',60))));
  exception when others then v_failed:=true; end;
  if not v_failed or (select count(*) from public.training_sessions where team_id in(v_team,v_team2))<>v_count then raise exception 'FAIL atomic conflict rollback'; end if;
  v_failed:=false;
  begin
    perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','edit','start_time','17:00','end_time','18:30','player_ids',jsonb_build_array(gen_random_uuid())));
  exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'FAIL outsider allowed'; end if;
  insert into public.training_sessions(team_id,label,kind,scheduled_at,duration_minutes,player_ids) values(v_team,'QA asistencia','water',now(),30,array[v_player]) returning id into v_session;
  insert into public.training_attendance(session_id,player_id,present,marked_by) values(v_session,v_player,true,(select id from public.profiles where auth_user_id=auth.uid()));
  v_failed:=false;
  begin
    perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','cancel','reason','QA protegido'));
  exception when others then v_failed:=true; end;
  if not v_failed or exists(select 1 from public.training_sessions where id=v_session and cancelled) then raise exception 'FAIL attendance protection'; end if;
  perform public.finish_training_plan(array[v_block,v_block2]);
  if not exists(select 1 from public.training_sessions where id=v_exception and cancelled) then raise exception 'FAIL finish preserved exception'; end if;
  if exists(select 1 from public.training_blocks where id in(v_block,v_block2) and is_active) then raise exception 'FAIL finish'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  v_failed:=false;
  begin
    perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','cancel','reason','QA sin permiso'));
  exception when others then v_failed:=true; end;
  if not v_failed then raise exception 'FAIL unauthorized action'; end if;
end; $$;
select set_config('request.jwt.claim.sub',(select p.auth_user_id::text from public.profiles p join public.user_roles r on r.profile_id=p.id where r.role='admin' and r.scope_team_id is null limit 1),true);
do $$
declare
  v_team uuid:=gen_random_uuid(); v_series uuid:=gen_random_uuid(); v_blocks uuid[]:=array[gen_random_uuid(),gen_random_uuid()]; v_slots uuid[]:=array[gen_random_uuid(),gen_random_uuid()]; v_old uuid[]; v_payload jsonb; v_day date:=(now() at time zone 'Europe/Madrid')::date+140; v_session uuid; i int;
begin
  insert into public.teams(id,season_id,category_code,label,gender) select v_team,id,'cadete','QA dos franjas','male' from public.seasons where is_current;
  set local role authenticated;
  for i in 1..3 loop
    v_payload:=jsonb_build_object('team_ids',jsonb_build_array(v_team),'series_id',v_series,'block_ids',coalesce(to_jsonb(v_old),'[]'::jsonb),'blocks','[]'::jsonb,'sessions','[]'::jsonb);
    for j in 1..2 loop
      v_payload:=jsonb_set(v_payload,'{blocks}',(v_payload->'blocks')||jsonb_build_array(jsonb_build_object('id',v_blocks[j],'schedule_slot_id',v_slots[j],'team_id',v_team,'kind','water','label','QA doble','weekdays',jsonb_build_array(extract(isodow from v_day)),'start_date',v_day,'end_date',v_day,'start_time',case when j=1 then '18:00' else '20:00' end,'end_time',case when j=1 then '19:00' else '21:00' end)));
      v_payload:=jsonb_set(v_payload,'{sessions}',(v_payload->'sessions')||jsonb_build_array(jsonb_build_object('block_id',v_blocks[j],'team_id',v_team,'kind','water','label','QA doble','joint_id',gen_random_uuid(),'scheduled_at',(v_day+case when j=1 then time '18:00' else time '20:00' end) at time zone 'Europe/Madrid','duration_minutes',60)));
    end loop;
    perform public.manage_training_plan(v_payload);
    if i=1 then
      select id into v_session from public.training_sessions where block_id=v_blocks[1];
      perform public.change_training_dates(jsonb_build_object('session_ids',jsonb_build_array(v_session),'operation','cancel','reason','QA solo primera franja'));
    end if;
    if (select count(*) from public.training_sessions where team_id=v_team)<>2 or not exists(select 1 from public.training_sessions where id=v_session and cancelled) then raise exception 'FAIL separate slots after replacement %',i; end if;
    v_old:=v_blocks; v_blocks:=array[gen_random_uuid(),gen_random_uuid()];
  end loop;
end; $$;
rollback;
