import { useState } from 'react'
import FantasyLineupPicker from './FantasyLineupPicker'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import { isInitialPhaseClosed, INITIAL_PHASE_DEADLINE_LABEL } from '../lib/deadlines'

// Bloque 5 de "Apuestas iniciales": el 11 de Abuelonchos. A diferencia de los
// bloques 1-4 (que leen/escriben season_questions/season_answers), este lee y
// escribe directamente en las tablas fantasy_lineups/fantasy_lineup_players,
// porque la puntuación se acumula jornada a jornada en vez de calificarse una
// sola vez como el resto de preguntas. La lógica de carga/guardado vive en
// useFantasyLineup, compartida con el paso 5 del asistente de bienvenida.

export default function FantasyLineupBlock() {
  const { players, value, formation, slots, filled, complete, loading, handleChange, handleFormationChange } =
    useFantasyLineup()
  const [open, setOpen] = useState(false)
  const closed = isInitialPhaseClosed()

  return (
    <div className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium ${
          complete ? 'bg-green-100/70' : ''
        }`}
      >
        <span className="flex items-center gap-2">
          Bloque 5 · El 11 de Abuelonchos
          {complete && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
        <span className="flex items-center gap-2 text-sm font-normal text-gray-400">
          {loading ? '…' : `${filled}/${slots.length}`}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-white/40 p-3">
          {closed ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              El plazo se cerró el {INITIAL_PHASE_DEADLINE_LABEL}. Tu once se queda tal cual estaba.
            </p>
          ) : (
            <p className="flex items-start gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span aria-hidden className="shrink-0">💡</span>
              <span>
                Elige tu 11 solo con jugadores veteranos (nacidos antes de 1996). Máximo 3 jugadores entre Real
                Madrid, Atlético y Barcelona en total (da igual la mezcla). Cada jugador suma puntos jornada a
                jornada según su rendimiento real. Se guarda automáticamente al colocar cada jugador.
              </span>
            </p>
          )}
          {loading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : players.length === 0 ? (
            <p className="text-sm text-gray-400">
              Todavía no hay jugadores cargados. El admin puede añadirlos desde el panel (pestaña "Jugadores
              fantasy").
            </p>
          ) : (
            <FantasyLineupPicker
              players={players}
              formation={formation}
              value={value}
              onChange={handleChange}
              onFormationChange={closed ? undefined : handleFormationChange}
              readOnly={closed}
            />
          )}
        </div>
      )}
    </div>
  )
}
