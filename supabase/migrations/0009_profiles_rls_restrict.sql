drop policy if exists profiles_select_authenticated on public.profiles;

create policy profiles_select_self_or_admin
  on public.profiles
  for select
  to authenticated
  using (
    public.is_admin()
    or auth_user_id = (select auth.uid())
    or exists (
      select 1
      from public.parent_child_links pcl
      join public.profiles me on me.id in (pcl.parent_profile_id, pcl.child_profile_id)
      where me.auth_user_id = (select auth.uid())
        and profiles.id in (pcl.parent_profile_id, pcl.child_profile_id)
        and profiles.id <> me.id
    )
  );

create or replace view public.profiles_public
with (security_invoker = true) as
select
  id,
  full_name,
  photo_url,
  birth_year,
  gender,
  cap_number,
  license_active
from public.profiles;

grant select on public.profiles_public to authenticated;
