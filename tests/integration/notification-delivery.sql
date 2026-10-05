begin;
do $$
declare
  v_season uuid;
  v_team uuid;
  v_child uuid;
  v_parent uuid;
  v_match uuid;
  v_training uuid;
  v_order uuid;
  v_subscription uuid;
  v_notification uuid;
  v_job record;
  v_count integer;
begin
  select id into v_season from public.seasons where is_current;
  insert into public.profiles(full_name,birth_year) values('QA Aviso Jugador',2014) returning id into v_child;
  insert into public.profiles(full_name,birth_year) values('QA Aviso Familiar',1980) returning id into v_parent;
  insert into public.parent_child_links(parent_profile_id,child_profile_id,relation) values(v_parent,v_child,'mother');
  insert into public.teams(season_id,category_code,label,gender,team_type,color)
    values(v_season,'alevin','QA Avisos '||gen_random_uuid(),'male','competitive','#0A2E5C') returning id into v_team;
  insert into public.team_rosters(team_id,player_id,squad_number) values(v_team,v_child,1);
  insert into public.push_subscriptions(profile_id,endpoint,p256dh,auth,enabled)
    values(v_parent,'https://fcm.googleapis.com/fcm/send/qa-'||gen_random_uuid(),'QA-KEY','QA-AUTH',true) returning id into v_subscription;
  insert into public.matches(season_id,team_id,opponent,scheduled_at)
    values(v_season,v_team,'QA Rival',now()+interval '12 hours') returning id into v_match;
  if not exists(select 1 from public.notifications where kind='match_created' and related_match_id=v_match and recipient_id=v_parent) then raise exception 'El familiar no recibe el nuevo partido.'; end if;
  insert into public.match_callups(match_id,player_id,cap_number,status) values(v_match,v_child,1,'called') on conflict(match_id,player_id) do nothing;
  if not exists(select 1 from public.notifications where kind='convocatoria' and related_match_id=v_match and recipient_id=v_parent) then raise exception 'El familiar no recibe la convocatoria.'; end if;
  update public.matches set scheduled_at=scheduled_at+interval '1 hour' where id=v_match;
  if not exists(select 1 from public.notifications where kind='match_changed' and related_match_id=v_match and recipient_id=v_parent) then raise exception 'No se avisa del cambio de horario.'; end if;
  perform public.create_match_notification_reminders();
  select count(*) into v_count from public.notifications where kind='match_reminder' and related_match_id=v_match and recipient_id=v_parent;
  perform public.create_match_notification_reminders();
  if v_count <> 1 or (select count(*) from public.notifications where kind='match_reminder' and related_match_id=v_match and recipient_id=v_parent) <> 1 then raise exception 'El recordatorio no es idempotente.'; end if;
  update public.matches set status='played',final_score_us=4,final_score_them=3 where id=v_match;
  if not exists(select 1 from public.notifications where kind='result_published' and related_match_id=v_match and recipient_id=v_parent and body like '%4–3%') then raise exception 'No se publica el resultado.'; end if;
  insert into public.training_sessions(team_id,scheduled_at) values(v_team,now()+interval '2 days') returning id into v_training;
  update public.training_sessions set cancelled=true,cancellation_reason='QA cancelación' where id=v_training;
  if not exists(select 1 from public.notifications where kind='training_cancelled' and related_training_session_id=v_training and recipient_id=v_parent) then raise exception 'El familiar no recibe la cancelación del entrenamiento.'; end if;
  update public.training_sessions set cancelled=false,scheduled_at=scheduled_at+interval '1 hour' where id=v_training;
  if not exists(select 1 from public.notifications where kind='training_changed' and related_training_session_id=v_training and recipient_id=v_parent) then raise exception 'No se avisa de la reactivación.'; end if;
  update public.training_sessions set scheduled_at=now() where id=v_training;
  insert into public.training_attendance(session_id,player_id,present,marked_by) values(v_training,v_child,false,v_parent);
  if not exists(select 1 from public.notifications where kind='training_absence' and related_profile_id=v_child and recipient_id=v_parent) or not exists(select 1 from public.notifications where kind='training_absence' and related_profile_id=v_child and recipient_id=v_child) then raise exception 'La ausencia no llega a jugador y familiar.'; end if;
  update public.training_attendance set present=true where session_id=v_training and player_id=v_child;
  if not exists(select 1 from public.notifications where kind='training_attendance_corrected' and related_profile_id=v_child and recipient_id=v_parent) then raise exception 'No se avisa de la asistencia corregida.'; end if;
  insert into public.shop_orders(requested_by,status,total_cents) values(v_child,'pending_parent',1000) returning id into v_order;
  if not exists(select 1 from public.notifications where kind='shop_order' and recipient_id=v_parent and href='/shop/orders/'||v_order and title like '%autorización%') then raise exception 'El familiar no recibe el pedido pendiente de aprobación.'; end if;
  update public.shop_orders set status='pending_admin' where id=v_order;
  if not exists(select 1 from public.notifications where kind='shop_order' and recipient_id=v_parent and href='/shop/orders/'||v_order) then raise exception 'No se avisa del pedido confirmado.'; end if;
  update public.shop_orders set status='delivered' where id=v_order;
  if not exists(select 1 from public.notifications where kind='shop_order' and recipient_id=v_parent and title like '%entregado%') then raise exception 'No se avisa de la entrega del pedido.'; end if;
  insert into public.profile_notification_prefs(profile_id,notification_type,enabled) values(v_parent,'asistencia',false);
  insert into public.notifications(recipient_id,kind,title,body,href) values(v_parent,'training_absence','QA Ausencia','QA texto','/attendance/history') returning id into v_notification;
  if not exists(select 1 from public.notification_push_deliveries where notification_id=v_notification and subscription_id=v_subscription) then raise exception 'La notificación no entra en la cola.'; end if;
  execute 'set local role service_role';
  for v_job in select * from public.claim_notification_push(100) loop
    if v_job.notification->>'id'=v_notification::text and not v_job.muted then raise exception 'La preferencia desactivada no se respeta.'; end if;
  end loop;
  if (select attempts from public.notification_push_deliveries where notification_id=v_notification and subscription_id=v_subscription) <> 1 then raise exception 'La entrega no se reclama una vez.'; end if;
  if exists(select 1 from public.claim_notification_push(100) where notification->>'id'=v_notification::text) then raise exception 'Dos procesos pueden reclamar la misma entrega.'; end if;
  update public.notification_push_deliveries set attempts=5,claimed_at=now()-interval '6 minutes' where notification_id=v_notification;
  perform public.claim_notification_push(100);
  if (select status from public.notification_push_deliveries where notification_id=v_notification) <> 'failed' then raise exception 'La entrega agotada queda bloqueada.'; end if;
end;
$$;
select 'Eventos, familiares, preferencias, cola, reclamación y reintentos: correctos' as result;
rollback;
