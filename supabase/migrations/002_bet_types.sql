-- =========================================================
-- Migración 002 — tipos de apuesta flexibles + puntos manuales
-- Pega esto en Supabase Studio > SQL Editor > Run
-- (no borra datos existentes, solo amplía el schema ya aplicado)
-- =========================================================

-- La vista depende de las columnas que vamos a cambiar de tipo; se recrea al final.
drop view if exists public.leaderboard;

-- ---------- SEASON QUESTIONS: tipo de respuesta + config ----------
alter table public.season_questions
  add column if not exists answer_type text not null default 'text',
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.season_questions drop constraint if exists season_questions_answer_type_check;
alter table public.season_questions
  add constraint season_questions_answer_type_check
  check (answer_type in ('text', 'choice', 'tier_list', 'score_prediction'));

-- ---------- SEASON ANSWERS: respuesta flexible (jsonb) + puntos manuales ----------
-- La columna "answer" pasa de text a jsonb (se guarda como texto JSON, ej: "\"Real Madrid\"" para las de texto libre)
alter table public.season_answers
  alter column answer type jsonb using to_jsonb(answer);

alter table public.season_answers
  add column if not exists points int,
  add column if not exists graded_at timestamptz;

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

-- ---------- SEASON RESULTS: ahora es informativo (jsonb), no se usa para calcular puntos ----------
alter table public.season_results
  alter column result type jsonb using to_jsonb(result);

-- ---------- RPC: fijar el "resultado real" (solo informativo) ----------
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

-- ---------- RPC: asignar puntos a mano a la respuesta de un usuario ----------
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

-- ---------- RPC: aplicar puntos automáticamente a quien acertó (preguntas simples con una única respuesta correcta) ----------
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

-- ---------- LEADERBOARD: puntos de jornadas + puntos manuales de apuestas iniciales ----------
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
order by total_points desc;

-- ---------- PROFILES: flag para no repetir el asistente de bienvenida ----------
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set onboarding_completed = true where id = auth.uid();
end;
$$;
