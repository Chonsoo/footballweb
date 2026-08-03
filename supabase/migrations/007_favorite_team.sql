-- =========================================================
-- Migración 007 — equipo favorito + confirmación de nombre de usuario
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

alter table public.profiles
  add column if not exists favorite_team text;

-- Guarda username + equipo favorito de una vez (usado por el popup de bienvenida
-- que aparece justo tras el primer login, tanto por Google como por email).
create or replace function public.complete_profile(p_username text, p_favorite_team text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set username = p_username,
      favorite_team = p_favorite_team
  where id = auth.uid();
end;
$$;
