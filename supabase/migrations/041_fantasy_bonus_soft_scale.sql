-- =========================================================
-- Migración 041 — Nueva escala de bonus Fantasy → Clasificación general
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Caída suave: cada puesto vale 5 pts menos que el anterior del 1º al 9º
-- (45, 40, 35, 30, 25, 20, 15, 10, 5), con un colchón de 2 pts en el 10º
-- antes de caer a 0 desde el 11º. Sustituye a la escala anterior (25, 21,
-- 17, 12, 7, 5, 3, 2, 1), que bajaba de forma irregular y se aplanaba
-- demasiado pronto.
-- =========================================================

create or replace view public.leaderboard as
with fantasy_ranked as (
  select
    user_id,
    total_points as fantasy_points,
    rank() over (order by total_points desc) as fantasy_rank
  from public.fantasy_leaderboard
  where mode = 'abuelonchos'
),
fantasy_bonus as (
  select
    user_id,
    fantasy_points,
    case fantasy_rank
      when 1 then 45
      when 2 then 40
      when 3 then 35
      when 4 then 30
      when 5 then 25
      when 6 then 20
      when 7 then 15
      when 8 then 10
      when 9 then 5
      when 10 then 2
      else 0
    end as bonus_points
  from fantasy_ranked
),
egg_bonus as (
  select user_id, 10 as bonus_points
  from public.easter_egg_progress
  where completed_at is not null
),
block1_points as (
  select sa.user_id, sum(sa.points) as points
  from public.season_answers sa
  join public.season_questions sq on sq.id = sa.question_id
  where sq.block = 1 and sa.points is not null
  group by sa.user_id
)
select
  p.id as user_id,
  p.username,
  coalesce(sa.total, 0) + coalesce(fb.bonus_points, 0) + coalesce(eb.bonus_points, 0) as total_points,
  p.favorite_team,
  (eb.user_id is not null) as egg_completed,
  coalesce(b1.points, 0) as block1_points,
  coalesce(fb.fantasy_points, 0) as fantasy_points
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
left join fantasy_bonus fb on fb.user_id = p.id
left join egg_bonus eb on eb.user_id = p.id
left join block1_points b1 on b1.user_id = p.id
where p.email_confirmed = true
order by total_points desc, block1_points desc, fantasy_points desc;
