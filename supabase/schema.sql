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

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  add column if not exists email_confirmed boolean not null default false;

alter table public.profiles
  add column if not exists favorite_team text;

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
  insert into public.profiles (id, username, email_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Cuando el usuario confirma el correo (clic en el enlace), auth.users se actualiza:
-- sincronizamos ese cambio a profiles para que deje de estar oculto en el ranking.
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
  answer_type text not null default 'text'
    check (answer_type in ('text', 'choice', 'tier_list', 'score_prediction', 'ranking')),
  config jsonb not null default '{}'::jsonb, -- config específica del tipo (items/tiers, equipos...)
  phase text not null default 'initial' check (phase in ('initial', 'weekly')), -- 'initial' = fija, pestaña Apuestas iniciales | 'weekly' = mitad de temporada, pestaña Apuestas de la semana
  points int not null default 1,      -- puntos máximos orientativos (la puntuación real es manual)
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
  answer jsonb not null,       -- forma libre según answer_type de la pregunta
  points int,                  -- puntos asignados a mano por el admin (null = sin calificar)
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

alter table public.season_answers enable row level security;

-- Evita que un usuario se autoasigne puntos escribiendo directamente en la tabla
create or replace function public.protect_season_answer_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    if tg_op = 'INSERT' then
      new.points := null;
      new.graded_at := null;
    elsif tg_op = 'UPDATE' then
      new.points := old.points;
      new.graded_at := old.graded_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_season_answer_points_trg on public.season_answers;
create trigger protect_season_answer_points_trg
  before insert or update on public.season_answers
  for each row execute procedure public.protect_season_answer_points();

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

-- ---------- SEASON RESULTS (resultado real, informativo — no calcula puntos) ----------
create table if not exists public.season_results (
  question_id uuid primary key references public.season_questions (id) on delete cascade,
  result jsonb not null,
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
  select user_id, sum(points) as total
  from public.season_answers
  where points is not null
  group by user_id
) sa on sa.user_id = p.id
where p.email_confirmed = true
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

-- Guarda username + equipo favorito de una vez (popup de bienvenida tras el primer login)
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

-- Fijar el resultado real de una apuesta (informativo)
create or replace function public.set_season_result(p_question_id uuid, p_result jsonb)
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

-- Asignar puntos a mano a la respuesta de un usuario (apuestas complejas: tier list, marcadores...)
create or replace function public.set_answer_points(p_answer_id uuid, p_points int)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  update public.season_answers
  set points = p_points, graded_at = now()
  where id = p_answer_id;
end;
$$;

-- Aplicar puntos automáticamente a quien acertó el resultado exacto
-- (para preguntas de texto/opción con una única respuesta correcta, típico de las de mitad de temporada)
create or replace function public.apply_season_result_points(p_question_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_points int;
  v_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select points into v_points from public.season_questions where id = p_question_id;
  select result into v_result from public.season_results where question_id = p_question_id;

  if v_result is null then
    raise exception 'Fija primero el resultado real con set_season_result';
  end if;

  update public.season_answers
  set points = case when answer = v_result then v_points else 0 end,
      graded_at = now()
  where question_id = p_question_id;
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

-- El oráculo: recuentos agregados (sin exponer votos individuales) para
-- texto/opción/marcador.
create or replace function public.oracle_answer_counts(p_question_id uuid)
returns table(answer_value jsonb, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select answer, count(*)::bigint as cnt
  from public.season_answers
  where question_id = p_question_id
  group by answer
  order by count(*) desc;
$$;

-- El oráculo: recuentos agregados por equipo/categoría para tier list
-- (equipo no colocado explícitamente = "media", igual que hace la UI).
create or replace function public.oracle_tier_counts(p_question_id uuid)
returns table(team_id text, tier_id text, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    it ->> 'id' as team_id,
    coalesce(sa.answer ->> (it ->> 'id'), 'media') as tier_id,
    count(*)::bigint as cnt
  from public.season_questions q
  cross join lateral jsonb_array_elements(coalesce(q.config -> 'items', '[]'::jsonb)) as it
  join public.season_answers sa on sa.question_id = q.id
  where q.id = p_question_id
  group by 1, 2
  order by 1, count(*) desc;
$$;

-- El oráculo: recuentos agregados por equipo/posición para tipo "ranking"
-- (posición 1º-20º); las zonas se calculan en el cliente a partir de la posición.
create or replace function public.oracle_ranking_counts(p_question_id uuid)
returns table(team_id text, pos int, cnt bigint)
language sql
stable
security definer set search_path = public
as $$
  select kv.key as team_id, (kv.value #>> '{}')::int as pos, count(*)::bigint as cnt
  from public.season_answers sa,
       jsonb_each(sa.answer) as kv(key, value)
  where sa.question_id = p_question_id
  group by kv.key, kv.value
  order by kv.key, count(*) desc;
$$;

-- Borrar un usuario (cascada limpia perfil, respuestas y apuestas)
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

-- =========================================================
-- Para convertirte en el primer admin, ejecuta esto tras
-- registrarte una vez en la app (sustituye el email):
--
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'tu_email@ejemplo.com');
-- =========================================================
