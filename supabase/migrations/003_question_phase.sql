-- =========================================================
-- Migración 003 — separar apuestas iniciales (fijas) de las de mitad de temporada
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

alter table public.season_questions
  add column if not exists phase text not null default 'initial';

alter table public.season_questions drop constraint if exists season_questions_phase_check;
alter table public.season_questions
  add constraint season_questions_phase_check
  check (phase in ('initial', 'weekly'));
