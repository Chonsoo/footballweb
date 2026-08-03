import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from './QuestionCard'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

interface Step {
  key: string
  label: string
  questions: SeasonQuestion[]
}

export default function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { user, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, SeasonAnswer>>({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const { data: qs } = await supabase
        .from('season_questions')
        .select('*')
        .eq('phase', 'initial')
        .or(`closes_at.is.null,closes_at.gt.${now}`)
        .order('block', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      const { data: as_ } = user
        ? await supabase.from('season_answers').select('*').eq('user_id', user.id)
        : { data: [] }

      const answersMap: Record<string, SeasonAnswer> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) {
        answersMap[a.question_id] = a
      }

      setQuestions((qs as SeasonQuestion[]) ?? [])
      setAnswers(answersMap)
      setLoading(false)
    }
    load()
  }, [user])

  // Agrupa las preguntas iniciales en, como mucho, 4 pasos (uno por bloque),
  // igual que en "Apuestas iniciales", en vez de una pregunta por pantalla.
  const steps: Step[] = useMemo(() => {
    const byBlock = new Map<number, SeasonQuestion[]>()
    const noBlock: SeasonQuestion[] = []
    for (const q of questions) {
      if (q.block != null && BLOCKS.includes(q.block)) {
        if (!byBlock.has(q.block)) byBlock.set(q.block, [])
        byBlock.get(q.block)!.push(q)
      } else {
        noBlock.push(q)
      }
    }
    const result: Step[] = []
    for (const b of BLOCKS) {
      const qs = byBlock.get(b) ?? []
      if (qs.length > 0) result.push({ key: `block-${b}`, label: BLOCK_LABELS[b] ?? `Bloque ${b}`, questions: qs })
    }
    if (noBlock.length > 0) result.push({ key: 'no-block', label: 'Otras preguntas', questions: noBlock })
    return result
  }, [questions])

  async function finish() {
    await supabase.rpc('complete_onboarding')
    await refreshProfile()
    onDone()
  }

  function goNext() {
    if (step + 1 >= steps.length) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }

  // Autoguardado: cada pregunta se guarda en cuanto se responde, sin esperar
  // a un botón "Siguiente" general (los tipos que ya tienen su propio botón
  // "Guardar", como texto o marcador, lo conservan).
  async function saveAnswer(questionId: string, value: AnswerValue) {
    if (!user) return
    setSavingId(questionId)
    const { data, error } = await supabase
      .from('season_answers')
      .upsert({ question_id: questionId, user_id: user.id, answer: value }, { onConflict: 'question_id,user_id' })
      .select('*')
      .single()
    setSavingId(null)
    if (error) return
    setAnswers((a) => ({ ...a, [questionId]: data as SeasonAnswer }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando…</p>
      </div>
    )
  }

  if (steps.length === 0) {
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

  const current = steps[step]
  const answeredCount = current.questions.filter((q) => isAnswerComplete(q, answers[q.id]?.answer)).length
  const allAnswered = answeredCount === current.questions.length
  const someAnswered = answeredCount > 0

  const skipLabel = someAnswered ? 'Omitir respuestas no contestadas de este bloque' : 'Omitir este bloque de preguntas'

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="mb-1 text-sm text-gray-400">
          Bloque {step + 1} de {steps.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{current.label}</h2>
        <div className="flex flex-col gap-3">
          {current.questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              myAnswer={answers[q.id]}
              closed={false}
              saving={savingId === q.id}
              onSave={(value) => saveAnswer(q.id, value)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <button onClick={goNext} className="text-left text-gray-400 hover:underline">
          {skipLabel}
        </button>
        <button
          onClick={goNext}
          disabled={!allAnswered}
          className="shrink-0 rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
