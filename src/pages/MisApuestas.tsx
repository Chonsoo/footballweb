import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import AnswerSummary from '../components/AnswerSummary'
import BlockAnswers from '../components/BlockAnswers'
import { shortQuestionLabel } from '../lib/questionLabel'
import type { AnswerValue, QuestionPhase, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

const TABS: { id: QuestionPhase; label: string }[] = [
  { id: 'initial', label: 'Apuestas iniciales' },
  { id: 'weekly', label: 'Apuestas flash' },
]

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

          <BlockAnswers questions={initialQuestions} answers={answers} />

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
