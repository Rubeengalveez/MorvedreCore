create policy profiles_insert_admin
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());
