-- =========================================================
-- Migración 006 — corregir los escudos de la tier list ya creada
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- La pregunta "tier list" se creó antes de mover los escudos a
-- /public/badges, así que su config quedó guardada con las URLs viejas
-- de Wikipedia. Esto reemplaza solo el campo "items" (escudos) dejando
-- intactos los tiers y las respuestas ya dadas por los jugadores.
-- =========================================================

update public.season_questions
set config = jsonb_set(
  config,
  '{items}',
  '[
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
  ]'::jsonb
)
where answer_type = 'tier_list' and competition = 'liga';
