create index if not exists news_posts_expires_at_idx
  on public.news_posts (expires_at)
  where expires_at is not null;

create or replace function public.remove_news_notifications_on_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.notifications
  where kind = 'news_pinned'
    and href = '/news/' || old.id::text;
  return old;
end;
$$;

create trigger news_posts_remove_notifications
  before delete on public.news_posts
  for each row execute function public.remove_news_notifications_on_delete();

revoke execute on function public.remove_news_notifications_on_delete() from public, anon, authenticated;

create or replace function public.purge_expired_news()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.news_posts where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.purge_expired_news() from public, anon, authenticated;
grant execute on function public.purge_expired_news() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'morvedre_archive_expired_news') then
    perform cron.unschedule('morvedre_archive_expired_news');
  end if;

  perform cron.schedule(
    'morvedre_purge_expired_news',
    '10 * * * *',
    'select public.purge_expired_news();'
  );
end;
$$;

drop function if exists public.archive_expired_news();

select public.purge_expired_news();
