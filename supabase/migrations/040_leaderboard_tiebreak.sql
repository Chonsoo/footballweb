-- =========================================================
-- Migración 040 — Desempate en la clasificación general
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Antes, un empate a puntos totales compartía posición sin más. Ahora:
--   1. Si empatan en total_points, desempata quien tenga más puntos en el
--      Bloque 1 (Clasificación de Liga).
--   2. Si también empatan ahí, desempata quien tenga más puntos en la liga
--      Fantasy (puntos reales de la liga, no el bonus que ya suma al total).
--   3. Si coinciden en los tres, ahí sí comparten posición (como antes).
--
-- Se añaden dos columnas nuevas a la vista (block1_points, fantasy_points)
-- para que el cliente pueda aplicar el mismo criterio al calcular las
-- posiciones con empates tipo "1224" (ver src/lib/ranking.ts).
--
-- Ojo: van AL FINAL del listado de columnas (después de favorite_team y
-- egg_completed), no donde "encajarían" mejor a la vista -- CREATE OR
-- REPLACE VIEW de Postgres no permite insertar columnas en medio (cambia la
-- posición de las que ya existían, y eso Postgres no lo deja: "cannot
-- change name of view column"), solo añadir columnas nuevas al final.
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
