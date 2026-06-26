-- Seed inicial minimo.
-- El primer admin (galvillo9@gmail.com) se crea con `pnpm bootstrap`.
-- Sembramos 3 temporadas para que el admin tenga contexto historico y actual.

insert into public.seasons (label, start_date, end_date, is_current, archived_at) values
  ('2024/2025', '2024-09-01', '2025-07-31', false, '2025-08-15T00:00:00Z'::timestamptz),
  ('2025/2026', '2025-09-01', '2026-07-31', false, '2026-06-30T00:00:00Z'::timestamptz),
  ('2026/2027', '2026-09-01', '2027-07-31', true, null);
