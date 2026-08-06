import { useState } from 'react'
import { ScoreStepper } from './QuestionInput'
import { todayResult } from '../lib/easterEgg'

// Tarjeta especial del paso 5, con la misma pinta que una apuesta flash
// normal (QuestionCard) para camuflarse entre el resto -- pero no es una
// season_question real: la respuesta correcta sale de la tabla oculta de
// Información › Reglas (un resultado fijo por día del mes), no se guarda en
// season_answers, y solo aparece una vez completado el paso 4.
export default function EasterEggFlashCard({ onCorrect }: { onCorrect: () => void }) {
  const [home, setHome] = useState(0)
  const [away, setAway] = useState(0)
  const [wrong, setWrong] = useState(false)
  const [checking, setChecking] = useState(false)

  async function handleCheck() {
    const target = todayResult()
    if (home === target.home && away === target.away) {
      setChecking(true)
      await onCorrect()
      setChecking(false)
    } else {
      setWrong(true)
      setTimeout(() => setWrong(false), 1800)
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.67] p-4 shadow-sm ring-1 ring-gold-400/50 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-gray-800">🥚 ¿Cuál es el resultado de hoy?</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ScoreStepper value={home} onChange={setHome} />
        <span className="shrink-0">-</span>
        <ScoreStepper value={away} onChange={setAway} />
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="ml-auto shrink-0 rounded bg-gold-500 px-3 py-1.5 text-sm font-semibold text-noir-950 disabled:opacity-50"
        >
          Comprobar
        </button>
      </div>
      {wrong && <p className="mt-2 text-xs text-red-600">Ese no es el resultado de hoy…</p>}
    </div>
  )
}
