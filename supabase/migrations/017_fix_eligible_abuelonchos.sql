-- =========================================================
-- Migración 017 — Asegura que eligible_abuelonchos sea correcta
--
-- No hace falta saber si lanzaste la 015 antes o después del arreglo: esta
-- migración es idempotente, borra la columna generada y la vuelve a crear
-- con la expresión correcta (solo veteranos, nacidos ANTES del 1994-01-01,
-- son seleccionables). Si ya estaba bien, no cambia nada.
-- =========================================================

alter table public.fantasy_players drop column if exists eligible_abuelonchos;

alter table public.fantasy_players
  add column eligible_abuelonchos boolean generated always as (birth_date is not null and birth_date < '1994-01-01') stored;
