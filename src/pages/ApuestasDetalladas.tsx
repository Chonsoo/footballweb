import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AnswerSummary from '../components/AnswerSummary'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import { shortQuestionLabel } from '../lib/questionLabel'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { DEFAULT_FANTASY_FORMATION, type FantasyFormation, type FantasyPlayer } from '../lib/fantasyTypes'
import type { AnswerValue, LeaderboardRow, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

interface UserLineup {
  formation: FantasyFormation
  value: Record<string, string>
}

export default function ApuestasDetalladas() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [fantasyPlayers, setFantasyPlayers] = useState<FantasyPlayer[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [answersByUser, setAnswersByUser] = useState<Record<string, Record<string, AnswerValue>>>({})
  const [lineupByUser, setLineupByUser] = useState<Record<string, UserLineup | null>>({})
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: lb } = await supabase.from('leaderboard').select('*')
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const { data: fp } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('eligible_abuelonchos', true)
        .eq('active', true)
        .order('name')
      setRows((lb as LeaderboardRow[]) ?? [])
      setQuestions((qs as SeasonQuestion[]) ?? [])
      setFantasyPlayers((fp as FantasyPlayer[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function toggle(userId: string) {
    if (expanded === userId) {
      setExpanded(null)
      return
    }
    setExpanded(userId)
    if (!answersByUser[userId]) {
      setLoadingUser(userId)
      const { data } = await supabase.from('season_answers').select('*').eq('user_id', userId)
      const map: Record<string, AnswerValue> = {}
      for (const a of (data as SeasonAnswer[]) ?? []) map[a.question_id] = a.answer
      setAnswersByUser((m) => ({ ...m, [userId]: map }))

      // El 11 de Abuelonchos: no está en season_answers (tiene sus propias
      // tablas), así que se carga aparte. Si el once de este usuario no es
      // visible todavía (RLS: solo se ve el propio hasta que un admin lo
      // "bloquee"), simplemente no habrá filas y se muestra como no visible.
      const { data: lineupRow } = await supabase
        .from('fantasy_lineups')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', 'abuelonchos')
        .maybeSingle()

      if (lineupRow) {
        const { data: slotsData } = await supabase
          .from('fantasy_lineup_players')
          .select('*')
          .eq('lineup_id', lineupRow.id)
        const value: Record<string, string> = {}
        for (const row of (slotsData as { slot_position: string; slot_index: number; player_id: number }[]) ?? []) {
          value[String(row.player_id)] = `${row.slot_position}-${row.slot_index}`
        }
        setLineupByUser((m) => ({
          ...m,
          [userId]: { formation: (lineupRow.formation as FantasyFormation) ?? DEFAULT_FANTASY_FORMATION, value },
        }))
      } else {
        setLineupByUser((m) => ({ ...m, [userId]: null }))
      }

      setLoadingUser(null)
    }
  }

  const filtered = rows.filter((r) => r.username.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🔍 Apuestas detalladas</h1>
        <p className="text-sm text-gray-500">Lo que ha puesto cada participante, para llorar luego.</p>
      </div>

      <input
        type="text"
        placeholder="Buscar jugador…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-2">
        {filtered.map((r) => {
          const isOpen = expanded === r.user_id
          const answers = answersByUser[r.user_id]
          const team = LALIGA_TEAMS_2026_27.find((t) => t.id === r.favorite_team)
          return (
            <div key={r.user_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button onClick={() => toggle(r.user_id)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
                    {team?.badge ? <img src={team.badge} alt="" className="h-6 w-6 object-contain" /> : <span className="text-xs">🛡️</span>}
                  </span>
                  <span className="truncate font-semibold text-gray-800">{r.username}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">{r.total_points}</span> pts
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-3 border-t border-gray-100 p-3">
                  {loadingUser === r.user_id ? (
                    <p className="text-sm text-gray-400">Cargando…</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {questions.map((q) => (
                          <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                            <p className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
                              {shortQuestionLabel(q)}
                            </p>
                            {answers?.[q.id] != null ? (
                              <AnswerSummary question={q} value={answers[q.id]} />
                            ) : (
                              <p className="text-sm text-gray-400">Sin responder / aún no visible</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">El 11 de Abuelonchos</p>
                        {lineupByUser[r.user_id] ? (
                          <div className="overflow-hidden rounded-lg border border-gray-100">
                            <FantasyLineupPicker
                              players={fantasyPlayers}
                              formation={lineupByUser[r.user_id]!.formation}
                              value={lineupByUser[r.user_id]!.value}
                              onChange={() => {}}
                              readOnly
                              hideSidebar
                            />
                          </div>
                        ) : (
                          <p className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 text-sm text-gray-400">
                            Sin poner / aún no visible
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && <p className="text-gray-400">Sin resultados.</p>}
      </div>
    </div>
  )
}
