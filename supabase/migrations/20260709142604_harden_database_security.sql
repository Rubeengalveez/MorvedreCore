alter view public.profiles_public set (security_invoker = true);

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.get_auth_user_id_by_email(text) from public;
revoke execute on function public.get_auth_user_id_by_email(text) from anon;
revoke execute on function public.get_auth_user_id_by_email(text) from authenticated;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;

drop policy if exists "Anon can submit access requests" on public.access_requests;
create policy "Anon can submit access requests"
  on public.access_requests
  for insert
  to anon
  with check (
    status = 'pending'
    and candidate_profile_id is null
    and approved_by_profile_id is null
    and approved_at is null
  );

drop policy if exists news_storage_select on storage.objects;
drop policy if exists shop_images_select on storage.objects;
