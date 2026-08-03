// Tipos simplificados del esquema (ver supabase/schema.sql).
// Si más adelante generas tipos con `supabase gen types`, puedes sustituir este archivo.

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface SeasonQuestion {
  id: string
  competition: string
  question: string
  points: number
  closes_at: string | null
  created_at: string
}

export interface SeasonAnswer {
  id: string
  question_id: string
  user_id: string
  answer: string
  created_at: string
}

export interface SeasonResult {
  question_id: string
  result: string
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

// Placeholder mínimo para que supabase-js pueda tipar el cliente.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any
