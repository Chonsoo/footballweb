import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { TierItem } from '../lib/database.types'

// Se muestra como un modal a pantalla completa (no un desplegable anclado al
// botón) -- mismo motivo que PlayerSelect: en móvil, con el teclado abierto
// en OTRO campo de la misma página, "position: fixed" puede quedar anclado
// al viewport de layout mientras el navegador desplaza la página dentro del
// viewport visual, y un panel anclado al botón se desincroniza cada vez más
// cuanto más se mueve la página. Un modal a pantalla completa no necesita
// seguir a ningún botón, así que el problema desaparece por diseño.
export default function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: TierItem[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = teams.find((t) => t.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm"
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.badge && <img src={selected.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.name : 'Elige un equipo…'}
          </span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 p-3"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[60vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-w-md"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800">Elige un equipo</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto py-1">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                      t.id === value ? 'bg-brand-50 font-medium text-brand-800' : 'text-gray-700'
                    }`}
                  >
                    {t.badge && <img src={t.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
