-- =========================================================
-- Migración 024 — Trofeo Zarra: buscador limitado a jugadores españoles
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

update public.season_questions
set config = config || jsonb_build_object('player_nationality', 'ES')
where question = 'Trofeo Zarra: ¿quién será el máximo goleador español?';
