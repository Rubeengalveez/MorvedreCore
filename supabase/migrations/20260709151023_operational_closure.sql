create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_profile_id_idx
  on public.push_subscriptions (profile_id, enabled);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  to authenticated
  using (
    profile_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy push_subscriptions_insert_own
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    profile_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy push_subscriptions_update_own
  on public.push_subscriptions
  for update
  to authenticated
  using (
    profile_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  )
  with check (
    profile_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy push_subscriptions_delete_own
  on public.push_subscriptions
  for delete
  to authenticated
  using (
    profile_id = (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create or replace function public.create_monthly_payment_reminders()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  with pending_profiles as (
    select
      tl.profile_id,
      count(*)::integer as pending_lines,
      sum(tl.amount_cents)::integer as pending_cents
    from public.treasury_lines tl
    join public.treasury_period_closures tpc on tpc.id = tl.closure_id
    where tl.paid = false
      and tpc.status in ('draft', 'sent')
      and tpc.period_start <= current_date
      and tpc.period_end >= (current_date - interval '45 days')::date
    group by tl.profile_id
  ),
  recipients as (
    select
      pp.profile_id as recipient_id,
      pp.pending_lines,
      pp.pending_cents
    from pending_profiles pp
    union
    select
      pcl.parent_profile_id as recipient_id,
      pp.pending_lines,
      pp.pending_cents
    from pending_profiles pp
    join public.parent_child_links pcl on pcl.child_profile_id = pp.profile_id
  ),
  inserted as (
    insert into public.notifications (recipient_id, kind, title, body, href)
    select
      r.recipient_id,
      'monthly_close',
      'Recordatorio de pagos',
      'Tienes importes pendientes en tesoreria. Revisa el detalle antes del cierre mensual.',
      '/treasury'
    from recipients r
    where not exists (
      select 1
      from public.notifications n
      where n.recipient_id = r.recipient_id
        and n.kind = 'monthly_close'
        and n.href = '/treasury'
        and n.created_at >= date_trunc('month', now())
    )
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

revoke execute on function public.create_monthly_payment_reminders() from public;
revoke execute on function public.create_monthly_payment_reminders() from anon;
revoke execute on function public.create_monthly_payment_reminders() from authenticated;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'morvedre_archive_expired_news') then
    perform cron.unschedule('morvedre_archive_expired_news');
  end if;

  perform cron.schedule(
    'morvedre_archive_expired_news',
    '10 * * * *',
    'select public.archive_expired_news();'
  );

  if exists (select 1 from cron.job where jobname = 'morvedre_monthly_payment_reminders') then
    perform cron.unschedule('morvedre_monthly_payment_reminders');
  end if;

  perform cron.schedule(
    'morvedre_monthly_payment_reminders',
    '0 9 25 * *',
    'select public.create_monthly_payment_reminders();'
  );
end;
$$;
