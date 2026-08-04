import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import AnswerSummary, { TeamBadgeLabel } from '../components/AnswerSummary'
import { shortQuestionLabel } from '../lib/questionLabel'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import type { AnswerValue, QuestionPhase, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

const TABS: { id: QuestionPhase; label: string }[] = [
  { id: 'initial', label: 'Apuestas iniciales' },
  { id: 'weekly', label: 'Apuestas de la semana' },
]

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

// Bloque 3 (duelos Big Three): en vez de 6 tarjetas sueltas (una por
// partido), agrupa cada emparejamiento (ida + vuelta) en una sola fila.
function PairedResults({ questions, answers }: { questions: SeasonQuestion[]; answers: Record<string, AnswerValue> }) {
  const pairs = new Map<string, SeasonQuestion[]>()
  for (const q of questions) {
    const home = q.config.home_team
    const away = q.config.away_team
    if (!home || !away) continue
    const key = pairKey(home, away)
    if (!pairs.has(key)) pairs.set(key, [])
    pairs.get(key)!.push(q)
  }

  return (
    <div className="flex flex-col gap-2">
      {[...pairs.values()].map((legs, i) => (
        <div key={i} className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
          {legs.map((leg, j) => {
            const v = answers[leg.id] as { home: number; away: number } | undefined
            return (
              <div key={leg.id} className="flex items-center gap-2 text-sm">
                {j > 0 && <span className="text-gray-300">·</span>}
                <TeamBadgeLabel name={leg.config.home_team} />
                <span className="font-bold text-gray-800">{v ? `${v.home} - ${v.away}` : '—'}</span>
                <TeamBadgeLabel name={leg.config.away_team} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function MisApuestas() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<QuestionPhase>('initial')

  const lineup = useFantasyLineup()

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const { data: as_ } = await supabase.from('season_answers').select('*').eq('user_id', user.id)
      const map: Record<string, AnswerValue> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) map[a.question_id] = a.answer
      setQuestions((qs as SeasonQuestion[]) ?? [])
      setAnswers(map)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  const initialQuestions = questions.filter((q) => q.phase === 'initial')
  const weeklyQuestions = questions.filter((q) => q.phase === 'weekly')

  const byBlock = new Map<number, SeasonQuestion[]>()
  for (const q of initialQuestions) {
    if (q.block == null) continue
    if (!byBlock.has(q.block)) byBlock.set(q.block, [])
    byBlock.get(q.block)!.push(q)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">✅ Mis apuestas</h1>
        <p className="text-sm text-gray-500">Repasa lo que has puesto tú.</p>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 font-medium transition-colors ${
              tab === t.id ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'initial' ? (
        <div className="flex flex-col gap-5">
          {initialQuestions.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
              Todavía no hay preguntas aquí.
            </div>
          )}

          {BLOCKS.map((b) => {
            const qs = byBlock.get(b) ?? []
            if (qs.length === 0) return null
            return (
              <div key={b} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">{BLOCK_LABELS[b] ?? `Bloque ${b}`}</h2>

                {b === 1 &&
                  qs.map((q) => (
                    <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                      <AnswerSummary question={q} value={answers[q.id]} />
                    </div>
                  ))}

                {b === 2 && (
                  <div className="grid grid-cols-2 gap-2">
                    {qs.map((q) => (
                      <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                        <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
                          {shortQuestionLabel(q)}
                        </p>
                        <AnswerSummary question={q} value={answers[q.id]} />
                      </div>
                    ))}
                  </div>
                )}

                {b === 3 && <PairedResults questions={qs} answers={answers} />}

                {b === 4 && (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {qs.map((q) => (
                      <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="min-w-0 flex-1 text-xs text-gray-600">{q.question}</span>
                        <AnswerSummary question={q} value={answers[q.id]} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">Bloque 5 · El 11 de Abuelonchos</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {lineup.loading ? (
                <p className="text-sm text-gray-400">Cargando…</p>
              ) : lineup.filled === 0 ? (
                <p className="text-sm text-gray-400">Todavía no has puesto tu once, hazlo desde Apuestas iniciales.</p>
              ) : (
                <FantasyLineupPicker
                  players={lineup.players}
                  formation={lineup.formation}
                  value={lineup.value}
                  onChange={() => {}}
                  readOnly
                  hideSidebar
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {weeklyQuestions.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
              Todavía no hay preguntas aquí.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {weeklyQuestions.map((q) => (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
                  {shortQuestionLabel(q)}
                </p>
                <AnswerSummary question={q} value={answers[q.id]} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
