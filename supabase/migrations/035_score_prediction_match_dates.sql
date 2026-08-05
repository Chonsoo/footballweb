-- Fechas ya conocidas de los 6 duelos Big Three (temporada 2026/27), para no
-- tener que meterlas una a una desde Admin -- ver campo "Fecha del partido"
-- en Bloque 3, que sigue disponible por si alguna cambia más adelante.
-- No toca el resultado ni los puntos, solo config.match_date (informativo).
update public.season_questions
set config = config || jsonb_build_object('match_date', '2026-09-20')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Atlético de Madrid'
  and config->>'away_team' = 'Real Madrid';

update public.season_questions
set config = config || jsonb_build_object('match_date', '2027-04-04')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Real Madrid'
  and config->>'away_team' = 'Atlético de Madrid';

update public.season_questions
set config = config || jsonb_build_object('match_date', '2026-10-25')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Barcelona'
  and config->>'away_team' = 'Real Madrid';

update public.season_questions
set config = config || jsonb_build_object('match_date', '2027-05-09')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Real Madrid'
  and config->>'away_team' = 'Barcelona';

update public.season_questions
set config = config || jsonb_build_object('match_date', '2026-11-08')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Atlético de Madrid'
  and config->>'away_team' = 'Barcelona';

update public.season_questions
set config = config || jsonb_build_object('match_date', '2027-02-07')
where answer_type = 'score_prediction'
  and config->>'home_team' = 'Barcelona'
  and config->>'away_team' = 'Atlético de Madrid';
