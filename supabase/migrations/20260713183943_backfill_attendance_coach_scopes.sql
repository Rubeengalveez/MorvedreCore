insert into public.user_roles (profile_id, role, scope_team_id, granted_by)
select distinct
  staff.profile_id,
  'coach',
  staff.team_id,
  staff.granted_by
from public.team_staff as staff
where staff.can_manage_attendance
  and staff.role in ('head_coach', 'assistant_coach')
on conflict (profile_id, role, scope_team_id) do nothing;
