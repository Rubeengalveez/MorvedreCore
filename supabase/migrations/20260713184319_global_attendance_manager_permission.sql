create table public.profile_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (permission in ('manage_attendance')),
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, permission)
);

create index profile_permissions_granted_by_idx
  on public.profile_permissions (granted_by)
  where granted_by is not null;

alter table public.profile_permissions enable row level security;

create policy profile_permissions_select_authenticated
  on public.profile_permissions
  for select
  to authenticated
  using (true);

create policy profile_permissions_insert_admin
  on public.profile_permissions
  for insert
  to authenticated
  with check (public.is_admin());

create policy profile_permissions_update_admin
  on public.profile_permissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profile_permissions_delete_admin
  on public.profile_permissions
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.enforce_attendance_manager_is_coach()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.permission = 'manage_attendance'
    and not exists (
      select 1
      from public.team_staff as staff
      where staff.profile_id = new.profile_id
        and staff.role in ('head_coach', 'assistant_coach')
    )
  then
    raise exception 'attendance manager must be assigned as coach'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger profile_permissions_require_coach
  before insert or update on public.profile_permissions
  for each row execute function public.enforce_attendance_manager_is_coach();

create or replace function public.remove_attendance_permission_without_coach_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role in ('head_coach', 'assistant_coach')
    and not exists (
      select 1
      from public.team_staff as staff
      where staff.profile_id = old.profile_id
        and staff.role in ('head_coach', 'assistant_coach')
    )
  then
    delete from public.profile_permissions
    where profile_id = old.profile_id
      and permission = 'manage_attendance';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger team_staff_remove_orphan_attendance_permission
  after delete or update of profile_id, role on public.team_staff
  for each row execute function public.remove_attendance_permission_without_coach_assignment();

revoke all on function public.enforce_attendance_manager_is_coach() from public, anon, authenticated;
revoke all on function public.remove_attendance_permission_without_coach_assignment() from public, anon, authenticated;

insert into public.profile_permissions (profile_id, permission, granted_by)
select
  staff.profile_id,
  'manage_attendance',
  min(staff.granted_by::text)::uuid
from public.team_staff as staff
where staff.can_manage_attendance
  and staff.role in ('head_coach', 'assistant_coach')
group by staff.profile_id
on conflict (profile_id, permission) do nothing;

alter table public.team_staff
  drop constraint team_staff_attendance_coach_only_check;

alter table public.team_staff
  drop column can_manage_attendance;
