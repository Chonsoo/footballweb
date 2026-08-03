-- =========================================================
-- Migración 004 — permitir al admin borrar un usuario
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

-- Borra al usuario de auth.users; por las FKs con "on delete cascade" ya definidas
-- (profiles -> auth.users, y season_answers/match_bets -> profiles) se limpia todo en cadena.
create or replace function public.delete_user(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'no puedes borrarte a ti mismo';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;
