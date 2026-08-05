import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BLOCK_SCORING_HINTS } from '../lib/blocks'

// Botón "💡 Cómo puntúa" + modal de ayuda, para no tener el texto explicativo
// siempre visible ocupando sitio (antes era un párrafo fijo antes de la
// pregunta) -- se abre solo si el jugador quiere leerlo, como cualquier
// ayuda contextual. Se usa tanto en el asistente de bienvenida como en
// "Apuestas iniciales", para que la explicación esté en los dos sitios.
export default function BlockScoringHelp({
  block,
  label,
  buttonLabel = '💡 Cómo puntúa',
  centered = false,
}: {
  block: number
  label?: string
  // El Bloque 5 (El 11 de Abuelonchos) no puntúa como los demás -- ahí no
  // tiene sentido "Cómo puntúa", así que el botón admite un texto distinto
  // ("Cómo funciona") reutilizando el mismo modal.
  buttonLabel?: string
  // Apuestas iniciales quiere el modal centrado en la pantalla (igual que
  // "Mis datos" o "Cerrar sesión"), pero en el asistente de bienvenida el
  // contenido de algunos bloques es largo y necesita anclarse arriba (si no,
  // con items-center el modal "baila" verticalmente según cuánto texto
  // tenga, y en textos largos casi no deja margen arriba). Por eso el
  // centrado es opt-in y el asistente no lo activa, se queda como estaba.
  centered?: boolean
}) {
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
        {buttonLabel}
      </button>

      {open &&
        // Portal a document.body: este botón se usa dentro de tarjetas con
        // backdrop-blur (el "cristal" del rediseño), y cualquier ancestro
        // con backdrop-filter pasa a ser el "containing block" de sus
        // descendientes position:fixed -- el modal quedaba encajado al
        // tamaño/posición de esa tarjeta en vez de a pantalla completa, y su
        // botón "✕" acababa tapado detrás del navbar (por eso cerraba solo
        // pulsando fuera, no con la X). Con el portal, el modal se monta
        // fuera de toda esa jerarquía, así que "fixed" siempre es relativo
        // al viewport de verdad, venga de donde venga.
        createPortal(
          // overflow-y-auto en el fondo pase lo que pase: con textos largos
          // (bloque 2, 8 líneas) el modal podía ser más alto que la pantalla
          // y quedaba cortado sin forma de hacer scroll -- así, si no cabe
          // entero, se puede desplazar todo el fondo hacia abajo tanto
          // centrado como anclado arriba.
          <div
            className={`fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/40 px-4 py-8 ${
              centered ? 'items-center' : 'items-start'
            }`}
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
          </div>,
          document.body
        )}
    </>
  )
}
