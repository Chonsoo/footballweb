import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import BlockAnswers from '../components/BlockAnswers'
import FlashAnswerCard from '../components/FlashAnswerCard'
import FlashStatusFilter from '../components/FlashStatusFilter'
import { getFlashStatus, type FlashStatus } from '../lib/flashStatus'
import type { AnswerValue, QuestionPhase, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

const TABS: { id: QuestionPhase; label: string }[] = [
  { id: 'initial', label: 'Apuestas iniciales' },
  { id: 'weekly', label: 'Apuestas flash' },
]

export default function MisApuestas() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [points, setPoints] = useState<Record<string, number | null>>({})
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [currentResults, setCurrentResults] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<QuestionPhase>('initial')
  const [statusFilter, setStatusFilter] = useState<Set<FlashStatus>>(new Set())

  const lineup = useFantasyLineup()

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const { data: as_ } = await supabase.from('season_answers').select('*').eq('user_id', user.id)
      const { data: res } = await supabase.from('season_results').select('*')
      const map: Record<string, AnswerValue> = {}
      const pointsMap: Record<string, number | null> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) {
        map[a.question_id] = a.answer
        pointsMap[a.question_id] = a.points
      }
      const resultRows = (res as { question_id: string; result: AnswerValue }[]) ?? []
      const resultsMap: Record<string, AnswerValue> = {}
      for (const r of resultRows) resultsMap[r.question_id] = r.result
      setQuestions((qs as SeasonQuestion[]) ?? [])
      setAnswers(map)
      setPoints(pointsMap)
      setResolvedIds(new Set(resultRows.map((r) => r.question_id)))
      setCurrentResults(resultsMap)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <p className="text-white/80">Cargando…</p>

  const initialQuestions = questions.filter((q) => q.phase === 'initial')
  const weeklyQuestions = questions.filter((q) => q.phase === 'weekly')
  const visibleWeeklyQuestions =
    statusFilter.size > 0
      ? weeklyQuestions.filter((q) => statusFilter.has(getFlashStatus(q, resolvedIds.has(q.id))))
      : weeklyQuestions

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">✅ Mis apuestas</h1>
        <p className="text-sm text-white/80">Repasa lo que has puesto tú.</p>
      </div>

      <div className="flex overflow-hidden rounded-lg bg-white/[0.4] text-sm backdrop-blur-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 font-medium transition-colors ${
              tab === t.id ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-white/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'initial' ? (
        <div className="flex flex-col gap-5">
          {initialQuestions.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
              Todavía no hay preguntas aquí.
            </div>
          )}

          <BlockAnswers questions={initialQuestions} answers={answers} points={points} currentResults={currentResults} />

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-100">Bloque 5 · El 11 de Abuelonchos</h2>
            <div className="rounded-xl bg-white/[0.67] p-4 shadow-md shadow-black/10 backdrop-blur-sm">
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
          {weeklyQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
              Todavía no hay preguntas aquí.
            </div>
          ) : (
            <>
              <FlashStatusFilter value={statusFilter} onChange={setStatusFilter} />
              {visibleWeeklyQuestions.length === 0 ? (
                <p className="text-sm text-white/70">Ninguna pregunta con ese estado.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {visibleWeeklyQuestions.map((q) => (
                    <FlashAnswerCard
                      key={q.id}
                      question={q}
                      value={answers[q.id]}
                      points={points[q.id]}
                      resolved={resolvedIds.has(q.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
