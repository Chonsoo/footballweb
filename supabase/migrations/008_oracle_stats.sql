-- =========================================================
-- Migración 008 — agregados para "El oráculo"
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Las respuestas individuales están protegidas (RLS) hasta que cierra el
-- plazo de cada pregunta. Estas funciones devuelven solo recuentos
-- agregados (sin user_id ni respuesta identificable a nadie en concreto),
-- así que se pueden mostrar en "El oráculo" en cualquier momento sin
-- destapar el voto de nadie.
-- =========================================================

-- Para preguntas de texto / opción / marcador: cuenta cuántas veces se dio
-- cada respuesta exacta.
create or replace function public.oracle_answer_counts(p_question_id uuid)
returns table(answer_value jsonb, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select answer, count(*)::bigint as cnt
  from public.season_answers
  where question_id = p_question_id
  group by answer
  order by count(*) desc;
$$;

-- Para tier list: por cada equipo (sacado de config.items de la propia
-- pregunta), cuenta en qué categoría lo puso cada jugador. Si un jugador no
-- colocó el equipo explícitamente, cuenta como "media" (igual que hace la UI).
create or replace function public.oracle_tier_counts(p_question_id uuid)
returns table(team_id text, tier_id text, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    it ->> 'id' as team_id,
    coalesce(sa.answer ->> (it ->> 'id'), 'media') as tier_id,
    count(*)::bigint as cnt
  from public.season_questions q
  cross join lateral jsonb_array_elements(coalesce(q.config -> 'items', '[]'::jsonb)) as it
  join public.season_answers sa on sa.question_id = q.id
  where q.id = p_question_id
  group by 1, 2
  order by 1, count(*) desc;
$$;
