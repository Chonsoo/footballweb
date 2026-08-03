import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

export default function MisApuestas() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Mis apuestas</h1>
      {questions.length === 0 && <p className="text-gray-400">Todavía no hay preguntas.</p>}
      {questions.map((q) => (
        <div key={q.id} className="rounded border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
            <span className="uppercase">{q.competition}</span>
            <span>{q.phase === 'initial' ? 'Inicial' : 'Semana'}</span>
          </div>
          <p className="mb-2 font-medium">{q.question}</p>
          <p className="text-sm text-gray-700">
            {answers[q.id] != null ? formatAnswer(q, answers[q.id]) : <span className="text-gray-400">Sin responder</span>}
          </p>
        </div>
      ))}
    </div>
  )
}
