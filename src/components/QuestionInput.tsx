import { useState } from 'react'
import TierListAnswer from './TierListAnswer'
import type { AnswerValue, SeasonQuestion } from '../lib/database.types'

// Variante totalmente controlada, sin guardado automático ni botones propios de "Guardar":
// el componente padre decide cuándo persistir el valor (p.ej. al pulsar "Siguiente").
export function QuestionDraftInput({
  question,
  value,
  onChange,
}: {
  question: SeasonQuestion
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
}) {
  if (question.answer_type === 'tier_list') {
    const current = (value as Record<string, string>) ?? {}
    return (
      <TierListAnswer
        items={question.config.items ?? []}
        tiers={question.config.tiers ?? []}
        value={current}
        onChange={onChange}
      />
    )
  }

  if (question.answer_type === 'score_prediction') {
    const current = (value as { home: number; away: number } | undefined) ?? { home: 0, away: 0 }
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="min-w-[90px]">{question.config.home_team ?? 'Local'}</span>
        <input
          type="number"
          min={0}
          value={current.home}
          onChange={(e) => onChange({ home: Number(e.target.value), away: current.away })}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
        />
        <span>-</span>
        <input
          type="number"
          min={0}
          value={current.away}
          onChange={(e) => onChange({ home: current.home, away: Number(e.target.value) })}
          className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
        />
        <span className="min-w-[90px]">{question.config.away_team ?? 'Visitante'}</span>
      </div>
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
            onClick={() => onChange(opt)}
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
  return (
    <input
      type="text"
      value={(value as string) ?? ''}
      placeholder="Tu respuesta"
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
    />
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
