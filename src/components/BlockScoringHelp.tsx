import { useState } from 'react'
import { BLOCK_SCORING_HINTS } from '../lib/blocks'

// Botón "💡 Cómo puntúa" + modal de ayuda, para no tener el texto explicativo
// siempre visible ocupando sitio (antes era un párrafo fijo antes de la
// pregunta) -- se abre solo si el jugador quiere leerlo, como cualquier
// ayuda contextual. Se usa tanto en el asistente de bienvenida como en
// "Apuestas iniciales", para que la explicación esté en los dos sitios.
export default function BlockScoringHelp({ block, label }: { block: number; label?: string }) {
  const [open, setOpen] = useState(false)
  const lines = BLOCK_SCORING_HINTS[block]
  if (!lines || lines.length === 0) return null

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
        // items-start + overflow-y-auto en el fondo (no items-center): con
        // textos largos (bloque 2, 8 líneas) el modal podía ser más alto que
        // la pantalla y quedaba cortado sin forma de hacer scroll -- así,
        // si no cabe entero, se puede desplazar todo el fondo hacia abajo.
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 p-4">
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
            <ul className="flex flex-col gap-2 overflow-y-auto p-4 text-sm leading-relaxed text-gray-600">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-brand-500">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
