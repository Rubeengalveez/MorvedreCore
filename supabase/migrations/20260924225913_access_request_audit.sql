alter table public.access_requests drop constraint access_requests_status_check;
alter table public.access_requests add constraint access_requests_status_check
  check (status in ('pending', 'approved', 'activated', 'rejected'));

alter table public.access_requests
  add column rejected_at timestamptz,
  add column rejected_by_profile_id uuid references public.profiles(id) on delete set null;

create unique index user_roles_unique_unscoped
  on public.user_roles (profile_id, role)
  where scope_team_id is null;
