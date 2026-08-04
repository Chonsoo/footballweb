-- La Clasificación general suma ahora también un bonus por el puesto en la
-- Liga fantasy (no los puntos fantasy en sí, sino puntos de premio según el
-- puesto): 1º 25, 2º 21, 3º 17, 4º 12, 5º 7, 6º 5, 7º 3, 8º 2, 9º 1, el
-- resto 0. Empates comparten puesto (estilo "1224", igual que el resto de
-- clasificaciones de la app) y el siguiente puesto salta el hueco -- lo hace
-- rank() sobre fantasy_leaderboard, que ya viene ordenada y filtrada a solo
-- jornadas jugadas.
create or replace view public.leaderboard as
with fantasy_ranked as (
  select
    user_id,
    rank() over (order by total_points desc) as fantasy_rank
  from public.fantasy_leaderboard
  where mode = 'abuelonchos'
),
fantasy_bonus as (
  select
    user_id,
    case fantasy_rank
      when 1 then 25
      when 2 then 21
      when 3 then 17
      when 4 then 12
      when 5 then 7
      when 6 then 5
      when 7 then 3
      when 8 then 2
      when 9 then 1
      else 0
    end as bonus_points
  from fantasy_ranked
)
select
  p.id as user_id,
  p.username,
  coalesce(sa.total, 0) + coalesce(fb.bonus_points, 0) as total_points,
  p.favorite_team
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
left join fantasy_bonus fb on fb.user_id = p.id
where p.email_confirmed = true
order by total_points desc;
