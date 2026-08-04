-- =========================================================
-- Migración 022 — Trofeo Zamora: buscador limitado a porteros
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

update public.season_questions
set config = config || jsonb_build_object('player_position', 'POR')
where question = 'Trofeo Zamora: ¿quién será el portero menos goleado?';
