-- =========================================================
-- Migración 015 — Esquema del "11 ideal" (Fantasy Abuelonchos)
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Dos modos en paralelo, compartiendo la misma tabla de jugadores:
--   - 'abuelonchos': solo jugadores nacidos ANTES del 1994-01-01 (los "abuelos"
--     de verdad, los más veteranos — solo ellos se pueden elegir en este modo)
--   - 'open': cualquier jugador de LaLiga
--
-- El 11 de cada usuario se guarda como una fila en fantasy_lineups +
-- 11 filas en fantasy_lineup_players (una por hueco: posición + índice
-- dentro de esa posición, según la formación elegida). Los datos reales
-- de rendimiento por jornada (minutos, goles, asistencias, tarjetas,
-- portería a cero) se guardan en fantasy_player_stats — de momento vacía,
-- se rellenará desde una Supabase Edge Function que hable con
-- API-Football, y por ahora también se puede rellenar a mano desde Admin.
--
-- La puntuación se calcula siempre con la misma función
-- fantasy_calculate_points(), para que no haya dos sitios con la fórmula
-- (y así se pueda cambiar la tabla de puntos en un solo lugar si hace falta).
-- =========================================================

-- ---------- FANTASY_PLAYERS ----------
-- 'player_position' en vez de 'position' porque 'position' es palabra
-- reservada en SQL y ya nos dio un error de sintaxis con esto antes.
create table if not exists public.fantasy_players (
  api_player_id int primary key,       -- id del jugador en API-Football (fuente de verdad)
  name text not null,
  team_id text,                        -- id interno (coincide con teamData.ts), null hasta mapear
  api_team_id int,                     -- id de equipo en API-Football (para re-sincronizar)
  player_position text not null check (player_position in ('POR', 'DEF', 'MED', 'DEL')),
  birth_date date,
  photo_url text,
  -- true = jugador "veterano" seleccionable en el modo Abuelonchos (nacido antes de 1994)
  eligible_abuelonchos boolean generated always as (birth_date is not null and birth_date < '1994-01-01') stored,
  active boolean not null default true, -- por si un jugador sale de LaLiga a mitad de temporada
  created_at timestamptz not null default now()
);

alter table public.fantasy_players enable row level security;

create policy "fantasy_players: select all authenticated"
  on public.fantasy_players for select to authenticated using (true);

create policy "fantasy_players: admin write"
  on public.fantasy_players for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- FANTASY_LINEUPS (el 11 de cada usuario, por modo) ----------
create table if not exists public.fantasy_lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('abuelonchos', 'open')),
  formation jsonb not null default '{"DEF": 4, "MED": 4, "DEL": 2}'::jsonb, -- portero siempre 1, implícito
  locked boolean not null default false, -- true = inamovible; a partir de aquí no se puede editar
  created_at timestamptz not null default now(),
  unique (user_id, mode)
);

alter table public.fantasy_lineups enable row level security;

create policy "fantasy_lineups: select own or admin or locked"
  on public.fantasy_lineups for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()) or locked = true);

create policy "fantasy_lineups: insert own"
  on public.fantasy_lineups for insert to authenticated
  with check (user_id = auth.uid());

create policy "fantasy_lineups: update own while unlocked"
  on public.fantasy_lineups for update to authenticated
  using (user_id = auth.uid() and locked = false)
  with check (user_id = auth.uid());

-- ---------- FANTASY_LINEUP_PLAYERS (los 11 huecos rellenados) ----------
create table if not exists public.fantasy_lineup_players (
  lineup_id uuid not null references public.fantasy_lineups (id) on delete cascade,
  slot_position text not null check (slot_position in ('POR', 'DEF', 'MED', 'DEL')),
  slot_index int not null,             -- 1..N dentro de esa posición, según la formación
  player_id int not null references public.fantasy_players (api_player_id),
  primary key (lineup_id, slot_position, slot_index),
  unique (lineup_id, player_id)        -- un jugador no puede repetirse en el mismo 11
);

alter table public.fantasy_lineup_players enable row level security;

create policy "fantasy_lineup_players: select visible lineups"
  on public.fantasy_lineup_players for select to authenticated
  using (
    exists (
      select 1 from public.fantasy_lineups fl
      where fl.id = lineup_id
        and (fl.user_id = auth.uid() or public.is_admin(auth.uid()) or fl.locked = true)
    )
  );

create policy "fantasy_lineup_players: write own while unlocked"
  on public.fantasy_lineup_players for all to authenticated
  using (
    exists (
      select 1 from public.fantasy_lineups fl
      where fl.id = lineup_id and fl.user_id = auth.uid() and fl.locked = false
    )
  )
  with check (
    exists (
      select 1 from public.fantasy_lineups fl
      where fl.id = lineup_id and fl.user_id = auth.uid() and fl.locked = false
    )
  );

-- ---------- FANTASY_PLAYER_STATS (rendimiento real por jornada) ----------
-- 'player_position' se guarda aquí también (duplicado desde fantasy_players
-- en el momento de insertar) para poder calcular los puntos sin un join.
create table if not exists public.fantasy_player_stats (
  matchday_num int not null,
  player_id int not null references public.fantasy_players (api_player_id),
  player_position text not null check (player_position in ('POR', 'DEF', 'MED', 'DEL')),
  minutes int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  own_goals int not null default 0,
  clean_sheet boolean not null default false,
  points int not null default 0,       -- calculado automáticamente, ver trigger más abajo
  updated_at timestamptz not null default now(),
  primary key (matchday_num, player_id)
);

alter table public.fantasy_player_stats enable row level security;

create policy "fantasy_player_stats: select all authenticated"
  on public.fantasy_player_stats for select to authenticated using (true);

create policy "fantasy_player_stats: admin write"
  on public.fantasy_player_stats for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- TABLA DE PUNTOS (única fuente de verdad) ----------
-- Portero  : gol +8, asistencia +6, portería a cero +5
-- Defensa  : gol +6, asistencia +5, portería a cero +4
-- Medio    : gol +5, asistencia +4, portería a cero +1
-- Delantero: gol +4, asistencia +3, portería a cero +0
-- Todas las posiciones: 1-59 min +1, 60+ min +2, amarilla -1, roja -3, gol en propia -2.
-- La portería a cero solo cuenta si jugó 60+ minutos.
create or replace function public.fantasy_calculate_points(
  p_position text,
  p_minutes int,
  p_goals int,
  p_assists int,
  p_yellow_cards int,
  p_red_cards int,
  p_own_goals int,
  p_clean_sheet boolean
)
returns int
language sql
immutable
as $$
  select
    (case when p_minutes >= 60 then 2 when p_minutes >= 1 then 1 else 0 end)
    + p_goals * (case p_position when 'POR' then 8 when 'DEF' then 6 when 'MED' then 5 else 4 end)
    + p_assists * (case p_position when 'POR' then 6 when 'DEF' then 5 when 'MED' then 4 else 3 end)
    + (case when p_clean_sheet and p_minutes >= 60 then
        (case p_position when 'POR' then 5 when 'DEF' then 4 when 'MED' then 1 else 0 end)
      else 0 end)
    - p_yellow_cards * 1
    - p_red_cards * 3
    - p_own_goals * 2
$$;

create or replace function public.fantasy_apply_points()
returns trigger
language plpgsql
as $$
begin
  new.points := public.fantasy_calculate_points(
    new.player_position, new.minutes, new.goals, new.assists,
    new.yellow_cards, new.red_cards, new.own_goals, new.clean_sheet
  );
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fantasy_apply_points_trg on public.fantasy_player_stats;
create trigger fantasy_apply_points_trg
  before insert or update on public.fantasy_player_stats
  for each row execute procedure public.fantasy_apply_points();

-- ---------- CLASIFICACIÓN FANTASY (por modo) ----------
create or replace view public.fantasy_leaderboard as
select
  fl.mode,
  fl.user_id,
  p.username,
  coalesce(sum(fps.points), 0) as total_points
from public.fantasy_lineups fl
join public.profiles p on p.id = fl.user_id
left join public.fantasy_lineup_players flp on flp.lineup_id = fl.id
left join public.fantasy_player_stats fps on fps.player_id = flp.player_id
where p.email_confirmed = true
group by fl.mode, fl.user_id, p.username
order by fl.mode, total_points desc;
