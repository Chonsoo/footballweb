-- =========================================================
-- Migración 012 — orden correcto de las preguntas dentro de cada bloque
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- La migración 010 insertó las 18 preguntas de golpe con "now()" como
-- created_at, y como el orden se decide por (block, created_at) esto podía
-- salir en cualquier orden si varias filas comparten el mismo timestamp.
-- Aquí se fija un created_at distinto y creciente por pregunta, siguiendo
-- exactamente el orden del documento original.
-- =========================================================

update public.season_questions set created_at = '2025-08-01 00:00:01+00' where question = 'Pichichi Absoluto: ¿quién será el máximo goleador de LaLiga esta temporada?';
update public.season_questions set created_at = '2025-08-01 00:00:02+00' where question = 'Trofeo Zamora: ¿quién será el portero menos goleado?';
update public.season_questions set created_at = '2025-08-01 00:00:03+00' where question = 'Trofeo Zarra: ¿quién será el máximo goleador español?';
update public.season_questions set created_at = '2025-08-01 00:00:04+00' where question = 'Máximo Asistente: ¿quién dará más asistencias (pases de gol)?';
update public.season_questions set created_at = '2025-08-01 00:00:05+00' where question = 'Pichichi "Clase Media": ¿quién será el máximo goleador excluyendo a jugadores del Real Madrid, el Barcelona y el Atlético de Madrid?';
update public.season_questions set created_at = '2025-08-01 00:00:06+00' where question = 'El Fiasco Europeo: de los equipos que jugaron competición europea la temporada pasada, ¿cuál acabará peor clasificado esta liga?';
update public.season_questions set created_at = '2025-08-01 00:00:07+00' where question = 'Podio Underdog 🥇 Oro: de los equipos revelación (sin competición europea previa), ¿cuál acabará en la posición más alta?';
update public.season_questions set created_at = '2025-08-01 00:00:08+00' where question = 'Podio Underdog 🥈 Plata: de los equipos revelación, ¿cuál acabará en la 2ª posición más alta?';
update public.season_questions set created_at = '2025-08-01 00:00:09+00' where question = 'Podio Underdog 🥉 Bronce: de los equipos revelación, ¿cuál acabará en la 3ª posición más alta?';

update public.season_questions set created_at = '2025-08-01 00:01:01+00' where question = 'Real Madrid vs Barcelona';
update public.season_questions set created_at = '2025-08-01 00:01:02+00' where question = 'Barcelona vs Real Madrid';
update public.season_questions set created_at = '2025-08-01 00:01:03+00' where question = 'Real Madrid vs Atlético de Madrid';
update public.season_questions set created_at = '2025-08-01 00:01:04+00' where question = 'Atlético de Madrid vs Real Madrid';
update public.season_questions set created_at = '2025-08-01 00:01:05+00' where question = 'Barcelona vs Atlético de Madrid';
update public.season_questions set created_at = '2025-08-01 00:01:06+00' where question = 'Atlético de Madrid vs Barcelona';

update public.season_questions set created_at = '2025-08-01 00:02:01+00' where question = '¿El Pichichi de la liga marcará más de 26.5 goles?';
update public.season_questions set created_at = '2025-08-01 00:02:02+00' where question = '¿El equipo campeón superará los 88.5 puntos?';
update public.season_questions set created_at = '2025-08-01 00:02:03+00' where question = '¿Habrá más de 4.5 destituciones de entrenadores en la liga?';
