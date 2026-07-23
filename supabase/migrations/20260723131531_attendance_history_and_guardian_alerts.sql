alter table public.notifications
  drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check
  check (
    kind in (
      'convocatoria',
      'match_reminder',
      'training_cancelled',
      'training_absence',
      'training_attendance_corrected',
      'news_pinned',
      'result_published',
      'monthly_close'
    )
  );

alter table public.notifications
  add column if not exists related_profile_id uuid references public.profiles(id) on delete cascade;

create index if not exists notifications_related_profile_created_at_idx
  on public.notifications (related_profile_id, created_at desc)
  where related_profile_id is not null;

create table public.training_attendance_audit (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  previous_present boolean,
  present boolean not null,
  previous_reason text,
  reason text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index training_attendance_audit_player_changed_at_idx
  on public.training_attendance_audit (player_id, changed_at desc);

create index training_attendance_audit_session_id_idx
  on public.training_attendance_audit (session_id);

alter table public.training_attendance_audit enable row level security;

create policy training_attendance_audit_select_authorized
  on public.training_attendance_audit
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.training_sessions as session
      where session.id = training_attendance_audit.session_id
        and public.can_manage_attendance_for(session.team_id)
    )
  );

revoke all on table public.training_attendance_audit from public, anon, authenticated;
grant select on table public.training_attendance_audit to authenticated;
grant all on table public.training_attendance_audit to service_role;
revoke all on sequence public.training_attendance_audit_id_seq from public, anon, authenticated;
grant all on sequence public.training_attendance_audit_id_seq to service_role;

create or replace function private.record_training_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.training_attendance_audit (
      session_id,
      player_id,
      previous_present,
      present,
      previous_reason,
      reason,
      changed_by
    )
    values (
      new.session_id,
      new.player_id,
      null,
      new.present,
      null,
      new.reason,
      new.marked_by
    );
  elsif old.present is distinct from new.present
    or old.reason is distinct from new.reason then
    insert into public.training_attendance_audit (
      session_id,
      player_id,
      previous_present,
      present,
      previous_reason,
      reason,
      changed_by
    )
    values (
      new.session_id,
      new.player_id,
      old.present,
      new.present,
      old.reason,
      new.reason,
      new.marked_by
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_training_attendance_change() from public, anon, authenticated;
grant execute on function private.record_training_attendance_change() to service_role;

create trigger training_attendance_record_change
  after insert or update on public.training_attendance
  for each row execute function private.record_training_attendance_change();

create or replace function private.notify_guardians_of_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row record;
  player_name text;
  notification_kind text;
  notification_title text;
  notification_body text;
  notification_href text;
begin
  if tg_op = 'INSERT' and new.present then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.present is not distinct from new.present then
    return new;
  end if;

  select
    session.scheduled_at,
    team.label as team_label
  into session_row
  from public.training_sessions as session
  join public.teams as team on team.id = session.team_id
  where session.id = new.session_id;

  select profile.full_name
  into player_name
  from public.profiles as profile
  where profile.id = new.player_id;

  if not new.present then
    notification_kind := 'training_absence';
    notification_title := 'Ausencia registrada';
    notification_body := format(
      '%s figura como ausente en el entrenamiento de %s del %s a las %s.',
      player_name,
      session_row.team_label,
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'DD/MM/YYYY'),
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'HH24:MI')
    );
  else
    notification_kind := 'training_attendance_corrected';
    notification_title := 'Asistencia corregida';
    notification_body := format(
      '%s figura ahora como presente en el entrenamiento de %s del %s a las %s.',
      player_name,
      session_row.team_label,
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'DD/MM/YYYY'),
      to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'HH24:MI')
    );
  end if;

  notification_href := format(
    '/attendance/history?player=%s&month=%s',
    new.player_id,
    to_char(session_row.scheduled_at at time zone 'Europe/Madrid', 'YYYY-MM')
  );

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    href,
    related_training_session_id,
    related_profile_id
  )
  select
    link.parent_profile_id,
    notification_kind,
    notification_title,
    notification_body,
    notification_href,
    new.session_id,
    new.player_id
  from public.parent_child_links as link
  where link.child_profile_id = new.player_id;

  return new;
end;
$$;

revoke all on function private.notify_guardians_of_attendance_change()
  from public, anon, authenticated;
grant execute on function private.notify_guardians_of_attendance_change() to service_role;

create trigger training_attendance_notify_guardians
  after insert or update on public.training_attendance
  for each row execute function private.notify_guardians_of_attendance_change();

drop policy if exists training_attendance_select_authenticated on public.training_attendance;
drop policy if exists training_attendance_select_authorized on public.training_attendance;

create policy training_attendance_select_authorized
  on public.training_attendance
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.profiles as own_profile
      where own_profile.id = training_attendance.player_id
        and own_profile.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links as link
      join public.profiles as parent_profile
        on parent_profile.id = link.parent_profile_id
      where link.child_profile_id = training_attendance.player_id
        and parent_profile.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.training_sessions as session
      where session.id = training_attendance.session_id
        and public.can_manage_attendance_for(session.team_id)
    )
  );

grant select, insert, update on table public.training_attendance to authenticated;
grant all on table public.training_attendance to service_role;
