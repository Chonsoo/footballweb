-- Nueva RPC: hasta ahora solo se podía fijar/actualizar un resultado real
-- (set_season_result), nunca "deshacerlo". Hace falta para el botón "Limpiar
-- resultado" del Bloque 4 (preguntas Sí/No): el admin puede querer dejar una
-- pregunta otra vez en blanco -- que nadie aparezca como acertante -- hasta
-- volver a fijarla más adelante en la temporada.
--
-- Borra la fila de season_results y además resetea los puntos ya aplicados
-- (season_answers.points/graded_at) de esa pregunta a null, para que
-- realmente "no salga correcta ninguna" hasta el siguiente guardado.
create or replace function public.clear_season_result(p_question_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  delete from public.season_results where question_id = p_question_id;

  update public.season_answers
  set points = null, graded_at = null
  where question_id = p_question_id;
end;
$$;
