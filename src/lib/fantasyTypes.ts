// Tipos del módulo "11 ideal" (Fantasy Abuelonchos). Ver
// supabase/migrations/015_fantasy_schema.sql para el esquema real.

import { normalizeText } from './textNormalize'

export type FantasyPosition = 'POR' | 'DEF' | 'MED' | 'DEL'

export const FANTASY_POSITIONS: FantasyPosition[] = ['POR', 'DEF', 'MED', 'DEL']

export const FANTASY_POSITION_LABELS: Record<FantasyPosition, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
}

// Color por posición, reutilizado en varios sitios (banquillo en lista,
// cartas de jugador, tabla de reglas) para que se identifique de un vistazo
// sin tener que leer la etiqueta de texto.
export const POSITION_COLORS: Record<FantasyPosition, string> = {
  POR: 'bg-orange-200 text-orange-900',
  DEF: 'bg-blue-200 text-blue-900',
  MED: 'bg-green-200 text-green-900',
  DEL: 'bg-red-200 text-red-900',
}

// De momento solo existe este modo: solo se pueden elegir jugadores "veteranos",
// nacidos antes del 1996-01-01 (los abuelos de verdad).
// (el modo "open" con todos los jugadores se deja aparcado para más adelante)
export type FantasyMode = 'abuelonchos'

export const FANTASY_MODE_LABELS: Record<FantasyMode, string> = {
  abuelonchos: '11 de Abuelonchos',
}

export interface FantasyPlayer {
  api_player_id: number
  name: string
  team_id: string | null
  api_team_id: number | null
  player_position: FantasyPosition
  birth_date: string | null
  photo_url: string | null
  nationality: string | null
  full_name: string | null
  eligible_abuelonchos: boolean
  active: boolean
}

// Límite de jugadores del Big Three (Real Madrid, Atlético y Barcelona)
// juntos en el 11 de Abuelonchos -- no es "máximo 3 de cada equipo", es
// "máximo 3 en total entre los tres", sea la mezcla que sea (p.ej. 2 del
// Barça + 1 del Atleti vale, pero no 2+1+1).
export const BIG_THREE_TEAM_IDS = new Set(['real-madrid', 'atletico-madrid', 'barcelona'])
export const BIG_THREE_LIMIT = 3

export function isBigThreePlayer(player: Pick<FantasyPlayer, 'team_id'>): boolean {
  return !!player.team_id && BIG_THREE_TEAM_IDS.has(player.team_id)
}

// El nombre mostrado puede ser corto (p.ej. "Giuliano"), así que la búsqueda
// también comprueba full_name cuando existe, para encontrarlo por el
// apellido por el que se le conoce (p.ej. "Simeone") sin cambiar lo que se
// ve en la carta.
export function playerMatchesSearch(player: FantasyPlayer, search: string): boolean {
  const needle = normalizeText(search)
  if (!needle) return true
  if (normalizeText(player.name).includes(needle)) return true
  if (player.full_name && normalizeText(player.full_name).includes(needle)) return true
  return false
}

// Huecos por posición además del portero, que siempre es 1 e implícito.
export interface FantasyFormation {
  DEF: number
  MED: number
  DEL: number
}

export const DEFAULT_FANTASY_FORMATION: FantasyFormation = { DEF: 4, MED: 4, DEL: 2 }

// Formaciones permitidas (todas con portero implícito + 10 jugadores de campo).
export interface FantasyFormationOption {
  label: string
  formation: FantasyFormation
}

// Ordenadas de menos a más defensas (3 defensas primero, luego 4, luego 5).
export const FANTASY_FORMATIONS: FantasyFormationOption[] = [
  { label: '3-5-2', formation: { DEF: 3, MED: 5, DEL: 2 } },
  { label: '3-4-3', formation: { DEF: 3, MED: 4, DEL: 3 } },
  { label: '4-4-2', formation: { DEF: 4, MED: 4, DEL: 2 } },
  { label: '4-3-3', formation: { DEF: 4, MED: 3, DEL: 3 } },
  { label: '4-5-1', formation: { DEF: 4, MED: 5, DEL: 1 } },
  { label: '5-3-2', formation: { DEF: 5, MED: 3, DEL: 2 } },
]

export function formationLabel(formation: FantasyFormation): string {
  const match = FANTASY_FORMATIONS.find(
    (f) => f.formation.DEF === formation.DEF && f.formation.MED === formation.MED && f.formation.DEL === formation.DEL
  )
  return match?.label ?? `${formation.DEF}-${formation.MED}-${formation.DEL}`
}

export interface FantasyLineup {
  id: string
  user_id: string
  mode: FantasyMode
  formation: FantasyFormation
  locked: boolean
  created_at: string
}

export interface FantasyLineupPlayer {
  lineup_id: string
  slot_position: FantasyPosition
  slot_index: number
  player_id: number
}

export interface FantasyPlayerStats {
  matchday_num: number
  player_id: number
  player_position: FantasyPosition
  minutes: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  own_goals: number
  clean_sheet: boolean
  points: number
  updated_at: string
}

// Marca qué jornadas del fantasy ya se han jugado (independiente de
// fantasy_player_stats, que no tiene ese concepto — solo guarda filas
// sueltas por matchday_num). Sirve para que la visualización por
// jugador/equipo sepa qué jornadas mostrar como cerradas.
export interface FantasyMatchday {
  number: number
  played: boolean
  played_at: string | null
  created_at: string
}

// Un hueco concreto de la plantilla en la UI (posición + índice, p.ej. DEF-2).
export interface FantasySlot {
  position: FantasyPosition
  index: number
}

export function slotKey(slot: FantasySlot): string {
  return `${slot.position}-${slot.index}`
}

// Genera la lista de huecos (portero + los que marque la formación) en orden
// de presentación: POR, DEF, MED, DEL.
export function buildFantasySlots(formation: FantasyFormation): FantasySlot[] {
  const slots: FantasySlot[] = [{ position: 'POR', index: 1 }]
  for (let i = 1; i <= formation.DEF; i++) slots.push({ position: 'DEF', index: i })
  for (let i = 1; i <= formation.MED; i++) slots.push({ position: 'MED', index: i })
  for (let i = 1; i <= formation.DEL; i++) slots.push({ position: 'DEL', index: i })
  return slots
}
