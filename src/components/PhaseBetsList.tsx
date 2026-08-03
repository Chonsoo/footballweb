import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from './QuestionCard'
import type { AnswerValue, Profile, QuestionPhase, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface QuestionWithAnswers extends SeasonQuestion {
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
}

export default function PhaseBetsList({ phase, title, emptyText }: { phase: QuestionPhase; title: string; emptyText: string }) {
  const { user, profile } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: qs } = await supabase
      .from('season_questions')
      .select('*')
      .eq('phase', phase)
      .order('created_at', { ascending: true })

    const { data: answers } = await supabase
      .from('season_answers')
      .select('*, profile:profiles(*)')

    const { data: results } = await supabase.from('season_results').select('*')

    const merged: QuestionWithAnswers[] = ((qs as SeasonQuestion[]) ?? []).map((q) => ({
      ...q,
      answers: ((answers as (SeasonAnswer & { profile?: Profile })[]) ?? []).filter(
        (a) => a.question_id === q.id
      ),
      result: ((results as SeasonResult[]) ?? []).find((r) => r.question_id === q.id),
    }))

    setQuestions(merged)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {questions.length === 0 && <p className="text-gray-400">{emptyText}</p>}
      {questions.map((q) => {
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
      })}
    </div>
  )
}
