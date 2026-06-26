create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('convocatoria', 'match_reminder', 'training_cancelled', 'news_pinned', 'result_published', 'monthly_close')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  related_match_id uuid references public.matches(id) on delete cascade,
  related_training_session_id uuid references public.training_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_created_at_idx
  on public.notifications (recipient_id, created_at desc);

create index notifications_recipient_id_read_at_idx
  on public.notifications (recipient_id, read_at);

alter table public.notifications enable row level security;

create policy notifications_select_own_or_admin
  on public.notifications
  for select
  to authenticated
  using (
    public.is_admin()
    or recipient_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy notifications_insert_service_role
  on public.notifications
  for insert
  to service_role
  with check (true);

create policy notifications_update_own_or_admin
  on public.notifications
  for update
  to authenticated
  using (
    public.is_admin()
    or recipient_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or recipient_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy notifications_delete_admin
  on public.notifications
  for delete
  to authenticated
  using (public.is_admin());
