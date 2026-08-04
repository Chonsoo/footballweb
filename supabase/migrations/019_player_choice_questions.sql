-- =========================================================
-- Migración 019 — preguntas de jugador con buscador (escudo + nombre)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Las 5 preguntas que piden el nombre de un jugador (Pichichi, Zamora,
-- Zarra, Máximo Asistente y Pichichi "Clase Media") pasan de texto libre a
-- un buscador con desplegable, igual que se hizo con los equipos en la
-- migración 013. En vez de guardar una lista fija de opciones en config
-- (que quedaría desactualizada según se muevan fichajes), se guarda solo
-- 'player_choice': true — el desplegable busca en vivo contra
-- fantasy_players, así siempre refleja los jugadores que haya en ese
-- momento en la base de datos (ver Admin > "Jugadores fantasy" para
-- añadir/actualizar la plantilla completa de las 20 plantillas).
--
-- "Pichichi Clase Media" excluye explícitamente a los 3 grandes (Real
-- Madrid, Barcelona, Atlético de Madrid) del buscador, igual que ya excluía
-- esos equipos en el enunciado de la pregunta.
-- =========================================================

update public.season_questions
set answer_type = 'choice',
    config = jsonb_build_object('player_choice', true)
where question in (
  'Pichichi Absoluto: ¿quién será el máximo goleador de LaLiga esta temporada?',
  'Trofeo Zamora: ¿quién será el portero menos goleado?',
  'Trofeo Zarra: ¿quién será el máximo goleador español?',
  'Máximo Asistente: ¿quién dará más asistencias (pases de gol)?'
);

update public.season_questions
set answer_type = 'choice',
    config = jsonb_build_object(
      'player_choice', true,
      'exclude_team_ids', jsonb_build_array('real-madrid', 'barcelona', 'atletico-madrid')
    )
where question = 'Pichichi "Clase Media": ¿quién será el máximo goleador excluyendo a jugadores del Real Madrid, el Barcelona y el Atlético de Madrid?';
