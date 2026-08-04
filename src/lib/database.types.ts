// Tipos simplificados del esquema (ver supabase/schema.sql y supabase/migrations).
// Si más adelante generas tipos con `supabase gen types`, puedes sustituir este archivo.

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  is_admin: boolean
  onboarding_completed: boolean
  email_confirmed: boolean
  favorite_team: string | null
  created_at: string
}

export type AnswerType = 'text' | 'choice' | 'tier_list' | 'score_prediction' | 'ranking'

export interface TierItem {
  id: string
  name: string
  badge?: string
}

export interface TierDef {
  id: string
  label: string
  max: number | null // null = sin límite (se usa para la tier "resto", ej. media tabla)
}

// Config específica según answer_type. Todos los campos son opcionales porque
// solo se rellenan los que aplican al tipo de la pregunta.
export interface QuestionConfig {
  options?: string[] // 'choice'
  team_ids?: string[] // 'choice' — si están presentes, se muestra un desplegable de equipos (escudo + nombre) en vez de botones, limitado a estos ids
  player_choice?: boolean // 'choice' — si es true, se muestra un buscador de jugadores (fantasy_players) en vez de botones/desplegable de equipos
  exclude_team_ids?: string[] // 'choice' con player_choice — equipos a excluir del buscador (p.ej. "Pichichi Clase Media" excluye a los 3 grandes)
  player_position?: 'POR' | 'DEF' | 'MED' | 'DEL' // 'choice' con player_choice — limita el buscador a una posición (p.ej. Trofeo Zamora solo porteros)
  items?: TierItem[] // 'tier_list' | 'ranking'
  tiers?: TierDef[] // 'tier_list' | 'ranking' (tiers "especiales"; el resto cae en una tier implícita "media")
  home_team?: string // 'score_prediction'
  away_team?: string // 'score_prediction'
}

export type QuestionPhase = 'initial' | 'weekly'

export interface SeasonQuestion {
  id: string
  competition: string
  question: string
  answer_type: AnswerType
  config: QuestionConfig
  points: number
  phase: QuestionPhase
  block: number | null
  closes_at: string | null
  created_at: string
}

// Forma del valor guardado según el tipo de pregunta:
// - text: string
// - choice: string (una de config.options)
// - tier_list: Record<item_id, tier_id>  (los que faltan se consideran en la tier "media" implícita)
// - score_prediction: { home: number; away: number }
// - ranking: Record<item_id, position>  (posición 1..N; las zonas se derivan de la posición)
export type AnswerValue = string | Record<string, string> | Record<string, number> | { home: number; away: number }

export interface SeasonAnswer {
  id: string
  question_id: string
  user_id: string
  answer: AnswerValue
  points: number | null
  graded_at: string | null
  created_at: string
}

export interface SeasonResult {
  question_id: string
  result: AnswerValue
  resolved_at: string
}

export interface Matchday {
  id: string
  competition: string
  number: number
  deadline: string
  created_at: string
}

export interface Match {
  id: string
  matchday_id: string
  home_team: string
  away_team: string
  kickoff: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'finished'
  created_at: string
}

export interface MatchBet {
  id: string
  match_id: string
  user_id: string
  home_score_pred: number
  away_score_pred: number
  points: number | null
  created_at: string
}

export interface LeaderboardRow {
  user_id: string
  username: string
  total_points: number
}

export const MEDIA_TIER_ID = 'media'
export const MEDIA_TIER_LABEL = 'Media tabla'

// Placeholder mínimo para que supabase-js pueda tipar el cliente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
