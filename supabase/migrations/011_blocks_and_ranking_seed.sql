-- =========================================================
-- Migración 011 — bloques del formulario inicial + limpieza de la tier list vieja
-- Pega esto en Supabase Studio > SQL Editor > Run
-- (Ejecuta esto DESPUÉS de la 009 y la 010)
--
-- 1. Añade season_questions.block (1-4) para poder agrupar "Apuestas iniciales"
--    en los 4 bloques de la Porra Macro LaLiga.
-- 2. Borra la pregunta antigua de tier list (por zonas) y sus respuestas de prueba.
-- 3. Crea la pregunta del Bloque 1 (clasificación 1º-20º) ya con block = 1,
--    sustituyendo al botón "Crear clasificación de Liga" del panel de Admin
--    (que ya no hace falta: ahora forma parte del formulario inicial sembrado).
-- 4. Marca con su bloque (2, 3 o 4) las preguntas que sembró la migración 010.
-- =========================================================

alter table public.season_questions
  add column if not exists block int;

-- 2. Fuera la tier list vieja (cascada limpia season_answers y season_results).
delete from public.season_questions where answer_type = 'tier_list';

-- 3. Bloque 1: clasificación 1º-20º.
insert into public.season_questions (competition, question, answer_type, phase, block, config, points, closes_at)
values (
  'liga',
  '¿Cómo va a quedar la Liga? Ordena los 20 equipos del 1º al 20º',
  'ranking',
  'initial',
  1,
  '{
    "tiers": [
      {"id":"campeon","label":"Campeón","max":1},
      {"id":"champions","label":"Puestos Champions","max":3},
      {"id":"europa","label":"Europa League","max":2},
      {"id":"descenso","label":"Descenso","max":3}
    ],
    "items": [
      {"id":"real-madrid","name":"Real Madrid","badge":"/badges/real-madrid.png"},
      {"id":"barcelona","name":"Barcelona","badge":"/badges/barcelona.png"},
      {"id":"atletico-madrid","name":"Atlético de Madrid","badge":"/badges/atletico-madrid.png"},
      {"id":"athletic-club","name":"Athletic Club","badge":"/badges/athletic-club.png"},
      {"id":"villarreal","name":"Villarreal","badge":"/badges/villarreal.png"},
      {"id":"real-betis","name":"Real Betis","badge":"/badges/real-betis.png"},
      {"id":"real-sociedad","name":"Real Sociedad","badge":"/badges/real-sociedad.png"},
      {"id":"rayo-vallecano","name":"Rayo Vallecano","badge":"/badges/rayo-vallecano.png"},
      {"id":"celta-vigo","name":"Celta de Vigo","badge":"/badges/celta-vigo.png"},
      {"id":"osasuna","name":"Osasuna","badge":"/badges/osasuna.png"},
      {"id":"getafe","name":"Getafe","badge":"/badges/getafe.png"},
      {"id":"alaves","name":"Alavés","badge":"/badges/alaves.png"},
      {"id":"espanyol","name":"Espanyol","badge":"/badges/espanyol.png"},
      {"id":"valencia","name":"Valencia","badge":"/badges/valencia.png"},
      {"id":"sevilla","name":"Sevilla","badge":"/badges/sevilla.png"},
      {"id":"levante","name":"Levante","badge":"/badges/levante.png"},
      {"id":"elche","name":"Elche","badge":"/badges/elche.png"},
      {"id":"racing-santander","name":"Racing de Santander","badge":"/badges/racing-santander.png"},
      {"id":"deportivo-coruna","name":"Deportivo de La Coruña","badge":"/badges/deportivo-coruna.png"},
      {"id":"malaga","name":"Málaga","badge":"/badges/malaga.png"}
    ]
  }',
  5,
  null
);

-- 4. Bloques 2, 3 y 4 sobre lo sembrado por la migración 010 (si ya se ejecutó).
update public.season_questions set block = 2 where phase = 'initial' and question in (
  'Pichichi Absoluto: ¿quién será el máximo goleador de LaLiga esta temporada?',
  'Trofeo Zamora: ¿quién será el portero menos goleado?',
  'Trofeo Zarra: ¿quién será el máximo goleador español?',
  'Máximo Asistente: ¿quién dará más asistencias (pases de gol)?',
  'Pichichi "Clase Media": ¿quién será el máximo goleador excluyendo a jugadores del Real Madrid, el Barcelona y el Atlético de Madrid?',
  'El Fiasco Europeo: de los equipos que jugaron competición europea la temporada pasada, ¿cuál acabará peor clasificado esta liga?',
  'Podio Underdog 🥇 Oro: de los equipos revelación (sin competición europea previa), ¿cuál acabará en la posición más alta?',
  'Podio Underdog 🥈 Plata: de los equipos revelación, ¿cuál acabará en la 2ª posición más alta?',
  'Podio Underdog 🥉 Bronce: de los equipos revelación, ¿cuál acabará en la 3ª posición más alta?'
);

update public.season_questions set block = 3 where phase = 'initial' and question in (
  'Real Madrid vs Barcelona',
  'Barcelona vs Real Madrid',
  'Real Madrid vs Atlético de Madrid',
  'Atlético de Madrid vs Real Madrid',
  'Barcelona vs Atlético de Madrid',
  'Atlético de Madrid vs Barcelona'
);

update public.season_questions set block = 4 where phase = 'initial' and question in (
  '¿El Pichichi de la liga marcará más de 26.5 goles?',
  '¿El equipo campeón superará los 88.5 puntos?',
  '¿Habrá más de 4.5 destituciones de entrenadores en la liga?'
);
