import { useState } from 'react'
import TierListAnswer from './TierListAnswer'
import RankingAnswer from './RankingAnswer'
import TeamSelect from './TeamSelect'
import { findTeamBadge } from '../lib/teamBadge'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import type { AnswerValue, QuestionConfig, SeasonQuestion } from '../lib/database.types'

// Para preguntas 'choice' que piden un equipo (config.team_ids presente): lista de
// equipos filtrada a esos ids, respetando el orden dado.
function teamOptionsFor(config: QuestionConfig) {
  const ids = config.team_ids ?? []
  return ids
    .map((id) => LALIGA_TEAMS_2026_27.find((t) => t.id === id))
    .filter((t): t is (typeof LALIGA_TEAMS_2026_27)[number] => !!t)
}

function TeamLabel({ name, align = 'left' }: { name: string; align?: 'left' | 'right' }) {
  const badge = findTeamBadge(name)
  return (
    <span
      className={`flex items-center gap-1.5 sm:w-40 sm:shrink-0 ${
        align === 'right' ? 'sm:flex-row-reverse sm:justify-start sm:text-right' : ''
      }`}
    >
      {badge && <img src={badge} alt={name} title={name} className="h-6 w-6 shrink-0 object-contain sm:h-5 sm:w-5" />}
      <span className={`truncate ${badge ? 'hidden sm:inline' : ''}`}>{name}</span>
    </span>
  )
}

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

  if (question.answer_type === 'ranking') {
    const current = (value as Record<string, number>) ?? {}
    return (
      <RankingAnswer
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
        <TeamLabel name={question.config.home_team ?? 'Local'} align="right" />
        <input
          type="number"
          min={0}
          value={current.home}
          onChange={(e) => onChange({ home: Math.max(0, Number(e.target.value) || 0), away: current.away })}
          className="w-16 shrink-0 rounded border border-gray-300 px-2 py-1 text-center"
        />
        <span className="shrink-0">-</span>
        <input
          type="number"
          min={0}
          value={current.away}
          onChange={(e) => onChange({ home: current.home, away: Math.max(0, Number(e.target.value) || 0) })}
          className="w-16 shrink-0 rounded border border-gray-300 px-2 py-1 text-center"
        />
        <TeamLabel name={question.config.away_team ?? 'Visitante'} />
      </div>
    )
  }

  if (question.answer_type === 'choice') {
    if (question.config.team_ids) {
      const teams = teamOptionsFor(question.config)
      const currentId = teams.find((t) => t.name === value)?.id ?? ''
      return (
        <div className="max-w-xs">
          <TeamSelect teams={teams} value={currentId} onChange={(id) => onChange(teams.find((t) => t.id === id)?.name ?? '')} />
        </div>
      )
    }
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

  if (question.answer_type === 'ranking') {
    const current = (value as Record<string, number>) ?? {}
    return (
      <RankingAnswer
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
    if (question.config.team_ids) {
      const teams = teamOptionsFor(question.config)
      const currentId = teams.find((t) => t.name === value)?.id ?? ''
      return (
        <div className={`max-w-xs ${saving ? 'pointer-events-none opacity-50' : ''}`}>
          <TeamSelect teams={teams} value={currentId} onChange={(id) => onSave(teams.find((t) => t.id === id)?.name ?? '')} />
        </div>
      )
    }
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
    <div className="flex flex-wrap items-center gap-2 text-sm sm:flex-nowrap">
      <TeamLabel name={homeTeam} align="right" />
      <input
        type="number"
        min={0}
        defaultValue={value.home}
        onChange={(e) => setHome(Math.max(0, Number(e.target.value) || 0))}
        className="w-16 shrink-0 rounded border border-gray-300 px-2 py-1 text-center"
      />
      <span className="shrink-0">-</span>
      <input
        type="number"
        min={0}
        defaultValue={value.away}
        onChange={(e) => setAway(Math.max(0, Number(e.target.value) || 0))}
        className="w-16 shrink-0 rounded border border-gray-300 px-2 py-1 text-center"
      />
      <TeamLabel name={awayTeam} />
      <button
        onClick={() => onSave({ home, away })}
        disabled={saving}
        className="shrink-0 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Guardar
      </button>
    </div>
  )
}
