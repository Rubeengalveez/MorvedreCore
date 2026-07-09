-- 0030_profiles_insert_self.sql
-- Bug fix: permitir a un usuario autenticado crear SU PROPIO profile durante el onboarding.
-- Antes: solo admin y service_role podían hacer INSERT.
-- Ahora: un usuario autenticado puede hacer INSERT si el auth_user_id del profile coincide
-- con su propio auth.uid().

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles
  for insert
  to authenticated
  with check (auth_user_id = (select auth.uid()));
