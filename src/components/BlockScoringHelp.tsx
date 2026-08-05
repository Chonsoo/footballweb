import { useState } from 'react'
import { BLOCK_SCORING_HINTS } from '../lib/blocks'

// Botón "💡 Cómo puntúa" + modal de ayuda, para no tener el texto explicativo
// siempre visible ocupando sitio (antes era un párrafo fijo antes de la
// pregunta) -- se abre solo si el jugador quiere leerlo, como cualquier
// ayuda contextual. Se usa tanto en el asistente de bienvenida como en
// "Apuestas iniciales", para que la explicación esté en los dos sitios.
export default function BlockScoringHelp({ block, label }: { block: number; label?: string }) {
  const [open, setOpen] = useState(false)
  const hint = BLOCK_SCORING_HINTS[block]
  if (!hint) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
      >
        💡 Cómo puntúa
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{label ?? 'Cómo puntúa este bloque'}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">{hint}</p>
          </div>
        </div>
      )}
    </>
  )
}
