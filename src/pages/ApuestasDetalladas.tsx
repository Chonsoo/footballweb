import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BlockAnswers from '../components/BlockAnswers'
import AnswerSummary from '../components/AnswerSummary'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import { shortQuestionLabel } from '../lib/questionLabel'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { DEFAULT_FANTASY_FORMATION, type FantasyFormation, type FantasyPlayer } from '../lib/fantasyTypes'
import { computeRanks, distFromLastTier } from '../lib/ranking'
import type { AnswerValue, LeaderboardRow, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

interface UserLineup {
  formation: FantasyFormation
  value: Record<string, string>
}

// Mismo lenguaje visual que la Clasificación (oro/plata/bronce arriba, y
// farolillo si el empate es justo el de los últimos — manda incluso si ese
// mismo grupo también calcula como 1º, caso límite de empate total) para
// que la fila de cada participante no sea un bloque blanco plano — un
// vistazo rápido ya dice quién va primero antes de tocar nada.
function rowAccent(rank: number, isLastTier: boolean): { background: string; borderColor: string } {
  if (isLastTier) return { background: '#fee2e2', borderColor: '#fca5a5' }
  if (rank === 1) return { background: 'linear-gradient(to right, #fbe9b8, #ffffff)', borderColor: '#e0b64a' }
  if (rank === 2) return { background: 'linear-gradient(to right, #e2e8f0, #ffffff)', borderColor: '#94a3b8' }
  if (rank === 3) return { background: 'linear-gradient(to right, #e8c4a0, #ffffff)', borderColor: '#b97a4a' }
  return { background: '#ffffff', borderColor: '#e5e7eb' }
}

const MEDALS = ['🥇', '🥈', '🥉']

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
      const { data: lb } = await supabase.from('leaderboard').select('*').order('username', { ascending: true })
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const { data: fp } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('eligible_abuelonchos', true)
        .eq('active', true)
        .order('name')
      const sortedLb = ((lb as LeaderboardRow[]) ?? []).sort((a, b) => b.total_points - a.total_points)
      setRows(sortedLb)
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
        {(() => {
          const ranks = computeRanks(rows)
          return filtered.map((r) => {
          const rowIndex = rows.findIndex((row) => row.user_id === r.user_id)
          const rank = rowIndex >= 0 ? ranks[rowIndex] : filtered.indexOf(r) + 1
          const isLastTier = rows.length > 1 && distFromLastTier(r.total_points, rows) === 0
          const isOpen = expanded === r.user_id
          const answers = answersByUser[r.user_id]
          const team = LALIGA_TEAMS_2026_27.find((t) => t.id === r.favorite_team)
          const accent = rowAccent(rank, isLastTier)
          const initialQs = questions.filter((q) => q.phase === 'initial')
          const weeklyQs = questions.filter((q) => q.phase === 'weekly')

          return (
            <div
              key={r.user_id}
              className="overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
              style={{ borderColor: accent.borderColor }}
            >
              <button
                onClick={() => toggle(r.user_id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                style={{ background: accent.background }}
              >
                <span className="flex w-6 shrink-0 items-center justify-center text-base font-bold text-gray-500">
                  {isLastTier ? '🏮' : rank <= 3 ? MEDALS[rank - 1] : rank}
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-gray-100">
                  {team?.badge ? <img src={team.badge} alt="" className="h-6 w-6 object-contain" /> : <span className="text-xs">🛡️</span>}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{r.username}</span>
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
                <div className="flex flex-col gap-4 border-t border-gray-100 bg-white p-3">
                  {loadingUser === r.user_id ? (
                    <p className="text-sm text-gray-400">Cargando…</p>
                  ) : (
                    <>
                      <BlockAnswers questions={initialQs} answers={answers ?? {}} />

                      <div>
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-600">El 11 de Abuelonchos</h3>
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

                      {weeklyQs.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-600">Apuestas flash</h3>
                          <div className="grid grid-cols-2 gap-2">
                            {weeklyQs.map((q) => (
                              <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2">
                                <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
          })
        })()}
        {filtered.length === 0 && <p className="text-gray-400">Sin resultados.</p>}
      </div>
    </div>
  )
}
