-- =========================================================
-- Migración 013 — respuestas de equipo con desplegable (escudo + nombre)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Las 4 preguntas del Bloque 2 que piden un equipo de LaLiga (Fiasco Europeo
-- y los 3 podios "underdog") pasan de texto libre a un desplegable de
-- equipos, igual que el selector de equipo favorito. Se guarda en config:
--   - options: nombres de los equipos permitidos (para el desplegable de
--     "resultado real" del admin y el auto-aplicar puntos)
--   - team_ids: mismos equipos por id, en el mismo orden (para pintar
--     escudo + nombre en el desplegable del jugador)
--
-- "El Fiasco Europeo" solo puede ser uno de los 8 equipos que jugaron
-- competición europea la temporada pasada (2025/26): Champions (5) =
-- Real Madrid, Barcelona, Atlético de Madrid, Athletic Club, Villarreal;
-- Europa League (2) = Real Betis, Celta de Vigo; Conference League (1) =
-- Rayo Vallecano.
--
-- Los 3 "Podio Underdog" solo pueden ser equipos SIN competición europea
-- previa, es decir el resto de los 20 equipos de LaLiga 2026/27.
-- =========================================================

update public.season_questions
set answer_type = 'choice',
    config = jsonb_build_object(
      'options', jsonb_build_array('Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal', 'Real Betis', 'Celta de Vigo', 'Rayo Vallecano'),
      'team_ids', jsonb_build_array('real-madrid', 'barcelona', 'atletico-madrid', 'athletic-club', 'villarreal', 'real-betis', 'celta-vigo', 'rayo-vallecano')
    )
where question = 'El Fiasco Europeo: de los equipos que jugaron competición europea la temporada pasada, ¿cuál acabará peor clasificado esta liga?';

update public.season_questions
set answer_type = 'choice',
    config = jsonb_build_object(
      'options', jsonb_build_array('Real Sociedad', 'Osasuna', 'Getafe', 'Alavés', 'Espanyol', 'Valencia', 'Sevilla', 'Levante', 'Elche', 'Racing de Santander', 'Deportivo de La Coruña', 'Málaga'),
      'team_ids', jsonb_build_array('real-sociedad', 'osasuna', 'getafe', 'alaves', 'espanyol', 'valencia', 'sevilla', 'levante', 'elche', 'racing-santander', 'deportivo-coruna', 'malaga')
    )
where question in (
  'Podio Underdog 🥇 Oro: de los equipos revelación (sin competición europea previa), ¿cuál acabará en la posición más alta?',
  'Podio Underdog 🥈 Plata: de los equipos revelación, ¿cuál acabará en la 2ª posición más alta?',
  'Podio Underdog 🥉 Bronce: de los equipos revelación, ¿cuál acabará en la 3ª posición más alta?'
);
