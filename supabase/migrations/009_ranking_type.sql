-- =========================================================
-- Migración 009 — nuevo tipo de pregunta "ranking" (posición 1º-20º)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Sustituye a la tier list "por zonas" para la pregunta de "¿cómo va a
-- quedar la Liga?": ahora se pide la posición exacta de cada equipo
-- (1 a 20) y las zonas (Campeón/Champions/Europa League/Descenso/Media
-- tabla) se calculan automáticamente a partir de esa posición.
-- =========================================================

alter table public.season_questions
  drop constraint if exists season_questions_answer_type_check;

alter table public.season_questions
  add constraint season_questions_answer_type_check
  check (answer_type in ('text', 'choice', 'tier_list', 'score_prediction', 'ranking'));

-- El oráculo: recuentos agregados por equipo/posición para preguntas tipo
-- "ranking". El desglose por zona (Campeón/Champions/...) se calcula en el
-- cliente a partir de la posición, igual que hace la propia UI de respuesta.
create or replace function public.oracle_ranking_counts(p_question_id uuid)
returns table(team_id text, position int, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select kv.key as team_id, (kv.value #>> '{}')::int as position, count(*)::bigint as cnt
  from public.season_answers sa,
       jsonb_each(sa.answer) as kv(key, value)
  where sa.question_id = p_question_id
  group by kv.key, kv.value
  order by kv.key, count(*) desc;
$$;
