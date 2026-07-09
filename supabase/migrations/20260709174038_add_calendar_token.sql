-- Add calendar_token column to profiles
ALTER TABLE public.profiles ADD COLUMN calendar_token uuid UNIQUE DEFAULT gen_random_uuid();

-- Populate existing rows
UPDATE public.profiles SET calendar_token = gen_random_uuid() WHERE calendar_token IS NULL;

-- Make calendar_token NOT NULL
ALTER TABLE public.profiles ALTER COLUMN calendar_token SET NOT NULL;

-- Restrict SELECT on calendar_token for authenticated users
REVOKE SELECT (calendar_token) ON public.profiles FROM authenticated;
GRANT SELECT (calendar_token) ON public.profiles TO authenticated;
