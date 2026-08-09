-- =========================================================
-- Migración 042 — Nueva fecha límite de "Apuestas iniciales"
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Cambia de sábado 14 de agosto 16:00 a miércoles 2 de septiembre 23:59
-- (hora de España peninsular, CEST = UTC+2 en septiembre). Ver
-- src/lib/deadlines.ts, que lleva la misma fecha en el cliente.
-- =========================================================

update public.season_questions
set closes_at = '2026-09-02T23:59:00+02:00'
where phase = 'initial';
