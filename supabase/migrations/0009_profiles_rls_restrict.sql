create or replace view public.profiles_public
with (security_invoker = true) as
select
  id,
  full_name,
  photo_url,
  birth_year,
  gender,
  cap_number,
  license_active,
  team_color
from public.profiles;

grant select on public.profiles_public to authenticated;

-- La policy de SELECT abierta sobre profiles (de 0001) se mantiene intencionalmente.
-- En una app de club los miembros necesitan ver a los demas miembros.
-- Las columnas verdaderamente privadas (phone_e164, email_contact) son responsabilidad
-- del codigo de la app: nunca se deben seleccionar en vistas compartidas (team, dashboard, etc).
-- Para acceso privado, usar la policy self-or-admin (futura migracion) o chequear en Server Actions.

comment on view public.profiles_public is
  'Vista con las columnas no sensibles de profiles. Usar para todas las listas compartidas (rosters, equipos, rankings). NO incluir phone_e164 ni email_contact.';
