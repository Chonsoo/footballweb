-- Jornadas del fantasy (independiente de "matchdays", que es de las
-- quinielas de resultados). Solo sirve para marcar qué jornadas ya se han
-- jugado -- fantasy_player_stats no tiene ese concepto, solo guarda
-- matchday_num suelto -- así la visualización por jugador/equipo del
-- fantasy sabe qué jornadas mostrar como cerradas.
create table if not exists public.fantasy_matchdays (
  number int primary key,
  played boolean not null default false,
  played_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.fantasy_matchdays enable row level security;

create policy "fantasy_matchdays: select all authenticated"
  on public.fantasy_matchdays for select to authenticated using (true);

create policy "fantasy_matchdays: admin write"
  on public.fantasy_matchdays for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
