-- S1: Restrict PII columns on profiles.
-- Strategy: keep an open SELECT policy for non-PII columns, restrict PII columns.

revoke all on public.profiles from authenticated;
grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;

revoke select (phone_e164, email_contact, notes) on public.profiles from authenticated;

grant select (phone_e164, email_contact, notes) on public.profiles to authenticated;

create or replace function public.can_see_profile_pii(target_profile_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select
    public.is_admin()
    or target_profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or target_profile_id in (
      select child_profile_id
      from public.parent_child_links
      where parent_profile_id in (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
    )
    or target_profile_id in (
      select parent_profile_id
      from public.parent_child_links
      where child_profile_id in (
        select id from public.profiles where auth_user_id = (select auth.uid())
      )
    );
$$;

grant execute on function public.can_see_profile_pii(uuid) to authenticated;

drop policy if exists profiles_select_pii_self_admin on public.profiles;

create policy profiles_select_pii_self_admin
  on public.profiles
  for select
  to authenticated
  using (public.can_see_profile_pii(id));
