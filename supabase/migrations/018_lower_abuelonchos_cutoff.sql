-- =========================================================
-- Migración 018 — Baja el corte de "abuelonchos" a 1996
--
-- Con el corte en 1994 salían muy pocos jugadores elegibles por equipo.
-- Se baja a nacidos ANTES del 1996-01-01, para tener más donde elegir.
-- Igual que la 017, se borra y se recrea la columna generada (no se puede
-- cambiar su expresión con un ALTER COLUMN normal).
-- =========================================================

alter table public.fantasy_players drop column if exists eligible_abuelonchos;

alter table public.fantasy_players
  add column eligible_abuelonchos boolean generated always as (birth_date is not null and birth_date < '1996-01-01') stored;
