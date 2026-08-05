-- =========================================================
-- Migración 036 — Ver las respuestas y el 11 de los demás sin esperar
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- Hasta ahora, "season_answers" (Apuestas iniciales/flash) y los "11" de
-- Fantasy solo se podían leer si eran tuyos, si eras admin, o (en teoría)
-- una vez pasado el plazo de esa pregunta/temporada -- pero como el plazo de
-- Apuestas iniciales no se guarda por pregunta (closes_at va a null, el
-- límite real es una fecha fija en el código) y los "11" no se bloquean
-- (locked) hasta que un admin lo haga a mano, en la práctica nunca se veían
-- las respuestas/11 de nadie más salvo con cuenta admin.
--
-- Se decide abrir la lectura del todo: cualquier usuario logueado puede ver
-- las respuestas y el 11 de cualquier otro participante, esté o no cerrado
-- el plazo (Fantasy, Apuestas detalladas, el desglose de puntos de
-- Clasificación, etc. ya asumían poder mostrar esto). Solo cambia quién
-- puede LEER -- insertar/editar sigue restringido a lo propio y con el plazo
-- correspondiente, como hasta ahora.
-- =========================================================

drop policy if exists "season_answers: select own or after deadline or admin" on public.season_answers;
create policy "season_answers: select all authenticated"
  on public.season_answers for select to authenticated
  using (true);

drop policy if exists "fantasy_lineups: select own or admin or locked" on public.fantasy_lineups;
create policy "fantasy_lineups: select all authenticated"
  on public.fantasy_lineups for select to authenticated
  using (true);

drop policy if exists "fantasy_lineup_players: select visible lineups" on public.fantasy_lineup_players;
create policy "fantasy_lineup_players: select all authenticated"
  on public.fantasy_lineup_players for select to authenticated
  using (true);
