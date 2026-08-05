import { useState } from 'react'
import { TeamLabel, ScoreStepper } from './QuestionInput'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

// Bloque 3 (Duelos Big Three): antes cada partido (ida y vuelta) salía como
// una QuestionCard completa e independiente -- con 3 enfrentamientos son 6
// tarjetas seguidas repitiendo escudos y nombres para lo que en el fondo son
// solo 3 decisiones. Aquí se agrupan ida+vuelta de un mismo enfrentamiento en
// UNA sola tarjeta (mismo espíritu que el resumen ya usado en Información),
// así quedan 3 tarjetas en vez de 6.
function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

// Igual que el botón "Guardar" de QuestionInput.tsx (ahí es privado): verde
// si ya está guardado y coincide con lo que hay en el formulario, ámbar si
// hay un cambio sin guardar todavía, rojo si nunca se ha contestado.
function saveBtnClass(answered: boolean, hasUnsaved: boolean) {
  if (hasUnsaved) return 'bg-amber-500 hover:bg-amber-600'
  return answered ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
}

function LegRow({
  question,
  myAnswer,
  saving,
  onSave,
  label,
}: {
  question: SeasonQuestion
  myAnswer?: SeasonAnswer
  saving: boolean
  onSave: (value: AnswerValue) => void
  label: string
}) {
  const stored = (myAnswer?.answer as { home: number; away: number } | undefined) ?? { home: 0, away: 0 }
  const [home, setHome] = useState(stored.home)
  const [away, setAway] = useState(stored.away)
  const hasUnsaved = home !== stored.home || away !== stored.away
  const answered = isAnswerComplete(question, myAnswer?.answer)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 text-sm sm:flex-nowrap">
        {label && <span className="w-10 shrink-0 text-[11px] font-semibold uppercase text-gray-400">{label}</span>}
        <TeamLabel name={question.config.home_team ?? 'Local'} align="right" />
        <ScoreStepper value={home} onChange={setHome} />
        <span className="shrink-0">-</span>
        <ScoreStepper value={away} onChange={setAway} />
        <TeamLabel name={question.config.away_team ?? 'Visitante'} />
        <button
          onClick={() => onSave({ home, away })}
          disabled={saving}
          className={`ml-auto shrink-0 rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 sm:ml-0 ${saveBtnClass(answered, hasUnsaved)}`}
        >
          Guardar
        </button>
      </div>
      {hasUnsaved && <p className="pl-12 text-xs text-amber-600">Pulsa «Guardar» para que se guarde tu respuesta.</p>}
    </div>
  )
}

export default function BigThreeInput({
  questions,
  answers,
  savingId,
  onSave,
}: {
  questions: SeasonQuestion[]
  answers: Record<string, SeasonAnswer | undefined>
  savingId: string | null
  onSave: (questionId: string, value: AnswerValue) => void
}) {
  const pairs = new Map<string, SeasonQuestion[]>()
  for (const q of questions) {
    const home = q.config.home_team
    const away = q.config.away_team
    if (!home || !away) continue
    const key = pairKey(home, away)
    if (!pairs.has(key)) pairs.set(key, [])
    pairs.get(key)!.push(q)
  }

  return (
    <div className="flex flex-col gap-3">
      {[...pairs.values()].map((legs, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-center font-semibold text-gray-800">
            {legs[0]?.config.home_team} <span className="font-normal text-gray-400">vs</span> {legs[0]?.config.away_team}
          </p>
          <div className="flex flex-col gap-3">
            {legs.map((leg, idx) => (
              <LegRow
                key={leg.id}
                question={leg}
                myAnswer={answers[leg.id]}
                saving={savingId === leg.id}
                onSave={(value) => onSave(leg.id, value)}
                label={legs.length > 1 ? (idx === 0 ? 'Ida' : 'Vuelta') : ''}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
