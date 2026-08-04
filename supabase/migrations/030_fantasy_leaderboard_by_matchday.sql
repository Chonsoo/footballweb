-- Clasificación fantasy de una jornada concreta (para el desplegable
-- Total/Jn en la pestaña Fantasy > Liga fantasy). A diferencia de
-- fantasy_leaderboard (que suma todas las jornadas jugadas), aquí se separa
-- fila por fila (usuario, jornada) -- con left join para que un usuario que
-- ese día no puntuó siga saliendo con 0, en vez de desaparecer del listado.
create or replace view public.fantasy_leaderboard_by_matchday as
select
  fl.mode,
  fl.user_id,
  p.username,
  fm.number as matchday_num,
  coalesce(sum(fps.points), 0) as points
from public.fantasy_lineups fl
join public.profiles p on p.id = fl.user_id
cross join public.fantasy_matchdays fm
left join public.fantasy_lineup_players flp on flp.lineup_id = fl.id
left join public.fantasy_player_stats fps
  on fps.player_id = flp.player_id and fps.matchday_num = fm.number
where p.email_confirmed = true and fm.played = true
group by fl.mode, fl.user_id, p.username, fm.number
order by fl.mode, fm.number, points desc;
