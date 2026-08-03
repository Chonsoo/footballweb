import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { QuestionDraftInput } from './QuestionInput'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

function defaultDraft(q: SeasonQuestion): AnswerValue {
  if (q.answer_type === 'tier_list') return {}
  if (q.answer_type === 'score_prediction') return { home: 0, away: 0 }
  return ''
}

function isAnswered(q: SeasonQuestion, draft: AnswerValue): boolean {
  if (q.answer_type === 'text') return (draft as string).trim().length > 0
  if (q.answer_type === 'choice') return !!draft
  // tier_list y score_prediction siempre tienen un valor válido por defecto
  return true
}

export default function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { user, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [myAnswers, setMyAnswers] = useState<Record<string, AnswerValue>>({})
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<AnswerValue>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const { data: qs } = await supabase
        .from('season_questions')
        .select('*')
        .eq('phase', 'initial')
        .or(`closes_at.is.null,closes_at.gt.${now}`)
        .order('created_at', { ascending: true })

      const { data: as_ } = user
        ? await supabase.from('season_answers').select('*').eq('user_id', user.id)
        : { data: [] }

      const answersMap: Record<string, AnswerValue> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) {
        answersMap[a.question_id] = a.answer
      }

      setQuestions((qs as SeasonQuestion[]) ?? [])
      setMyAnswers(answersMap)
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    const q = questions[step]
    if (!q) return
    setDraft(myAnswers[q.id] ?? defaultDraft(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, questions])

  async function finish() {
    await supabase.rpc('complete_onboarding')
    await refreshProfile()
    onDone()
  }

  function goNext() {
    if (step + 1 >= questions.length) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }

  async function saveAndNext() {
    if (!user) return
    const q = questions[step]
    setSaving(true)
    await supabase
      .from('season_answers')
      .upsert({ question_id: q.id, user_id: user.id, answer: draft }, { onConflict: 'question_id,user_id' })
    setMyAnswers((m) => ({ ...m, [q.id]: draft }))
    setSaving(false)
    goNext()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando…</p>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">¡Bienvenido!</h1>
        <p className="text-gray-500">Todavía no hay apuestas iniciales creadas. Ya te avisaremos cuando las haya.</p>
        <button onClick={finish} className="rounded bg-blue-600 px-4 py-2 font-medium text-white">
          Entrar a la web
        </button>
      </div>
    )
  }

  const q = questions[step]

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4">
      <div>
        <p className="mb-1 text-sm text-gray-400">
          Pregunta {step + 1} de {questions.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-5">
        <p className="mb-1 text-xs uppercase text-gray-400">{q.competition}</p>
        <p className="mb-4 text-lg font-medium">{q.question}</p>
        <QuestionDraftInput question={q} value={draft} onChange={setDraft} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <button onClick={goNext} className="text-gray-400 hover:underline">
          Omitir esta
        </button>
        <button
          onClick={saveAndNext}
          disabled={saving || !isAnswered(q, draft)}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
