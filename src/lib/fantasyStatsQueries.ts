import { supabase } from './supabase'
import type { FantasyMatchday, FantasyPlayerStats } from './fantasyTypes'

// Helpers de lectura compartidos por la pestaña Fantasy (Resumen / Jornadas
// / Liga fantasy) y el popup de desglose por jugador — para no repetir las
// mismas consultas contra fantasy_matchdays / fantasy_player_stats en cada
// sitio.

export async function fetchPlayedMatchdays(): Promise<FantasyMatchday[]> {
  const { data } = await supabase.from('fantasy_matchdays').select('*').eq('played', true).order('number', { ascending: true })
  return (data as FantasyMatchday[]) ?? []
}

export async function fetchPlayerStats(playerIds: number[], matchdayNum?: number): Promise<FantasyPlayerStats[]> {
  if (playerIds.length === 0) return []
  let query = supabase.from('fantasy_player_stats').select('*').in('player_id', playerIds)
  if (matchdayNum != null) query = query.eq('matchday_num', matchdayNum)
  const { data } = await query
  return (data as FantasyPlayerStats[]) ?? []
}

// Suma de puntos por jugador a partir de un listado de filas de stats — vale
// tanto para el total de temporada (todas las filas) como para una jornada
// concreta (filas ya filtradas por matchday_num).
export function pointsByPlayerFromStats(stats: FantasyPlayerStats[]): Record<number, number> {
  const map: Record<number, number> = {}
  for (const s of stats) map[s.player_id] = (map[s.player_id] ?? 0) + s.points
  return map
}
