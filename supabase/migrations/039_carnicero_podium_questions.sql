-- =========================================================
-- Migración 039 — Bloque 2: "Equipo Más Carnicero"
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Igual mecánica que el Podio Underdog actual (una sola pregunta, migración
-- 014): cada participante elige UN solo equipo (su "carnicero"). Al
-- resolverla desde Admin, en vez de calcularse solo desde la clasificación
-- real (como hace Underdog con Bloque 1), aquí el admin introduce a MANO el
-- oro/plata/bronce reales -- la app no guarda datos de tarjetas, así que no
-- hay forma de calcularlo automáticamente. Se decide fuera de la app mirando
-- el total de tarjetas de cada equipo (amarilla = 1 punto, roja = 2 puntos):
-- oro = el equipo con más puntos de tarjetas, plata = el 2º, bronce = el 3º.
--
-- Puntúa igual que Underdog: quien acertó el equipo que resultó oro se lleva
-- 15 pts, plata 8 pts, bronce 3 pts, el resto 0.
--
-- Equipos: los 20 de LaLiga (sin restricción), igual que el Bloque 1.
-- =========================================================

insert into public.season_questions (competition, question, answer_type, phase, block, config, points, closes_at)
values (
  'liga',
  'Equipo Más Carnicero: ¿qué equipo crees que sumará más puntos de tarjetas esta temporada (amarilla = 1 punto, roja = 2 puntos)?',
  'choice',
  'initial',
  2,
  jsonb_build_object(
    'options', jsonb_build_array('Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal', 'Real Betis', 'Real Sociedad', 'Rayo Vallecano', 'Celta de Vigo', 'Osasuna', 'Getafe', 'Alavés', 'Espanyol', 'Valencia', 'Sevilla', 'Levante', 'Elche', 'Racing de Santander', 'Deportivo de La Coruña', 'Málaga'),
    'team_ids', jsonb_build_array('real-madrid', 'barcelona', 'atletico-madrid', 'athletic-club', 'villarreal', 'real-betis', 'real-sociedad', 'rayo-vallecano', 'celta-vigo', 'osasuna', 'getafe', 'alaves', 'espanyol', 'valencia', 'sevilla', 'levante', 'elche', 'racing-santander', 'deportivo-coruna', 'malaga')
  ),
  15,
  null
);
