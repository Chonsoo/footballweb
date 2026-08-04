-- Añade el equipo favorito a la vista de clasificación, para poder mostrar
-- su escudo junto a cada participante en el rediseño de Clasificación.
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  p.favorite_team,
  coalesce(mb.total, 0) + coalesce(sa.total, 0) as total_points
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.match_bets
  where points is not null
  group by user_id
) mb on mb.user_id = p.id
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
order by total_points desc;
