import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { QuestionInput } from './QuestionInput'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

export default function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { user, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [myAnswers, setMyAnswers] = useState<Record<string, AnswerValue>>({})
  const [step, setStep] = useState(0)
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

  async function finish() {
    await supabase.rpc('complete_onboarding')
    await refreshProfile()
    onDone()
  }

  async function saveAndNext(value: AnswerValue) {
    if (!user) return
    const q = questions[step]
    setSaving(true)
    await supabase
      .from('season_answers')
      .upsert({ question_id: q.id, user_id: user.id, answer: value }, { onConflict: 'question_id,user_id' })
    setMyAnswers((m) => ({ ...m, [q.id]: value }))
    setSaving(false)
    goNext()
  }

  function goNext() {
    if (step + 1 >= questions.length) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
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
        <QuestionInput question={q} value={myAnswers[q.id]} saving={saving} onSave={saveAndNext} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <button onClick={finish} className="text-gray-400 hover:underline">
          Terminar más tarde
        </button>
        <button onClick={goNext} className="text-blue-600 hover:underline">
          Omitir esta →
        </button>
      </div>
    </div>
  )
}
