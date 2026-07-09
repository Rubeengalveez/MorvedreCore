CREATE TABLE public.registration_codes (
  code text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('player', 'parent', 'coach', 'admin')),
  active boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage registration codes" ON public.registration_codes
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.profile_id
      WHERE p.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Everyone can read active codes to validate during signup
CREATE POLICY "Anyone can read active registration codes" ON public.registration_codes
  FOR SELECT TO public USING (active = true);

-- Seed initial codes
INSERT INTO public.registration_codes (code, role, description) VALUES
('MORVEDRE2026', 'player', 'Código de registro general para jugadores y familiares'),
('COACH2026', 'coach', 'Código de registro para entrenadores'),
('ADMIN2026', 'admin', 'Código de registro para administradores')
ON CONFLICT (code) DO NOTHING;
