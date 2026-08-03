import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from '../components/QuestionCard'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
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
  const [openBlock, setOpenBlock] = useState<number | null>(1)

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
    const { data, error } = await supabase
      .from('season_answers')
      .upsert({ question_id: questionId, user_id: user.id, answer: value }, { onConflict: 'question_id,user_id' })
      .select('*')
      .single()
    setSavingId(null)
    if (error) return

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

  if (loading) return <p className="text-gray-500">Cargando…</p>

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
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Apuestas iniciales</h1>
      {questions.length === 0 && (
        <p className="text-gray-400">Todavía no hay preguntas. El admin puede crearlas desde el panel.</p>
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
          <div key={b} className="rounded border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenBlock(isOpen ? null : b)}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium ${
                isOpen ? 'rounded-t' : 'rounded'
              } ${allAnswered ? 'bg-green-50' : 'bg-white'}`}
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
              <div className="flex flex-col gap-3 rounded-b border-t border-gray-100 p-3">{blockQuestions.map(renderCard)}</div>
            )}
          </div>
        )
      })}

      {noBlock.length > 0 && (
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Otras preguntas</p>
          <div className="flex flex-col gap-3">{noBlock.map(renderCard)}</div>
        </div>
      )}
    </div>
  )
}
