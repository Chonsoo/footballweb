-- =========================================================
-- Migración 021 — nombres cortos que rompen la búsqueda
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- laliga.com muestra nombres de plantilla acortados para evitar ambigüedad
-- (p.ej. a Giuliano Simeone, hijo del entrenador del Atlético, lo lista solo
-- como "Giuliano" para no confundirlo con "Simeone" el técnico). Eso hace
-- que buscar por el apellido por el que la gente lo conoce ("Simeone") no
-- encuentre nada. Se corrige a mano caso por caso conforme se detectan —
-- un UPDATE directo, no vale re-pegar en el importador porque cambiar el
-- nombre cambia la clave de coincidencia (nombre+equipo) y crearía un
-- jugador duplicado en vez de actualizar el existente.
-- =========================================================

update public.fantasy_players
set name = 'Giuliano Simeone'
where name = 'Giuliano' and team_id = 'atletico-madrid';
