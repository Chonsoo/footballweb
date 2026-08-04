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
// jugador): siempre las mismas 7 líneas, en el mismo orden, a 0 cuando no
// aplica -- para que el popup mida siempre lo mismo tenga lo que tenga el
// jugador esa jornada, en vez de encogerse/crecer según cuántos conceptos
// puntuaron.
export function fantasyPointsBreakdown(s: FantasyStatInput): FantasyPointsBreakdownItem[] {
  const minutePts = s.minutes >= 60 ? 2 : s.minutes >= 1 ? 1 : 0
  const cleanSheetPts = s.clean_sheet && s.minutes >= 60 ? CLEAN_SHEET_POINTS[s.player_position] : 0
  return [
    { key: 'minutes', label: 'Minutos jugados', points: minutePts },
    { key: 'goals', label: `Goles (${s.goals})`, points: s.goals * GOAL_POINTS[s.player_position] },
    { key: 'assists', label: `Asistencias (${s.assists})`, points: s.assists * ASSIST_POINTS[s.player_position] },
    { key: 'clean_sheet', label: 'Portería a cero', points: cleanSheetPts },
    { key: 'yellow', label: `Tarjetas amarillas (${s.yellow_cards})`, points: -s.yellow_cards },
    { key: 'red', label: `Tarjetas rojas (${s.red_cards})`, points: -s.red_cards * 3 },
    { key: 'own_goals', label: `Goles en propia (${s.own_goals})`, points: -s.own_goals * 2 },
  ]
}

// Un stat vacío (0 en todo) para cuando no hay datos guardados de esa
// jornada para este jugador -- así el popup muestra las 7 líneas a 0 en vez
// de un hueco en blanco, y sigue midiendo lo mismo.
export function emptyFantasyStats(position: FantasyPosition): FantasyStatInput {
  return { player_position: position, minutes: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, own_goals: 0, clean_sheet: false }
}

// Igual que fantasyPointsBreakdown pero acumulado a lo largo de varias
// jornadas (para el modo "Total" del popup) -- mismas 7 líneas fijas.
export function aggregateFantasyBreakdown(rows: FantasyStatInput[], position: FantasyPosition): { items: FantasyPointsBreakdownItem[]; total: number } {
  let minutePts = 0
  let goals = 0
  let assists = 0
  let cleanSheets = 0
  let yellows = 0
  let reds = 0
  let ownGoals = 0
  for (const s of rows) {
    minutePts += s.minutes >= 60 ? 2 : s.minutes >= 1 ? 1 : 0
    goals += s.goals
    assists += s.assists
    if (s.clean_sheet && s.minutes >= 60) cleanSheets++
    yellows += s.yellow_cards
    reds += s.red_cards
    ownGoals += s.own_goals
  }

  const items: FantasyPointsBreakdownItem[] = [
    { key: 'minutes', label: 'Minutos jugados', points: minutePts },
    { key: 'goals', label: `Goles (${goals})`, points: goals * GOAL_POINTS[position] },
    { key: 'assists', label: `Asistencias (${assists})`, points: assists * ASSIST_POINTS[position] },
    { key: 'clean_sheet', label: `Portería a cero (${cleanSheets})`, points: cleanSheets * CLEAN_SHEET_POINTS[position] },
    { key: 'yellow', label: `Tarjetas amarillas (${yellows})`, points: -yellows },
    { key: 'red', label: `Tarjetas rojas (${reds})`, points: -reds * 3 },
    { key: 'own_goals', label: `Goles en propia (${ownGoals})`, points: -ownGoals * 2 },
  ]

  const total = items.reduce((sum, i) => sum + i.points, 0)
  return { items, total }
}
