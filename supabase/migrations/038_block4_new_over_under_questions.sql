-- =========================================================
-- Migración 038 — Bloque 4 (Over/Under): 10 preguntas nuevas, 3 pts cada una
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Sustituye las 3 preguntas antiguas del Bloque 4 (sembradas en la 010, a
-- 5 pts cada una) por las 10 nuevas y definitivas, todas a 3 pts.
--
-- Borrar las preguntas antiguas arrastra en cascada (on delete cascade) sus
-- respuestas (season_answers) y su resultado fijado si lo hubiera
-- (season_results) -- no quedan huérfanos. Si algún participante ya había
-- contestado alguna de las 3 antiguas, esa respuesta se pierde con este
-- cambio (tendrá que volver a contestar las nuevas antes del cierre).
-- =========================================================

delete from public.season_questions
where phase = 'initial' and block = 4;

insert into public.season_questions (competition, question, answer_type, phase, block, config, points, closes_at)
values
  ('liga', 'Pichichi Absoluto: ¿El máximo goleador de LaLiga marcará más de 26.5 goles?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Puntos del Campeón: ¿El equipo campeón superará los 89.5 puntos?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Destituciones en Banquillos: ¿Habrá más de 8.5 destituciones de entrenadores durante la temporada?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Tarjetas en El Clásico: ¿Habrá más de 10.5 tarjetas sumando los dos Clásicos de liga?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Zamora Imbatible: ¿El portero Zamora logrará más de 18.5 porterías a cero?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Racha Victoriosa: ¿Habrá algún equipo con una racha de más de 7.5 victorias consecutivas?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Farolillo Rojo: ¿El último clasificado de LaLiga sumará más de 23.5 puntos?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Efecto Ascendido: ¿El mejor recién ascendido logrará más de 44.5 puntos?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Goleada de la Temporada: ¿Habrá algún partido en la liga con más de 8.5 goles entre los dos equipos?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null),
  ('liga', 'Pichichi Nacional: ¿Habrá más de 3.5 jugadores españoles entre los 10 máximos goleadores?', 'choice', 'initial', 4, '{"options":["Sí","No"]}', 3, null);
