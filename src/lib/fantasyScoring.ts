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
  key: string
  label: string
  points: number
}

// Desglose línea a línea de una sola jornada (para el popup de puntos por
// jugador): solo incluye conceptos que realmente sumaron o restaron algo.
export function fantasyPointsBreakdown(s: FantasyStatInput): FantasyPointsBreakdownItem[] {
  const items: FantasyPointsBreakdownItem[] = []
  if (s.minutes >= 60) items.push({ key: 'minutes60', label: 'Jugó 60\' o más', points: 2 })
  else if (s.minutes >= 1) items.push({ key: 'minutes1', label: 'Jugó menos de 60\'', points: 1 })
  if (s.goals > 0) items.push({ key: 'goals', label: `Goles (${s.goals})`, points: s.goals * GOAL_POINTS[s.player_position] })
  if (s.assists > 0) items.push({ key: 'assists', label: `Asistencias (${s.assists})`, points: s.assists * ASSIST_POINTS[s.player_position] })
  if (s.clean_sheet && s.minutes >= 60 && CLEAN_SHEET_POINTS[s.player_position] > 0) {
    items.push({ key: 'clean_sheet', label: 'Portería a cero', points: CLEAN_SHEET_POINTS[s.player_position] })
  }
  if (s.yellow_cards > 0) items.push({ key: 'yellow', label: `Tarjetas amarillas (${s.yellow_cards})`, points: -s.yellow_cards })
  if (s.red_cards > 0) items.push({ key: 'red', label: `Tarjetas rojas (${s.red_cards})`, points: -s.red_cards * 3 })
  if (s.own_goals > 0) items.push({ key: 'own_goals', label: `Goles en propia (${s.own_goals})`, points: -s.own_goals * 2 })
  return items
}

// Igual que fantasyPointsBreakdown pero acumulado a lo largo de varias
// jornadas (para el modo "Total" del popup): sólo tiene sentido sumar
// conteos (goles, asistencias, tarjetas...) porque "portería a cero" o los
// minutos son cosas de un partido concreto, no un booleano acumulable.
export function aggregateFantasyBreakdown(rows: FantasyStatInput[]): { items: FantasyPointsBreakdownItem[]; total: number } {
  if (rows.length === 0) return { items: [], total: 0 }
  const position = rows[0].player_position
  let minutes60 = 0
  let minutes1 = 0
  let goals = 0
  let assists = 0
  let cleanSheets = 0
  let yellows = 0
  let reds = 0
  let ownGoals = 0
  for (const s of rows) {
    if (s.minutes >= 60) minutes60++
    else if (s.minutes >= 1) minutes1++
    goals += s.goals
    assists += s.assists
    if (s.clean_sheet && s.minutes >= 60) cleanSheets++
    yellows += s.yellow_cards
    reds += s.red_cards
    ownGoals += s.own_goals
  }

  const items: FantasyPointsBreakdownItem[] = []
  if (minutes60 > 0) items.push({ key: 'minutes60', label: `Jugó 60' o más (${minutes60} jornadas)`, points: minutes60 * 2 })
  if (minutes1 > 0) items.push({ key: 'minutes1', label: `Jugó menos de 60' (${minutes1} jornadas)`, points: minutes1 })
  if (goals > 0) items.push({ key: 'goals', label: `Goles (${goals})`, points: goals * GOAL_POINTS[position] })
  if (assists > 0) items.push({ key: 'assists', label: `Asistencias (${assists})`, points: assists * ASSIST_POINTS[position] })
  if (cleanSheets > 0 && CLEAN_SHEET_POINTS[position] > 0) {
    items.push({ key: 'clean_sheet', label: `Portería a cero (${cleanSheets})`, points: cleanSheets * CLEAN_SHEET_POINTS[position] })
  }
  if (yellows > 0) items.push({ key: 'yellow', label: `Tarjetas amarillas (${yellows})`, points: -yellows })
  if (reds > 0) items.push({ key: 'red', label: `Tarjetas rojas (${reds})`, points: -reds * 3 })
  if (ownGoals > 0) items.push({ key: 'own_goals', label: `Goles en propia (${ownGoals})`, points: -ownGoals * 2 })

  const total = items.reduce((sum, i) => sum + i.points, 0)
  return { items, total }
}
