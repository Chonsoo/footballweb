-- Los duelos Big Three (y cualquier otra pregunta de tipo score_prediction,
-- por ejemplo alguna de apuestas flash) daban 0 puntos a quien acertaba el
-- 1x2 (quién gana o empate) pero no el marcador exacto -- solo se premiaba
-- el acierto exacto, todo o nada. Ahora se reparte en dos niveles que se
-- SUMAN (no son excluyentes):
--   - acertar el 1x2 (mismo signo local-visitante que el resultado real) -> 5 pts
--   - acertar además el marcador exacto -> 7 pts extra (12 en total)
--   - ni una cosa ni la otra -> 0 puntos
-- Los 5+7 son fijos para todo score_prediction, sin depender de los "points"
-- configurados en la pregunta (el admin ya no necesita elegir el 1x2 aparte:
-- al fijar el marcador real con set_season_result, el 1x2 se deduce solo).
-- Deben coincidir con SCORE_PREDICTION_1X2_POINTS / SCORE_PREDICTION_EXACT_BONUS
-- en src/lib/scorePrediction.ts.
-- El resto de tipos de pregunta (text/choice) siguen igual: todo o nada,
-- usando los "points" configurados en la pregunta.
create or replace function public.apply_season_result_points(p_question_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_points int;
  v_result jsonb;
  v_answer_type text;
  v_result_sign int;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select points, answer_type into v_points, v_answer_type from public.season_questions where id = p_question_id;
  select result into v_result from public.season_results where question_id = p_question_id;

  if v_result is null then
    raise exception 'Fija primero el resultado real con set_season_result';
  end if;

  if v_answer_type = 'score_prediction' then
    v_result_sign := sign((v_result->>'home')::int - (v_result->>'away')::int);

    update public.season_answers
    set points = case
        when answer = v_result then 12 -- 5 (1x2) + 7 (marcador exacto)
        when sign((answer->>'home')::int - (answer->>'away')::int) = v_result_sign then 5
        else 0
      end,
      graded_at = now()
    where question_id = p_question_id;
  else
    update public.season_answers
    set points = case when answer = v_result then v_points else 0 end,
        graded_at = now()
    where question_id = p_question_id;
  end if;
end;
$$;
