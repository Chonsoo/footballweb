import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from '../components/QuestionCard'
import BigThreeInput from '../components/BigThreeInput'
import FantasyLineupBlock from '../components/FantasyLineupBlock'
import Countdown from '../components/Countdown'
import BlockScoringHelp from '../components/BlockScoringHelp'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import { isInitialPhaseClosed, INITIAL_PHASE_DEADLINE, INITIAL_PHASE_DEADLINE_LABEL } from '../lib/deadlines'
import type { AnswerValue, Profile, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface QuestionWithAnswers extends SeasonQuestion {
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
}

export default function SeasonBets() {
  const { user, profile } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openBlock, setOpenBlock] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: qs } = await supabase
      .from('season_questions')
      .select('*')
      .eq('phase', 'initial')
      .order('block', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    const { data: answers } = await supabase.from('season_answers').select('*, profile:profiles(*)')
    const { data: results } = await supabase.from('season_results').select('*')

    const merged: QuestionWithAnswers[] = ((qs as SeasonQuestion[]) ?? []).map((q) => ({
      ...q,
      answers: ((answers as (SeasonAnswer & { profile?: Profile })[]) ?? []).filter((a) => a.question_id === q.id),
      result: ((results as SeasonResult[]) ?? []).find((r) => r.question_id === q.id),
    }))

    setQuestions(merged)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function isClosed(q: SeasonQuestion) {
    return !!q.closes_at && new Date(q.closes_at).getTime() < Date.now()
  }

  async function saveAnswer(questionId: string, value: AnswerValue) {
    if (!user) return
    setSavingId(questionId)
    setSaveError(null)
    const { data, error } = await supabase
      .from('season_answers')
      .upsert({ question_id: questionId, user_id: user.id, answer: value }, { onConflict: 'question_id,user_id' })
      .select('*')
      .single()
    setSavingId(null)
    if (error) {
      // Antes esto fallaba en silencio (p.ej. si el plazo de esa pregunta ya
      // había pasado, la política de la base de datos rechaza el guardado) --
      // sin avisar, parecía que se había guardado bien y luego, al no existir
      // la fila en season_answers, esa respuesta nunca podía recibir puntos
      // (ni siquiera 0), aunque el admin la calificara.
      setSaveError('No se ha podido guardar esta respuesta (puede que el plazo ya haya pasado). Vuelve a intentarlo.')
      return
    }

    // Actualiza solo la respuesta afectada en memoria, sin recargar toda la
    // página (evita el salto visual al principio y la recarga innecesaria).
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== questionId) return q
        const saved = { ...(data as SeasonAnswer), profile: profile ?? undefined }
        const idx = q.answers.findIndex((a) => a.user_id === user.id)
        const nextAnswers = idx >= 0 ? q.answers.map((a, i) => (i === idx ? saved : a)) : [...q.answers, saved]
        return { ...q, answers: nextAnswers }
      })
    )
  }

  if (loading) return <p className="text-white/80">Cargando…</p>

  const byBlock = new Map<number, QuestionWithAnswers[]>()
  const noBlock: QuestionWithAnswers[] = []
  for (const q of questions) {
    if (q.block != null && BLOCKS.includes(q.block)) {
      if (!byBlock.has(q.block)) byBlock.set(q.block, [])
      byBlock.get(q.block)!.push(q)
    } else {
      noBlock.push(q)
    }
  }

  function renderCard(q: QuestionWithAnswers) {
    const myAnswer = q.answers.find((a) => a.user_id === user?.id)
    const closed = isClosed(q)
    return (
      <QuestionCard
        key={q.id}
        question={q}
        myAnswer={myAnswer}
        closed={closed}
        saving={savingId === q.id}
        onSave={(value) => saveAnswer(q.id, value)}
        otherAnswers={q.answers}
        result={q.result}
        hideMeta
      />
    )
  }

  const closed = isInitialPhaseClosed()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Apuestas iniciales</h1>

      {saveError && (
        <div className="rounded-xl border border-red-200/50 bg-red-50/90 px-4 py-3 text-sm text-red-800 backdrop-blur-sm">
          {saveError}
        </div>
      )}

      {closed ? (
        <div className="rounded-xl border border-amber-200/50 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 backdrop-blur-sm">
          El plazo se cerró el {INITIAL_PHASE_DEADLINE_LABEL}. Esto ya no se puede editar, para ver el resumen de lo
          que pusiste mejor entra en <strong>Mis apuestas</strong>.
        </div>
      ) : (
        // Aviso informativo, no un bloque más -- por eso NO lleva el mismo
        // estilo que las tarjetas de bloque de abajo (sin sombra "elevada",
        // sin fondo blanco opaco, con icono propio): si se viera igual que
        // ellas, parecía una tarjeta más pero sin flecha ni comportamiento
        // de desplegable, y confundía.
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/15 bg-black/15 px-4 py-2.5 text-sm text-white/90 backdrop-blur-sm">
          {/* Sin "flex" en este span: el icono va con margen, no con gap de
              flex -- si el span es un contenedor flex, cada nodo de texto y
              el <strong> se convierten en items de flex por separado y dejan
              de fluir como un párrafo normal (se veía partido en dos bloques
              sueltos en vez de un texto que se ajusta solo). */}
          <span>
            <span aria-hidden className="mr-1">📅</span>
            Puedes rellenar o actualizar tus respuestas hasta el{' '}
            <strong className="text-white">{INITIAL_PHASE_DEADLINE_LABEL}</strong>.
          </span>
          <Countdown deadline={INITIAL_PHASE_DEADLINE} />
        </div>
      )}

      {questions.length === 0 && (
        <p className="text-white/70">Todavía no hay preguntas. El admin puede crearlas desde el panel.</p>
      )}

      {BLOCKS.map((b) => {
        const blockQuestions = byBlock.get(b) ?? []
        if (blockQuestions.length === 0) return null
        const answeredCount = blockQuestions.filter((q) =>
          isAnswerComplete(q, q.answers.find((a) => a.user_id === user?.id)?.answer)
        ).length
        const allAnswered = answeredCount === blockQuestions.length
        const isOpen = openBlock === b

        return (
          <div key={b} className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setOpenBlock(isOpen ? null : b)}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium ${
                allAnswered ? 'bg-green-100/70' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                {BLOCK_LABELS[b] ?? `Bloque ${b}`}
                {allAnswered && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex items-center gap-2 text-sm font-normal text-gray-400">
                {answeredCount}/{blockQuestions.length}
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
              <div className="flex flex-col gap-3 border-t border-white/40 p-3">
                <div>
                  <BlockScoringHelp block={b} label={BLOCK_LABELS[b]} centered />
                </div>
                {b === 3 ? (
                  <BigThreeInput
                    questions={blockQuestions}
                    answers={Object.fromEntries(
                      blockQuestions.map((q) => [q.id, q.answers.find((a) => a.user_id === user?.id)])
                    )}
                    savingId={savingId}
                    onSave={saveAnswer}
                  />
                ) : (
                  blockQuestions.map(renderCard)
                )}
              </div>
            )}
          </div>
        )
      })}

      <FantasyLineupBlock />

      {noBlock.length > 0 && (
        <div className="rounded-xl bg-white/[0.67] p-3 shadow-md shadow-black/10 backdrop-blur-sm">
          <p className="mb-2 text-xs font-medium text-gray-500">Otras preguntas</p>
          <div className="flex flex-col gap-3">{noBlock.map(renderCard)}</div>
        </div>
      )}
    </div>
  )
}
