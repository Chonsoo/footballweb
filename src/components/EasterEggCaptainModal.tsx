import { useState } from 'react'
import { createPortal } from 'react-dom'
import { playerMatchesSearch, type FantasyPlayer } from '../lib/fantasyTypes'
import { EASTER_EGG_HINTS, EASTER_EGG_TOTAL_STEPS } from '../lib/easterEgg'

const SILHOUETTE = '/badges/player-silhouette.png'

// Avatar de cada fila -- mismo patrón que RowAvatar en PlayerSelect.tsx
// (Pichichi y demás preguntas de jugador): si no hay foto real, silueta
// genérica en vez de dejar un hueco vacío.
function RowAvatar({ photoUrl }: { photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  const showSilhouette = !photoUrl || imgError
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
      <img
        src={showSilhouette ? SILHOUETTE : photoUrl}
        alt=""
        className={`h-full w-full object-cover ${showSilhouette ? 'scale-110' : ''}`}
        onError={() => setImgError(true)}
      />
    </div>
  )
}

// Modal específico del paso 2: primero un buscador "elige tu capitán" con
// foto, nombre y posición -- el mismo componente visual que ya se usa en
// preguntas de jugador como el Pichichi (PlayerSelect), pero limitado a la
// plantilla completa del equipo favorito (no solo los elegibles para el 11
// de Abuelonchos: aquí cuenta cualquier jugador de la plantilla). Tocar un
// jugador selecciona directamente, igual que en PlayerSelect. Solo tras
// elegir se revela la pista del paso 3 (así no se ve sin antes elegir).
export default function EasterEggCaptainModal({
  players,
  onConfirm,
  onClose,
}: {
  players: FantasyPlayer[]
  onConfirm: (playerId: number) => Promise<void> | void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = search.trim() ? players.filter((p) => playerMatchesSearch(p, search)) : players

  async function handlePick(player: FantasyPlayer) {
    setSaving(true)
    await onConfirm(player.api_player_id)
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
          <div className="px-5 py-5 text-left">
            <p className="text-center text-sm font-semibold text-gray-800">🎖️ Elige tu capitán</p>
            <p className="mt-1 text-center text-xs text-gray-500">Cualquier jugador de la plantilla de tu equipo favorito.</p>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del jugador…"
              disabled={saving}
              // text-base (16px) en vez de text-sm: por debajo de 16px, iOS
              // Safari hace zoom automático de toda la página al enfocar.
              className="mt-3 w-full rounded border border-gold-300 bg-gold-50/40 px-3 py-2 text-base placeholder:text-gold-700/40 focus:border-gold-500 focus:outline-none disabled:opacity-50 sm:text-sm"
            />
            <div className="mt-2 max-h-64 overflow-y-auto rounded border border-gold-300 bg-gradient-to-b from-gold-50 to-white">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>}
              {filtered.map((p) => (
                <button
                  key={p.api_player_id}
                  type="button"
                  disabled={saving}
                  onClick={() => handlePick(p)}
                  className="flex w-full items-center gap-2 border-b border-gold-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gold-100/70 disabled:opacity-50"
                >
                  <RowAvatar photoUrl={p.photo_url} />
                  <span className="min-w-0 flex-1 truncate text-gray-700">{p.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">{p.player_position}</span>
                </button>
              ))}
            </div>
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
