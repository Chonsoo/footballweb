-- fantasy_leaderboard sumaba TODAS las filas de fantasy_player_stats de los
-- jugadores de cada 11, aunque la jornada correspondiente no estuviera
-- todavía marcada como "jugada" en fantasy_matchdays. Eso podía dar un total
-- distinto al que ve el usuario en la pestaña Fantasy (Resumen/Jornadas),
-- que sí solo cuenta jornadas jugadas -- por ejemplo mientras un admin está
-- a medio rellenar una jornada. Se añade el filtro para que todo cuadre.
create or replace view public.fantasy_leaderboard as
select
  fl.mode,
  fl.user_id,
  p.username,
  coalesce(sum(fps.points), 0) as total_points
from public.fantasy_lineups fl
join public.profiles p on p.id = fl.user_id
left join public.fantasy_lineup_players flp on flp.lineup_id = fl.id
left join public.fantasy_player_stats fps
  on fps.player_id = flp.player_id
  and exists (
    select 1 from public.fantasy_matchdays fm
    where fm.number = fps.matchday_num and fm.played = true
  )
where p.email_confirmed = true
group by fl.mode, fl.user_id, p.username
order by fl.mode, total_points desc;
