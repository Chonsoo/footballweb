-- =========================================================
-- Migración 023 — nombre completo / alias de búsqueda
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- El nombre que se MUESTRA (name) se queda como lo da laliga.com (corto,
-- p.ej. "Giuliano" o "M. Llorente"). full_name es opcional y solo se usa
-- para que la búsqueda encuentre también por el apellido/nombre por el que
-- se conoce al jugador (p.ej. "Simeone" para Giuliano Simeone), sin cambiar
-- lo que se ve en la carta ni la clave de coincidencia del importador.
-- =========================================================

alter table public.fantasy_players
  add column if not exists full_name text;

update public.fantasy_players
set full_name = 'Giuliano Simeone'
where name = 'Giuliano Simeone' and full_name is null;
