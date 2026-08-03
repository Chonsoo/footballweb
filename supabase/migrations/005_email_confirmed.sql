-- =========================================================
-- Migración 005 — ocultar jugadores hasta que confirmen el email
-- Pega esto en Supabase Studio > SQL Editor > Run
-- =========================================================

-- Columna que refleja si el usuario ya confirmó su email (o entró con Google,
-- que ya viene verificado).
alter table public.profiles
  add column if not exists email_confirmed boolean not null default false;

-- Backfill: sincroniza con el estado real que ya tiene auth.users
update public.profiles p
set email_confirmed = true
from auth.users u
where u.id = p.id and u.email_confirmed_at is not null;

-- El trigger de alta ahora también copia el estado de confirmación inicial
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

-- Cuando el usuario confirma el correo (clic en el enlace), auth.users se actualiza:
-- sincronizamos ese cambio a profiles.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
    update public.profiles set email_confirmed = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update on auth.users
  for each row execute procedure public.handle_user_confirmed();

-- El ranking (listado de jugadores) solo muestra a quien ya confirmó
create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(mb.total, 0) + coalesce(sa.total, 0) as total_points
from public.profiles p
left join (
  select user_id, sum(points) as total
  from public.match_bets
  where points is not null
  group by user_id
) mb on mb.user_id = p.id
left join (
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
where p.email_confirmed = true
order by total_points desc;
