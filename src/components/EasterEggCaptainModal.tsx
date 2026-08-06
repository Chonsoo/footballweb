import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { FantasyPlayer } from '../lib/fantasyTypes'
import { EASTER_EGG_HINTS, EASTER_EGG_TOTAL_STEPS } from '../lib/easterEgg'

// Modal específico del paso 2: primero un desplegable "elige tu capitán"
// con los jugadores del equipo favorito, y solo tras confirmar se revela
// la pista del paso 3 (así el jugador no ve la pista sin antes elegir).
export default function EasterEggCaptainModal({
  players,
  onConfirm,
  onClose,
}: {
  players: FantasyPlayer[]
  onConfirm: (playerId: number) => Promise<void> | void
  onClose: () => void
}) {
  const [selected, setSelected] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    if (!selected) return
    setSaving(true)
    await onConfirm(Number(selected))
    setSaving(false)
    setConfirmed(true)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={confirmed ? onClose : undefined}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-gold-100 via-white to-gold-100 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-noir-950 via-noir-900 to-noir-800 px-6 py-5">
          {!confirmed && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          )}
          <span className="text-4xl">🥚</span>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-400">
            Paso 2 de {EASTER_EGG_TOTAL_STEPS} · Abueloncho Dorado
          </p>
        </div>

        {!confirmed ? (
          <div className="px-6 py-5">
            <p className="text-sm font-semibold text-gray-800">🎖️ Elige tu capitán</p>
            <p className="mt-1 text-xs text-gray-500">Un jugador de tu equipo favorito de esta temporada.</p>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
            >
              <option value="">Selecciona un jugador…</option>
              {players.map((p) => (
                <option key={p.api_player_id} value={p.api_player_id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selected || saving}
              onClick={handleConfirm}
              className="mt-4 w-full rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-noir-950 shadow-sm transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        ) : (
          <div className="px-6 py-5">
            <p className="text-sm leading-relaxed text-gray-700">{EASTER_EGG_HINTS[2]}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-noir-950 shadow-sm transition-transform hover:scale-105"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
