-- =========================================================
-- Migración 043 — Retirar un jugador de Fantasy
-- Pega esto en Supabase Studio > SQL Editor > Run
--
-- El botón "Borrar" del panel de jugadores de Fantasy no borra la fila de
-- fantasy_players: la conserva (así no se rompen las claves foráneas ni el
-- histórico) pero quita al jugador de los onces donde esté, borra sus
-- estadísticas y lo deja inactivo para que ya no pueda elegirse.
--
-- Hace falta una función security definer porque el admin NO puede tocar
-- fantasy_lineup_players de otros usuarios: su política de RLS solo permite
-- escribir en el once propio y mientras esté desbloqueado (ver schema.sql).
-- =========================================================

create or replace function public.retire_fantasy_player(p_player_id int)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Solo un administrador puede retirar jugadores';
  end if;

  -- Quitarlo de los onces donde esté (deja el hueco libre en ese puesto).
  delete from public.fantasy_lineup_players where player_id = p_player_id;

  -- Borrar sus estadísticas por jornada.
  delete from public.fantasy_player_stats where player_id = p_player_id;

  -- Si alguien lo tenía como "capitán" del huevo de pascua, se suelta la
  -- referencia (la columna admite null) para no bloquear nada.
  update public.easter_egg_progress
  set captain_player_id = null
  where captain_player_id = p_player_id;

  -- La fila del jugador se conserva, solo se marca inactiva.
  update public.fantasy_players
  set active = false
  where api_player_id = p_player_id;
end;
$$;

revoke all on function public.retire_fantasy_player(int) from public;
grant execute on function public.retire_fantasy_player(int) to authenticated;
