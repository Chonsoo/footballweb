-- Elimina por completo el sistema de "quiniela de resultados" (jornadas +
-- partidos + predicciones por partido), que nunca llegó a engancharse a la
-- navegación ni se ha usado. No confundir con fantasy_matchdays (jornadas
-- del fantasy, tabla totalmente distinta), que no se toca.

drop function if exists public.settle_match(uuid, int, int);

-- La vista leaderboard sumaba puntos de match_bets además de
-- season_answers -- se recalcula sin esa parte antes de poder borrar la
-- tabla. De paso se restaura el filtro "where p.email_confirmed = true"
-- que se había perdido sin querer en la migración 025 (se ve comparando
-- con la definición original en schema.sql).
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(sa.total, 0) as total_points,
  p.favorite_team
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
where p.email_confirmed = true
order by total_points desc;

drop table if exists public.match_bets;
drop table if exists public.matches;
drop table if exists public.matchdays;
