-- =========================================================
-- Migración 037 — "Abueloncho Dorado" (huevo de pascua de 5 pasos)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Tabla de progreso por usuario + función para avanzar de paso (comprueba
-- que sea justo el siguiente al que ya tenías, para que nadie se salte
-- pasos llamando al RPC a mano desde la consola) + suma el bonus de +10 a
-- la vista de clasificación general cuando el paso 5 está hecho.
-- =========================================================

create table if not exists public.easter_egg_progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  step int not null default 0 check (step between 0 and 5),
  captain_player_id int references public.fantasy_players (api_player_id),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.easter_egg_progress enable row level security;

-- Cada uno solo ve su propio progreso -- no hay política de insert/update
-- directa a propósito: todo pasa por easter_egg_advance() (security
-- definer), así nadie puede ponerse el paso 5 abriendo la consola del
-- navegador y llamando a supabase.from(...).update(...) directamente.
create policy "easter_egg_progress: select own"
  on public.easter_egg_progress for select to authenticated
  using (user_id = auth.uid());

create or replace function public.easter_egg_advance(p_step int, p_captain_player_id int default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_current int;
begin
  select step into v_current from public.easter_egg_progress where user_id = auth.uid();

  if v_current is null then
    v_current := 0;
    insert into public.easter_egg_progress (user_id, step) values (auth.uid(), 0);
  end if;

  if p_step <> v_current + 1 then
    raise exception 'Paso fuera de orden';
  end if;

  update public.easter_egg_progress
  set step = p_step,
      captain_player_id = coalesce(p_captain_player_id, captain_player_id),
      completed_at = case when p_step = 5 then now() else completed_at end,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

-- Clasificación general: se añade el bonus de +10 del huevo de pascua
-- (solo cuando completed_at no es null, es decir, con los 5 pasos hechos)
-- exactamente igual que el bonus de Fantasy -- otro left join más, sin
-- tocar el resto de la vista. Se expone también "egg_completed" (no solo
-- se suma al total) para poder pintar el nombre en dorado en Clasificación
-- y la línea del huevo en el desglose de puntos.
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
),
egg_bonus as (
  select user_id, 10 as bonus_points
  from public.easter_egg_progress
  where completed_at is not null
)
select
  p.id as user_id,
  p.username,
  coalesce(sa.total, 0) + coalesce(fb.bonus_points, 0) + coalesce(eb.bonus_points, 0) as total_points,
  p.favorite_team,
  (eb.user_id is not null) as egg_completed
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
left join fantasy_bonus fb on fb.user_id = p.id
left join egg_bonus eb on eb.user_id = p.id
where p.email_confirmed = true
order by total_points desc;
