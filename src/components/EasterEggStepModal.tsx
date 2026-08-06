import { createPortal } from 'react-dom'
import { EASTER_EGG_TOTAL_STEPS } from '../lib/easterEgg'

// Modal genérico de "paso completado" del Abueloncho Dorado (pasos 1, 3 y
// 4 -- el 2 tiene su propio modal con el desplegable del capitán, y el 5
// dispara la pantalla de premio en vez de esto). Portal a document.body,
// mismo motivo que el resto de modales de la app: cualquier ancestro con
// backdrop-filter rompería un position:fixed normal.
export default function EasterEggStepModal({ step, hint, onClose }: { step: number; hint: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-gradient-to-br from-gold-100 via-white to-gold-100 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-noir-950 via-noir-900 to-noir-800 px-6 py-5">
          <span className="text-4xl">🥚</span>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-400">
            Paso {step} de {EASTER_EGG_TOTAL_STEPS} · Abueloncho Dorado
          </p>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-relaxed text-gray-700">{hint}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-noir-950 shadow-sm transition-transform hover:scale-105"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
