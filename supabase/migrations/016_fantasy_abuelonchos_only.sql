-- =========================================================
-- Migración 016 — de momento solo existe el modo "abuelonchos"
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- El modo "open" (todos los jugadores, sin restricción de edad) se deja
-- aparcado para más adelante. Por ahora solo se permite 'abuelonchos'.
-- =========================================================

alter table public.fantasy_lineups drop constraint if exists fantasy_lineups_mode_check;
alter table public.fantasy_lineups add constraint fantasy_lineups_mode_check check (mode in ('abuelonchos'));
