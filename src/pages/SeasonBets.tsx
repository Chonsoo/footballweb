import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import TierListAnswer from '../components/TierListAnswer'
import type { AnswerValue, Profile, SeasonAnswer, SeasonQuestion, SeasonResult } from '../lib/database.types'

interface QuestionWithAnswers extends SeasonQuestion {
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
}

export default function SeasonBets() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([])
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

export function QuestionInput({
  question,
  value,
  saving,
  onSave,
}: {
  question: SeasonQuestion
  value: AnswerValue | undefined
  saving: boolean
  onSave: (value: AnswerValue) => void
}) {
  if (question.answer_type === 'tier_list') {
    const current = (value as Record<string, string>) ?? {}
    return (
      <TierListAnswer
        items={question.config.items ?? []}
        tiers={question.config.tiers ?? []}
        value={current}
        onChange={(next) => onSave(next)}
      />
    )
  }

  if (question.answer_type === 'score_prediction') {
    const current = (value as { home: number; away: number } | undefined) ?? { home: 0, away: 0 }
    return (
      <ScorePredictionInput
        homeTeam={question.config.home_team ?? 'Local'}
        awayTeam={question.config.away_team ?? 'Visitante'}
        value={current}
        saving={saving}
        onSave={onSave}
      />
    )
  }

  if (question.answer_type === 'choice') {
    const options = question.config.options ?? []
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            disabled={saving}
            onClick={() => onSave(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              value === opt
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  // text
  return <TextInput value={(value as string) ?? ''} saving={saving} onSave={onSave} />
}

function TextInput({
  value,
  saving,
  onSave,
}: {
  value: string
  saving: boolean
  onSave: (value: AnswerValue) => void
}) {
  const [draft, setDraft] = useState(value)
  return (
    <div className="flex gap-2">
      <input
        type="text"
        defaultValue={value}
        placeholder="Tu respuesta"
        onChange={(e) => setDraft(e.target.value)}
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        onClick={() => draft.trim() && onSave(draft.trim())}
        disabled={saving}
        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Guardar
      </button>
    </div>
  )
}

function ScorePredictionInput({
  homeTeam,
  awayTeam,
  value,
  saving,
  onSave,
}: {
  homeTeam: string
  awayTeam: string
  value: { home: number; away: number }
  saving: boolean
  onSave: (value: AnswerValue) => void
}) {
  const [home, setHome] = useState(value.home)
  const [away, setAway] = useState(value.away)
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="min-w-[90px]">{homeTeam}</span>
      <input
        type="number"
        min={0}
        defaultValue={value.home}
        onChange={(e) => setHome(Number(e.target.value))}
        className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
      />
      <span>-</span>
      <input
        type="number"
        min={0}
        defaultValue={value.away}
        onChange={(e) => setAway(Number(e.target.value))}
        className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
      />
      <span className="min-w-[90px]">{awayTeam}</span>
      <button
        onClick={() => onSave({ home, away })}
        disabled={saving}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Guardar
      </button>
    </div>
  )
}
