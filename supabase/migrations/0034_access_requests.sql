-- 0033_access_requests.sql
-- Nuevo flujo de acceso admin-approved. Sustituye al registro por codigo de invitacion.

-- 1. Eliminar tabla y politicas antiguas de codigos de registro
DROP TABLE IF EXISTS public.registration_codes CASCADE;

-- 2. Quitar la politica que permitia a usuarios autenticados crear su propio perfil.
-- Ahora los perfiles se crean/vinculan unicamente durante la aprobacion de un admin.
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;

-- 3. Tabla de solicitudes de acceso
CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('player', 'parent', 'coach', 'delegate', 'directiva', 'admin')),
  birth_year smallint CHECK (birth_year IS NULL OR (birth_year BETWEEN 1900 AND 2100)),
  gender text CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  relation text CHECK (relation IS NULL OR relation IN ('mother', 'father', 'legal_guardian', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'activated')),
  candidate_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX access_requests_status_idx ON public.access_requests (status);
CREATE INDEX access_requests_email_idx ON public.access_requests (email);
CREATE INDEX access_requests_created_at_idx ON public.access_requests (created_at);
CREATE UNIQUE INDEX access_requests_one_pending_per_email ON public.access_requests (lower(email)) WHERE status = 'pending';

CREATE TRIGGER access_requests_set_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Tabla de hijos vinculados a una solicitud de padre
CREATE TABLE public.access_request_children (
  request_id uuid NOT NULL REFERENCES public.access_requests(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, child_profile_id)
);

CREATE INDEX access_request_children_child_idx ON public.access_request_children (child_profile_id);

-- 5. Tabla de configuracion de la app
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.app_settings (key, value) VALUES ('access_temp_password', 'Morvedre2026!')
ON CONFLICT (key) DO NOTHING;

CREATE TRIGGER app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_request_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- access_requests: cualquiera puede enviar una solicitud; los autenticados solo con su propio email
CREATE POLICY "Anon can submit access requests" ON public.access_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can submit own access requests" ON public.access_requests
  FOR INSERT TO authenticated WITH CHECK (email = (select auth.email()));

CREATE POLICY "Users can view own access requests and admins can view all" ON public.access_requests
  FOR SELECT TO authenticated USING (email = (select auth.email()) OR public.is_admin());

CREATE POLICY "Admins can manage access requests" ON public.access_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- access_request_children: solo admins
CREATE POLICY "Admins can manage access request children" ON public.access_request_children
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- app_settings: solo admins
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Funcion para buscar auth.users por email desde service_role sin usar `any`
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role;
