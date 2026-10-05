alter table public.profile_notification_prefs drop constraint profile_notification_prefs_notification_type_check;
alter table public.profile_notification_prefs add constraint profile_notification_prefs_notification_type_check check (notification_type in ('convocatoria','partidos','entrenamiento_cancelado','asistencia','pedido_pendiente','noticia_fijada','resultado_publicado','cierre_mensual','solicitudes_acceso'));
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('convocatoria','match_created','match_changed','match_cancelled','match_reminder','training_cancelled','training_changed','training_absence','training_attendance_corrected','news_pinned','shop_order','result_published','monthly_close','access_request'));

create table public.notification_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  last_error text,
  unique(notification_id, subscription_id)
);
alter table public.notification_push_deliveries enable row level security;
revoke all on public.notification_push_deliveries from anon, authenticated;
grant all on public.notification_push_deliveries to service_role;
create index notification_push_pending_idx on public.notification_push_deliveries(available_at) where status in ('pending','processing');
create index notifications_inbox_idx on public.notifications(recipient_id,created_at desc,id);
create index notifications_unread_idx on public.notifications(recipient_id) where read_at is null;

create function private.notification_push_topic(p_kind text, p_href text) returns text language sql immutable set search_path = '' as $$
  select case
    when p_kind = 'convocatoria' then 'convocatoria'
    when p_kind in ('match_created','match_changed','match_cancelled','match_reminder') then 'partidos'
    when p_kind in ('training_cancelled','training_changed') then 'entrenamiento_cancelado'
    when p_kind in ('training_absence','training_attendance_corrected') then 'asistencia'
    when p_kind = 'shop_order' or (p_kind = 'news_pinned' and p_href like '/shop/orders/%') then 'pedido_pendiente'
    when p_kind = 'news_pinned' then 'noticia_fijada'
    when p_kind = 'result_published' then 'resultado_publicado'
    when p_kind = 'monthly_close' then 'cierre_mensual'
    when p_kind = 'access_request' then 'solicitudes_acceso'
  end;
$$;
revoke all on function private.notification_push_topic(text,text) from public, anon, authenticated;
grant execute on function private.notification_push_topic(text,text) to service_role;

create function private.enqueue_notification_push() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notification_push_deliveries(notification_id,subscription_id)
  select new.id,s.id from public.push_subscriptions s
  join public.profiles p on p.id = s.profile_id and p.is_active
  where s.profile_id = new.recipient_id and s.enabled;
  return new;
end;
$$;
revoke all on function private.enqueue_notification_push() from public, anon, authenticated;
create trigger notifications_enqueue_push after insert on public.notifications for each row execute function private.enqueue_notification_push();

create function public.claim_notification_push(p_limit integer default 40)
returns table(job_id uuid,notification jsonb,subscription jsonb,muted boolean)
language plpgsql security invoker set search_path = '' as $$
begin
  update public.notification_push_deliveries d set status='skipped',finished_at=now()
  from public.notifications n where n.id=d.notification_id and d.status in ('pending','processing')
    and (n.created_at < now()-interval '24 hours' or (n.kind='match_reminder' and n.created_at < now()-interval '1 hour'));
  return query
  with candidates as (
    select d.id from public.notification_push_deliveries d
    where d.attempts < 5 and d.available_at <= now()
      and (d.status='pending' or (d.status='processing' and d.claimed_at < now()-interval '5 minutes'))
    order by d.available_at,d.id for update skip locked limit greatest(1,least(p_limit,100))
  ), claimed as (
    update public.notification_push_deliveries d set status='processing',claimed_at=now(),attempts=d.attempts+1
    from candidates c where d.id=c.id returning d.*
  )
  select d.id,to_jsonb(n),jsonb_build_object('id',s.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth),
    (not s.enabled or not p.is_active or not coalesce(pref.enabled,true))
  from claimed d join public.notifications n on n.id=d.notification_id
  join public.push_subscriptions s on s.id=d.subscription_id
  join public.profiles p on p.id=n.recipient_id
  left join public.profile_notification_prefs pref on pref.profile_id=n.recipient_id and pref.notification_type=private.notification_push_topic(n.kind,n.href);
end;
$$;
revoke all on function public.claim_notification_push(integer) from public,anon,authenticated;
grant execute on function public.claim_notification_push(integer) to service_role;

create function private.notify_match_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_kind text; v_title text; v_body text; v_team text;
begin
  select label into v_team from public.teams where id=new.team_id;
  if tg_op='INSERT' then
    if new.status <> 'scheduled' then return new; end if;
    v_kind := 'match_created'; v_title := 'Nuevo partido · ' || v_team;
  elsif new.status='played' and old.status <> 'played' and new.final_score_us is not null and new.final_score_them is not null then
    v_kind := 'result_published'; v_title := 'Resultado · ' || v_team;
  elsif new.status='cancelled' and old.status <> 'cancelled' then
    v_kind := 'match_cancelled'; v_title := 'Partido cancelado · ' || v_team;
  elsif new.status in ('scheduled','postponed') and (new.scheduled_at is distinct from old.scheduled_at or new.location is distinct from old.location or new.pool_name is distinct from old.pool_name or new.opponent is distinct from old.opponent or new.status is distinct from old.status) then
    v_kind := 'match_changed'; v_title := 'Partido actualizado · ' || v_team;
  else return new;
  end if;
  if v_kind='result_published' then
    v_body := format('%s %s–%s %s.',v_team,new.final_score_us,new.final_score_them,new.opponent);
  else
    v_body := format('%s contra %s. %s a las %s%s.',v_team,new.opponent,to_char(new.scheduled_at at time zone 'Europe/Madrid','DD/MM/YYYY'),to_char(new.scheduled_at at time zone 'Europe/Madrid','HH24:MI'),case when coalesce(new.pool_name,new.location) is not null then ' · '||coalesce(new.pool_name,new.location) else '' end);
  end if;
  insert into public.notifications(recipient_id,kind,title,body,href,related_match_id)
  select p.id,v_kind,v_title,v_body,'/matches/'||new.id::text,new.id
  from public.profiles p where p.is_active and p.id in (
    select r.player_id from public.team_rosters r where r.team_id=new.team_id and r.left_at is null
    union select c.player_id from public.match_callups c where c.match_id=new.id
    union select l.parent_profile_id from public.parent_child_links l where l.child_profile_id in (
      select r.player_id from public.team_rosters r where r.team_id=new.team_id and r.left_at is null
      union select c.player_id from public.match_callups c where c.match_id=new.id
    )
    union select s.profile_id from public.team_staff s where s.team_id=new.team_id
  );
  return new;
end;
$$;
revoke all on function private.notify_match_activity() from public,anon,authenticated;
create trigger matches_notify_activity after insert or update on public.matches for each row execute function private.notify_match_activity();

create function private.notify_match_callup() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_match record; v_name text;
begin
  if new.status not in ('called','confirmed') then return new; end if;
  select m.*,t.label as team_label into v_match from public.matches m join public.teams t on t.id=m.team_id where m.id=new.match_id;
  if v_match.status not in ('scheduled','postponed') then return new; end if;
  select full_name into v_name from public.profiles where id=new.player_id;
  insert into public.notifications(recipient_id,kind,title,body,href,related_match_id,related_profile_id)
  select p.id,'convocatoria','Convocatoria · '||v_match.team_label,
    format('%s está convocado contra %s el %s a las %s.',v_name,v_match.opponent,to_char(v_match.scheduled_at at time zone 'Europe/Madrid','DD/MM/YYYY'),to_char(v_match.scheduled_at at time zone 'Europe/Madrid','HH24:MI')),
    '/matches/'||new.match_id::text,new.match_id,new.player_id
  from public.profiles p where p.is_active and (p.id=new.player_id or p.id in (select l.parent_profile_id from public.parent_child_links l where l.child_profile_id=new.player_id))
    and not exists(select 1 from public.notifications n where n.recipient_id=p.id and n.kind='convocatoria' and n.related_match_id=new.match_id and n.related_profile_id=new.player_id);
  return new;
end;
$$;
revoke all on function private.notify_match_callup() from public,anon,authenticated;
create trigger match_callups_notify after insert on public.match_callups for each row execute function private.notify_match_callup();

create function private.notify_shop_order_activity() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_name text; v_title text; v_body text;
begin
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  if new.status not in ('pending_parent','pending_admin','delivered','rejected','cancelled') then return new; end if;
  select full_name into v_name from public.profiles where id=new.requested_by;
  v_title := case new.status when 'pending_parent' then 'Pedido pendiente de tu autorización' when 'pending_admin' then 'Pedido enviado a la tienda' when 'delivered' then 'Pedido entregado' when 'cancelled' then 'Pedido cancelado' else 'Pedido rechazado' end;
  v_body := format('%s · Pedido de %s por %s €.',v_title,v_name,to_char(new.total_cents/100.0,'FM999999990.00'));
  insert into public.notifications(recipient_id,kind,title,body,href,related_profile_id)
  select p.id,'shop_order',v_title,v_body,'/shop/orders/'||new.id::text,new.requested_by
  from public.profiles p where p.is_active and (p.id=new.requested_by or p.id in (select l.parent_profile_id from public.parent_child_links l where l.child_profile_id=new.requested_by));
  if new.status='pending_admin' then
    insert into public.notifications(recipient_id,kind,title,body,href,related_profile_id)
    select p.id,'shop_order','Nuevo pedido · '||v_name,v_body,'/admin/shop?view=orders',new.requested_by
    from public.profiles p where p.is_active and p.id in (select pp.profile_id from public.profile_permissions pp where pp.permission='manage_shop' union select ur.profile_id from public.user_roles ur where ur.role='admin' and ur.scope_team_id is null);
  end if;
  return new;
end;
$$;
revoke all on function private.notify_shop_order_activity() from public,anon,authenticated;
create trigger shop_orders_notify_activity after insert or update on public.shop_orders for each row execute function private.notify_shop_order_activity();
