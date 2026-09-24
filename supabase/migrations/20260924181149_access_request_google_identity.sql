alter table public.access_requests
  add column auth_user_id uuid references auth.users(id) on delete set null,
  add column team_id uuid references public.teams(id) on delete set null;

alter table public.access_requests drop constraint access_requests_role_check;
alter table public.access_requests add constraint access_requests_role_check
  check (role in ('player', 'parent', 'staff', 'coach', 'delegate', 'directiva', 'admin'));

create index access_requests_auth_user_id_idx
  on public.access_requests (auth_user_id)
  where auth_user_id is not null;

create unique index access_requests_one_pending_per_player
  on public.access_requests (candidate_profile_id)
  where status = 'pending' and role = 'player' and candidate_profile_id is not null;

insert into public.user_roles (profile_id, role, scope_team_id)
select distinct profile_id, 'delegate', team_id
from public.team_staff
where role = 'delegate'
on conflict (profile_id, role, scope_team_id) do nothing;
