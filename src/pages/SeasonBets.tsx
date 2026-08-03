import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface QuestionWithAnswers extends SeasonQuestion {
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
}

export default function SeasonBets() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: qs } = await supabase
      .from('season_questions')
      .select('*')
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
  }, [])

  function isClosed(q: SeasonQuestion) {
    return !!q.closes_at && new Date(q.closes_at).getTime() < Date.now()
  }

  async function saveAnswer(q: QuestionWithAnswers) {
    const answer = drafts[q.id]?.trim()
    if (!answer || !user) return
    setSavingId(q.id)
    await supabase
      .from('season_answers')
      .upsert({ question_id: q.id, user_id: user.id, answer }, { onConflict: 'question_id,user_id' })
    setSavingId(null)
    await load()
  }

  if (loading) return <p className="text-gray-500">Cargando apuestas iniciales…</p>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Apuestas iniciales</h1>
      {questions.length === 0 && (
        <p className="text-gray-400">Todavía no hay preguntas. El admin puede crearlas desde el panel.</p>
      )}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={myAnswer?.answer ?? ''}
                  placeholder="Tu respuesta"
                  onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={() => saveAnswer(q)}
                  disabled={savingId === q.id}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div className="text-sm">
                <p className="mb-2 text-gray-500">
                  Cerrado {q.result ? `· resultado: ${q.result.result}` : '· sin resolver todavía'}
                </p>
                <ul className="flex flex-col gap-1">
                  {q.answers.map((a) => (
                    <li key={a.id} className="flex justify-between text-gray-700">
                      <span>{a.profile?.username ?? '—'}</span>
                      <span className={q.result?.result === a.answer ? 'font-semibold text-green-600' : ''}>
                        {a.answer}
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
