-- =========================================================
-- Migración 010 — siembra de las preguntas iniciales (Bloques 2, 3 y 4)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- El Bloque 1 (clasificación 1º-20º) ya se crea con el botón "Crear
-- clasificación de Liga" del panel de Admin. Esto añade el resto de
-- apuestas fijas de la "Porra Macro LaLiga": premios individuales,
-- los 6 duelos directos Real Madrid/Barça/Atleti, y los 3 over/under.
--
-- Los 3 duelos H2H de jugadores concretos (Bloque 4) NO se incluyen aquí
-- porque todavía no se han decidido los jugadores — créalos desde Admin
-- (tipo "Elegir una opción", 2 opciones) en cuanto los tengáis claros.
-- Si algo de esto se ejecuta dos veces, se duplican las preguntas: bórralas
-- desde Admin > Crear apuesta > "Últimas creadas" si hace falta repetirlo.
-- =========================================================

insert into public.season_questions (competition, question, answer_type, phase, config, points, closes_at)
values
  -- ---------- BLOQUE 2: Premios individuales y narrativos ----------
  ('liga', 'Pichichi Absoluto: ¿quién será el máximo goleador de LaLiga esta temporada?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Trofeo Zamora: ¿quién será el portero menos goleado?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Trofeo Zarra: ¿quién será el máximo goleador español?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Máximo Asistente: ¿quién dará más asistencias (pases de gol)?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Pichichi "Clase Media": ¿quién será el máximo goleador excluyendo a jugadores del Real Madrid, el Barcelona y el Atlético de Madrid?', 'text', 'initial', '{}', 10, null),
  ('liga', 'El Fiasco Europeo: de los equipos que jugaron competición europea la temporada pasada, ¿cuál acabará peor clasificado esta liga?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Podio Underdog 🥇 Oro: de los equipos revelación (sin competición europea previa), ¿cuál acabará en la posición más alta?', 'text', 'initial', '{}', 15, null),
  ('liga', 'Podio Underdog 🥈 Plata: de los equipos revelación, ¿cuál acabará en la 2ª posición más alta?', 'text', 'initial', '{}', 10, null),
  ('liga', 'Podio Underdog 🥉 Bronce: de los equipos revelación, ¿cuál acabará en la 3ª posición más alta?', 'text', 'initial', '{}', 5, null),

  -- ---------- BLOQUE 3: Duelos directos "Big Three" ----------
  ('liga', 'Real Madrid vs Barcelona', 'score_prediction', 'initial', '{"home_team":"Real Madrid","away_team":"Barcelona"}', 8, null),
  ('liga', 'Barcelona vs Real Madrid', 'score_prediction', 'initial', '{"home_team":"Barcelona","away_team":"Real Madrid"}', 8, null),
  ('liga', 'Real Madrid vs Atlético de Madrid', 'score_prediction', 'initial', '{"home_team":"Real Madrid","away_team":"Atlético de Madrid"}', 8, null),
  ('liga', 'Atlético de Madrid vs Real Madrid', 'score_prediction', 'initial', '{"home_team":"Atlético de Madrid","away_team":"Real Madrid"}', 8, null),
  ('liga', 'Barcelona vs Atlético de Madrid', 'score_prediction', 'initial', '{"home_team":"Barcelona","away_team":"Atlético de Madrid"}', 8, null),
  ('liga', 'Atlético de Madrid vs Barcelona', 'score_prediction', 'initial', '{"home_team":"Atlético de Madrid","away_team":"Barcelona"}', 8, null),

  -- ---------- BLOQUE 4: Over/Under ----------
  ('liga', '¿El Pichichi de la liga marcará más de 26.5 goles?', 'choice', 'initial', '{"options":["Sí","No"]}', 5, null),
  ('liga', '¿El equipo campeón superará los 88.5 puntos?', 'choice', 'initial', '{"options":["Sí","No"]}', 5, null),
  ('liga', '¿Habrá más de 4.5 destituciones de entrenadores en la liga?', 'choice', 'initial', '{"options":["Sí","No"]}', 5, null);
