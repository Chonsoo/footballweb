-- =========================================================
-- Migración 020 — nacionalidad de jugador (para la carta Abueluchos FC)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Se guarda tal cual la muestra laliga.com (en inglés, p.ej. "Spain",
-- "France", "GB-ENG" para Inglaterra) — el frontend traduce a español y
-- añade la bandera con un mapeo (ver src/lib/nationalityFlags.ts). Guardarlo
-- en el idioma de origen evita tener que traducir a mano cada re-sync.
-- =========================================================

alter table public.fantasy_players
  add column if not exists nationality text;
