alter table public.team_staff
  add column can_manage_attendance boolean not null default false;

update public.team_staff
set can_manage_attendance = true
where role in ('head_coach', 'assistant_coach');

alter table public.team_staff
  add constraint team_staff_attendance_coach_only_check
  check (
    not can_manage_attendance
    or role in ('head_coach', 'assistant_coach')
  );
