import type { FantasyPosition } from './fantasyTypes'

// Misma fórmula que public.fantasy_calculate_points() en
// supabase/migrations/015_fantasy_schema.sql — se duplica aquí a propósito
// para poder previsualizar los puntos en el admin antes de guardar (el
// trigger en BD es quien manda de verdad al guardar). Si se cambia la
// fórmula en un sitio, hay que cambiarla en el otro.
const GOAL_POINTS: Record<FantasyPosition, number> = { POR: 8, DEF: 6, MED: 5, DEL: 4 }
const ASSIST_POINTS: Record<FantasyPosition, number> = { POR: 6, DEF: 5, MED: 4, DEL: 3 }
const CLEAN_SHEET_POINTS: Record<FantasyPosition, number> = { POR: 5, DEF: 4, MED: 1, DEL: 0 }

export interface FantasyStatInput {
  player_position: FantasyPosition
  minutes: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  own_goals: number
  clean_sheet: boolean
}

export function calculateFantasyPoints(s: FantasyStatInput): number {
  const minutePts = s.minutes >= 60 ? 2 : s.minutes >= 1 ? 1 : 0
  const cleanSheetPts = s.clean_sheet && s.minutes >= 60 ? CLEAN_SHEET_POINTS[s.player_position] : 0
  return (
    minutePts +
    s.goals * GOAL_POINTS[s.player_position] +
    s.assists * ASSIST_POINTS[s.player_position] +
    cleanSheetPts -
    s.yellow_cards * 1 -
    s.red_cards * 3 -
    s.own_goals * 2
  )
}

export interface FantasyPointsBreakdownItem {
  label: string
  points: number
}

// Desglose línea a línea (para el futuro popup de puntos por jugador): solo
// incluye conceptos que realmente sumaron o restaron algo.
export function fantasyPointsBreakdown(s: FantasyStatInput): FantasyPointsBreakdownItem[] {
  const items: FantasyPointsBreakdownItem[] = []
  if (s.minutes >= 60) items.push({ label: 'Jugó 60\' o más', points: 2 })
  else if (s.minutes >= 1) items.push({ label: 'Jugó menos de 60\'', points: 1 })
  if (s.goals > 0) items.push({ label: `Goles (${s.goals})`, points: s.goals * GOAL_POINTS[s.player_position] })
  if (s.assists > 0) items.push({ label: `Asistencias (${s.assists})`, points: s.assists * ASSIST_POINTS[s.player_position] })
  if (s.clean_sheet && s.minutes >= 60 && CLEAN_SHEET_POINTS[s.player_position] > 0) {
    items.push({ label: 'Portería a cero', points: CLEAN_SHEET_POINTS[s.player_position] })
  }
  if (s.yellow_cards > 0) items.push({ label: `Tarjetas amarillas (${s.yellow_cards})`, points: -s.yellow_cards })
  if (s.red_cards > 0) items.push({ label: `Tarjetas rojas (${s.red_cards})`, points: -s.red_cards * 3 })
  if (s.own_goals > 0) items.push({ label: `Goles en propia (${s.own_goals})`, points: -s.own_goals * 2 })
  return items
}
