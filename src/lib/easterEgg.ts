import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from '../context/AuthContext'
import { fetchPlayedMatchdays, fetchPlayerStats, pointsByPlayerFromStats } from './fantasyStatsQueries'
import type { SeasonQuestion } from './database.types'

// "Abueloncho Dorado": huevo de pascua de 5 pasos escondido por la web.
// Ver conversación de diseño -- este archivo centraliza los tipos, el
// progreso (tabla easter_egg_progress + RPC easter_egg_advance) y la
// pequeña lógica compartida entre pasos (contador de toques, tabla de
// resultados por día del mes) para no repetirla en cada página.

export const EASTER_EGG_SECRET_WORD = 'abuelonchodorado'
export const EASTER_EGG_TOTAL_STEPS = 5

export interface EasterEggProgress {
  step: number // 0 (no empezado) .. 5 (completado)
  captainPlayerId: number | null
  completedAt: string | null
}

// Últimas pistas mostradas en cada modal -- se repiten en Mis datos (paso
// "¿cómo vas?") para quien quiera releerlas sin esperar a que vuelva a
// salir el modal.
export const EASTER_EGG_HINTS: Record<number, string> = {
  1: 'Donde sale tu nombre entre los demás, tu escudo debes contar. Tócalo tantas veces como el puesto que ocupa tu equipo en la clasificación real.',
  2: 'Ahora tócalo para ponerle el brazalete. Solo tú sabrás dónde encontrarlo.',
  3: 'Mira tu puesto en la liga Fantasy. Busca en tu 11 al jugador que ocupa ESE MISMO puesto, pero contando por puntos entre los tuyos. Si vas 11º o peor, no sigas contando: es el que menos suma.',
  4: 'Cada día tiene su marcador. Alguien lo dejó apuntado donde se guarda la verdad de todo lo que pasa en esta porra.',
  5: '¡Ya está todo hecho! Solo queda reclamar lo que es tuyo.',
}

// Tabla secreta del paso 5: un resultado por día del mes (1-31), evitando a
// propósito los marcadores "cantados" (0-0, 1-0, 2-0, 0-1, 0-2, 1-1) para
// que nadie acierte de chiripa sin haber encontrado la tabla.
const DAILY_RESULTS: [number, number][] = [
  [3, 2], [4, 1], [2, 3], [5, 1], [1, 3], [3, 4], [6, 2], [2, 4], [4, 3], [1, 4],
  [5, 3], [3, 5], [2, 5], [4, 4], [6, 1], [1, 5], [3, 3], [5, 4], [4, 5], [2, 6],
  [6, 3], [1, 6], [5, 2], [4, 2], [3, 6], [6, 4], [7, 2], [5, 5], [4, 6], [6, 5],
  [3, 7],
]

export function todayResult(date: Date = new Date()): { home: number; away: number } {
  const day = date.getDate() // 1-31
  const [home, away] = DAILY_RESULTS[(day - 1) % DAILY_RESULTS.length]
  return { home, away }
}

export function resultsTableForDisplay(): { day: number; home: number; away: number }[] {
  return DAILY_RESULTS.map(([home, away], i) => ({ day: i + 1, home, away }))
}

// Progreso del usuario -- se carga una vez y se puede refrescar tras cada
// paso. null mientras no hay usuario logueado o todavía no ha cargado.
export function useEasterEgg() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<EasterEggProgress | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setProgress(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('easter_egg_progress')
      .select('step, captain_player_id, completed_at')
      .eq('user_id', user.id)
      .maybeSingle()
    setProgress({
      step: (data?.step as number | undefined) ?? 0,
      captainPlayerId: (data?.captain_player_id as number | null | undefined) ?? null,
      completedAt: (data?.completed_at as string | null | undefined) ?? null,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // p_step es el paso que se acaba de completar (1..5). El RPC comprueba
  // que sea justo el siguiente al que ya tenías -- si alguien intenta
  // saltarse pasos llamándolo a mano desde la consola, falla.
  async function advance(step: number, captainPlayerId?: number): Promise<boolean> {
    const { error } = await supabase.rpc('easter_egg_advance', {
      p_step: step,
      p_captain_player_id: captainPlayerId ?? null,
    })
    if (error) return false
    await load()
    return true
  }

  return { progress, loading, advance, reload: load }
}

// Contador de toques seguidos: hay que llegar a "target" sin dejar pasar
// más de 1.5s entre toque y toque, si no se reinicia a 0. Se usa en el
// paso 2 (escudo en Clasificación).
export function useTapCounter(target: number, onComplete: () => void) {
  const countRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [count, setCount] = useState(0)

  function tap() {
    if (target <= 0) return
    countRef.current += 1
    setCount(countRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countRef.current >= target) {
      countRef.current = 0
      setCount(0)
      onComplete()
      return
    }
    timerRef.current = setTimeout(() => {
      countRef.current = 0
      setCount(0)
    }, 1500)
  }

  return { count, tap }
}

// Puesto real de un equipo en el Bloque 1 (Clasificación de Liga) -- lee
// directamente season_questions + season_results, igual que hace
// Información. Devuelve null si el Bloque 1 no está creado o el admin
// todavía no ha fijado el resultado real.
export async function fetchTeamRealPosition(teamId: string): Promise<number | null> {
  const { data: q } = await supabase
    .from('season_questions')
    .select('id')
    .eq('phase', 'initial')
    .eq('block', 1)
    .maybeSingle()
  const question = q as Pick<SeasonQuestion, 'id'> | null
  if (!question) return null
  const { data: r } = await supabase.from('season_results').select('result').eq('question_id', question.id).maybeSingle()
  const result = r?.result as Record<string, number> | undefined
  return result?.[teamId] ?? null
}

// Del jugador de tu 11 que corresponde a tu puesto en la liga Fantasy
// (paso 4): si vas Nº en la liga, es tu jugador Nº por puntos entre los
// tuyos; si vas más abajo del número de jugadores que tienes colocados
// (11º o peor con un 11 completo), es el que menos suma. Empates: gana el
// que quede primero al ordenar (cualquiera de los dos vale, según lo
// hablado).
export function pickFantasyTargetPlayerId(
  rank: number,
  myPlayerIds: number[],
  pointsByPlayer: Record<number, number>
): number | null {
  if (myPlayerIds.length === 0) return null
  const sorted = [...myPlayerIds].sort((a, b) => (pointsByPlayer[b] ?? 0) - (pointsByPlayer[a] ?? 0))
  const idx = Math.max(0, Math.min(rank, sorted.length) - 1)
  return sorted[idx]
}

// Jugador objetivo del paso 4, ya resuelto: calcula el puesto actual del
// usuario en la liga Fantasy TOTAL (independiente de la jornada que se esté
// viendo en pantalla, para que el objetivo no cambie según la pestaña
// Total/Jn que tenga abierta) y lo cruza con los puntos totales de
// temporada de sus propios jugadores. Se usa tanto en "Mi equipo" como en
// la fila propia dentro de "Liga" -- en ambos casos se le pasan los ids de
// SU propio 11, nunca los de un rival.
export function useEasterEggFantasyTarget(myPlayerIds: number[]): number | null {
  const { user } = useAuth()
  const [target, setTarget] = useState<number | null>(null)
  const idsKey = [...myPlayerIds].sort((a, b) => a - b).join(',')

  useEffect(() => {
    let active = true
    async function load() {
      if (!user || myPlayerIds.length === 0) {
        if (active) setTarget(null)
        return
      }
      const { data: lb } = await supabase.from('fantasy_leaderboard').select('user_id, total_points').eq('mode', 'abuelonchos')
      const sorted = ((lb as { user_id: string; total_points: number }[]) ?? [])
        .slice()
        .sort((a, b) => b.total_points - a.total_points)
      const rank = sorted.findIndex((r) => r.user_id === user.id) + 1
      if (rank <= 0) {
        if (active) setTarget(null)
        return
      }
      const played = await fetchPlayedMatchdays()
      const playedNumbers = new Set(played.map((m) => m.number))
      const stats = await fetchPlayerStats(myPlayerIds)
      const filtered = stats.filter((s) => playedNumbers.has(s.matchday_num))
      const pointsByPlayer = pointsByPlayerFromStats(filtered)
      if (active) setTarget(pickFantasyTargetPlayerId(rank, myPlayerIds, pointsByPlayer))
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idsKey])

  return target
}
