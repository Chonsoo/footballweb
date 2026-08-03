import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import { QuestionInput } from './QuestionInput'
import type { AnswerValue, Profile, QuestionPhase, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface QuestionWithAnswers extends SeasonQuestion {
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
}

export default function PhaseBetsList({ phase, title, emptyText }: { phase: QuestionPhase; title: string; emptyText: string }) {
  const { user } = useAuth()
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
    await supabase
      .from('season_answers')
      .upsert(
        { question_id: questionId, user_id: user.id, answer: value },
        { onConflict: 'question_id,user_id' }
      )
    setSavingId(null)
    await load()
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
          <div key={q.id} className="rounded border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs uppercase text-gray-400">{q.competition}</span>
              <span className="text-xs text-gray-400">{q.points} pts</span>
            </div>
            <p className="mb-3 font-medium">{q.question}</p>

            {!closed ? (
              <QuestionInput
                question={q}
                value={myAnswer?.answer}
                saving={savingId === q.id}
                onSave={(value) => saveAnswer(q.id, value)}
              />
            ) : (
              <div className="text-sm">
                <p className="mb-2 text-gray-500">
                  Cerrado {q.result ? `· resultado: ${formatAnswer(q, q.result.result)}` : '· sin resolver todavía'}
                </p>
                <ul className="flex flex-col gap-1">
                  {q.answers.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 text-gray-700">
                      <span className="shrink-0">{a.profile?.username ?? '—'}</span>
                      <span className="text-right">
                        {formatAnswer(q, a.answer)}
                        {a.points != null && (
                          <span className="ml-2 font-semibold text-green-600">+{a.points}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
