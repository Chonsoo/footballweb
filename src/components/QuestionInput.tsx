import { useState } from 'react'
import TierListAnswer from './TierListAnswer'
import RankingAnswer from './RankingAnswer'
import TeamSelect from './TeamSelect'
import PlayerSelect from './PlayerSelect'
import { findTeamBadge } from '../lib/teamBadge'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import type { AnswerValue, QuestionConfig, SeasonQuestion } from '../lib/database.types'

// Color del botón "Guardar", con tres estados bien diferenciados (antes
// "sin contestar" usaba el verde de marca, casi idéntico al verde de
// "contestado", así que a simple vista todos los botones parecían iguales):
//  - gris: todavía no se ha guardado ninguna respuesta (falta por rellenar).
//  - ámbar: ya había una respuesta guardada, pero se ha modificado el valor
//    sin volver a pulsar "Guardar" (cambio pendiente).
//  - verde: guardado y coincide con lo que se ve en el formulario.
const SAVE_BTN_CLASS = {
  answered: 'bg-green-600 hover:bg-green-700',
  unsaved: 'bg-amber-500 hover:bg-amber-600',
  unanswered: 'bg-gray-400 hover:bg-gray-500',
}

function saveBtnClass(answered: boolean, hasUnsaved: boolean) {
  // Un cambio sin guardar manda sobre el resto: tanto si nunca se había
  // contestado como si ya había una respuesta guardada, lo importante ahora
  // mismo es "pulsa Guardar".
  if (hasUnsaved) return SAVE_BTN_CLASS.unsaved
  return answered ? SAVE_BTN_CLASS.answered : SAVE_BTN_CLASS.unanswered
}

// Marcador de resultado: antes era un <input type="number"> normal, que en
// varios móviles/navegadores deja escribir "-", "+", "." aunque min={0} (esa
// validación del navegador solo se aplica al enviar el formulario, no al
// teclear). Aquí se sanea la entrada a solo dígitos y se añaden botones +/-
// para no depender del teclado numérico del navegador.
function ScoreStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex shrink-0 items-stretch overflow-hidden rounded border border-gray-300">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label="Restar"
        className="w-5 shrink-0 bg-gray-50 text-sm leading-none text-gray-600 hover:bg-gray-100 disabled:opacity-30"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '')
          onChange(digits === '' ? 0 : Math.max(0, Number(digits)))
        }}
        className="w-6 shrink-0 border-x border-gray-300 py-1 text-center text-sm"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Sumar"
        className="w-5 shrink-0 bg-gray-50 text-sm leading-none text-gray-600 hover:bg-gray-100"
      >
        +
      </button>
    </div>
  )
}

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
        <ScoreStepper value={current.home} onChange={(home) => onChange({ home, away: current.away })} />
        <span className="shrink-0">-</span>
        <ScoreStepper value={current.away} onChange={(away) => onChange({ home: current.home, away })} />
        <TeamLabel name={question.config.away_team ?? 'Visitante'} />
      </div>
    )
  }

  if (question.answer_type === 'choice') {
    if (question.config.player_choice) {
      return (
        <PlayerSelect
          value={(value as string) ?? ''}
          onChange={onChange}
          excludeTeamIds={question.config.exclude_team_ids}
          position={question.config.player_position}
          nationality={question.config.player_nationality}
        />
      )
    }
    if (question.config.team_ids) {
      const teams = teamOptionsFor(question.config)
      const currentId = teams.find((t) => t.name === value)?.id ?? ''
      return <TeamSelect teams={teams} value={currentId} onChange={(id) => onChange(teams.find((t) => t.id === id)?.name ?? '')} />
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
                ? 'border-brand-700 bg-brand-700 text-white'
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
        answered={isAnswerComplete(question, value)}
        onSave={onSave}
      />
    )
  }

  if (question.answer_type === 'choice') {
    if (question.config.player_choice) {
      return (
        <div className={saving ? 'pointer-events-none opacity-50' : ''}>
          <PlayerSelect
            value={(value as string) ?? ''}
            onChange={onSave}
            excludeTeamIds={question.config.exclude_team_ids}
            position={question.config.player_position}
            nationality={question.config.player_nationality}
          />
        </div>
      )
    }
    if (question.config.team_ids) {
      const teams = teamOptionsFor(question.config)
      const currentId = teams.find((t) => t.name === value)?.id ?? ''
      return (
        <div className={saving ? 'pointer-events-none opacity-50' : ''}>
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
                ? 'border-brand-700 bg-brand-700 text-white'
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
  return <TextInput value={(value as string) ?? ''} saving={saving} answered={isAnswerComplete(question, value)} onSave={onSave} />
}

function TextInput({
  value,
  saving,
  answered,
  onSave,
}: {
  value: string
  saving: boolean
  answered: boolean
  onSave: (value: AnswerValue) => void
}) {
  const [draft, setDraft] = useState(value)
  const hasUnsaved = draft.trim() !== value.trim()
  return (
    <div className="flex flex-col gap-1">
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
          className={`rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${saveBtnClass(answered, hasUnsaved)}`}
        >
          Guardar
        </button>
      </div>
      {hasUnsaved && <p className="text-xs text-amber-600">Pulsa «Guardar» para que se guarde tu respuesta.</p>}
    </div>
  )
}

function ScorePredictionInput({
  homeTeam,
  awayTeam,
  value,
  saving,
  answered,
  onSave,
}: {
  homeTeam: string
  awayTeam: string
  value: { home: number; away: number }
  saving: boolean
  answered: boolean
  onSave: (value: AnswerValue) => void
}) {
  const [home, setHome] = useState(value.home)
  const [away, setAway] = useState(value.away)
  const hasUnsaved = home !== value.home || away !== value.away
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-sm sm:flex-nowrap">
        <TeamLabel name={homeTeam} align="right" />
        <ScoreStepper value={home} onChange={setHome} />
        <span className="shrink-0">-</span>
        <ScoreStepper value={away} onChange={setAway} />
        <TeamLabel name={awayTeam} />
        <button
          onClick={() => onSave({ home, away })}
          disabled={saving}
          className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${saveBtnClass(answered, hasUnsaved)}`}
        >
          Guardar
        </button>
      </div>
      {hasUnsaved && <p className="text-xs text-amber-600">Pulsa «Guardar» para que se guarde tu respuesta.</p>}
    </div>
  )
}
