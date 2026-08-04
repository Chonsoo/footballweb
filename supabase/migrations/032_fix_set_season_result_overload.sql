-- Corrige por qué "Fijar resultado" en Admin no hacía nada: la consola de
-- devtools del navegador mostró que la llamada a set_season_result fallaba
-- con PGRST203 ("Could not choose the best candidate function"), lo que
-- significa que PostgREST ve más de una función "set_season_result" en la
-- base y no puede decidir cuál llamar.
--
-- Motivo: antes de que existiera esta carpeta de migraciones (el esquema
-- inicial se aplicó a mano), season_results.result probablemente era texto,
-- y set_season_result tenía la firma (uuid, text). La migración 002 cambió
-- la columna a jsonb y usó "create or replace function ... (uuid, jsonb)" --
-- pero "create or replace" solo sustituye una función si los tipos de los
-- parámetros coinciden EXACTAMENTE; al no coincidir (text vs jsonb), Postgres
-- creó una función sobrecargada nueva en vez de reemplazar la vieja, y las
-- dos quedaron conviviendo en la base. Con dos candidatas, PostgREST no sabe
-- cuál usar y responde con error -- por eso el botón parecía "no hacer nada"
-- (fallaba en silencio, hasta el fix de hoy que ya muestra el error).
--
-- Aquí se borran TODAS las versiones de set_season_result que haya (sea cual
-- sea su firma exacta, sin necesidad de adivinarla) y se deja una sola.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_season_result'
  loop
    execute format('drop function %s', r.sig);
  end loop;
end $$;

create function public.set_season_result(p_question_id uuid, p_result jsonb)
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
