-- =========================================================
-- Quiniela de amigos — esquema inicial
-- Pega este script en Supabase Studio > SQL Editor > Run
-- =========================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select all authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Crea automáticamente el perfil cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: ¿es admin este usuario?
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- ---------- SEASON QUESTIONS (apuestas iniciales) ----------
create table if not exists public.season_questions (
  id uuid primary key default gen_random_uuid(),
  competition text not null,          -- 'liga' | 'champions' | otros
  question text not null,
  points int not null default 1,
  closes_at timestamptz,              -- deadline, null = abierto indefinidamente
  created_at timestamptz not null default now()
);

alter table public.season_questions enable row level security;

create policy "season_questions: select all authenticated"
  on public.season_questions for select to authenticated using (true);

create policy "season_questions: admin write"
  on public.season_questions for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- SEASON ANSWERS (respuestas de cada usuario) ----------
create table if not exists public.season_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.season_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

alter table public.season_answers enable row level security;

-- Solo ves las respuestas ajenas una vez cerrado el plazo (o si eres admin / es tuya)
create policy "season_answers: select own or after deadline or admin"
  on public.season_answers for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.season_questions q
      where q.id = question_id
        and q.closes_at is not null
        and now() > q.closes_at
    )
  );

create policy "season_answers: insert own before deadline"
  on public.season_answers for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.season_questions q
      where q.id = question_id
        and (q.closes_at is null or now() < q.closes_at)
    )
  );

create policy "season_answers: update own before deadline"
  on public.season_answers for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.season_questions q
      where q.id = question_id
        and (q.closes_at is null or now() < q.closes_at)
    )
  );

-- ---------- SEASON RESULTS (resultado real, lo mete el admin) ----------
create table if not exists public.season_results (
  question_id uuid primary key references public.season_questions (id) on delete cascade,
  result text not null,
  resolved_at timestamptz not null default now()
);

alter table public.season_results enable row level security;

create policy "season_results: select all authenticated"
  on public.season_results for select to authenticated using (true);

-- Escritura solo vía función set_season_result (más abajo)

-- ---------- MATCHDAYS (jornadas) ----------
create table if not exists public.matchdays (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  number int not null,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  unique (competition, number)
);

alter table public.matchdays enable row level security;

create policy "matchdays: select all authenticated"
  on public.matchdays for select to authenticated using (true);

create policy "matchdays: admin write"
  on public.matchdays for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- MATCHES ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  matchday_id uuid not null references public.matchdays (id) on delete cascade,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled', -- scheduled | finished
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "matches: select all authenticated"
  on public.matches for select to authenticated using (true);

create policy "matches: admin write"
  on public.matches for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- MATCH BETS (predicciones por partido) ----------
create table if not exists public.match_bets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  home_score_pred int not null,
  away_score_pred int not null,
  points int,
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

alter table public.match_bets enable row level security;

create policy "match_bets: select own or after deadline or admin"
  on public.match_bets for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.matches m
      join public.matchdays d on d.id = m.matchday_id
      where m.id = match_id and now() > d.deadline
    )
  );

create policy "match_bets: insert own before deadline"
  on public.match_bets for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      join public.matchdays d on d.id = m.matchday_id
      where m.id = match_id and now() < d.deadline
    )
  );

create policy "match_bets: update own before deadline"
  on public.match_bets for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      join public.matchdays d on d.id = m.matchday_id
      where m.id = match_id and now() < d.deadline
    )
  );

-- ---------- LEADERBOARD (vista de puntos totales) ----------
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
  select sa.user_id, sum(sq.points) as total
  from public.season_answers sa
  join public.season_questions sq on sq.id = sa.question_id
  join public.season_results sr on sr.question_id = sa.question_id
  where sa.answer = sr.result
  group by sa.user_id
) sa on sa.user_id = p.id
order by total_points desc;

-- ---------- FUNCIONES RPC (acciones de administración) ----------

-- Ascender/degradar admin
create or replace function public.set_user_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  update public.profiles set is_admin = p_is_admin where id = p_user_id;
end;
$$;

-- Editar tu propio perfil (username/avatar) sin poder tocar is_admin
create or replace function public.update_my_profile(p_username text, p_avatar_url text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set username = p_username,
      avatar_url = coalesce(p_avatar_url, avatar_url)
  where id = auth.uid();
end;
$$;

-- Fijar el resultado real de una apuesta inicial
create or replace function public.set_season_result(p_question_id uuid, p_result text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  insert into public.season_results (question_id, result)
  values (p_question_id, p_result)
  on conflict (question_id) do update
    set result = excluded.result, resolved_at = now();
end;
$$;

-- Cerrar un partido con el resultado real y calcular puntos
create or replace function public.settle_match(p_match_id uuid, p_home_score int, p_away_score int)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_outcome text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  update public.matches
  set home_score = p_home_score, away_score = p_away_score, status = 'finished'
  where id = p_match_id;

  v_outcome := case
    when p_home_score > p_away_score then 'home'
    when p_home_score < p_away_score then 'away'
    else 'draw'
  end;

  update public.match_bets
  set points = case
    when home_score_pred = p_home_score and away_score_pred = p_away_score then 3
    when (
      case
        when home_score_pred > away_score_pred then 'home'
        when home_score_pred < away_score_pred then 'away'
        else 'draw'
      end
    ) = v_outcome then 1
    else 0
  end
  where match_id = p_match_id;
end;
$$;

-- =========================================================
-- Para convertirte en el primer admin, ejecuta esto tras
-- registrarte una vez en la app (sustituye el email):
--
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'tu_email@ejemplo.com');
-- =========================================================
