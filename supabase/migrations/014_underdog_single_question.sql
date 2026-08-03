-- =========================================================
-- Migración 014 — Podio Underdog: una sola pregunta, no tres
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Las 3 preguntas de podio underdog (oro/plata/bronce) no reflejaban bien
-- la mecánica real: no es que cada participante prediga por separado el 1º,
-- 2º y 3º equipo revelación. Cada uno elige UN solo equipo revelación (sin
-- competición europea previa) y, al resolver, el oro/plata/bronce salen de
-- comparar los equipos elegidos por TODOS los participantes: se lleva el
-- oro quien eligió el equipo que mejor quedó en la clasificación real (de
-- entre los elegidos), la plata el siguiente mejor y el bronce el
-- siguiente. Esto se califica a mano desde Admin > Resolver apuestas,
-- como el resto de preguntas de opción.
-- =========================================================

delete from public.season_questions
where question in (
  'Podio Underdog 🥇 Oro: de los equipos revelación (sin competición europea previa), ¿cuál acabará en la posición más alta?',
  'Podio Underdog 🥈 Plata: de los equipos revelación, ¿cuál acabará en la 2ª posición más alta?',
  'Podio Underdog 🥉 Bronce: de los equipos revelación, ¿cuál acabará en la 3ª posición más alta?'
);

insert into public.season_questions (competition, question, answer_type, phase, block, config, points, closes_at, created_at)
values (
  'liga',
  'Podio Underdog: de los equipos revelación (sin competición europea previa), ¿cuál crees que acabará más arriba en la clasificación final?',
  'choice',
  'initial',
  2,
  jsonb_build_object(
    'options', jsonb_build_array('Real Sociedad', 'Osasuna', 'Getafe', 'Alavés', 'Espanyol', 'Valencia', 'Sevilla', 'Levante', 'Elche', 'Racing de Santander', 'Deportivo de La Coruña', 'Málaga'),
    'team_ids', jsonb_build_array('real-sociedad', 'osasuna', 'getafe', 'alaves', 'espanyol', 'valencia', 'sevilla', 'levante', 'elche', 'racing-santander', 'deportivo-coruna', 'malaga')
  ),
  15,
  null,
  '2025-08-01 00:00:07+00'
);
