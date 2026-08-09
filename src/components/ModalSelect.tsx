import { useState } from 'react'
import { createPortal } from 'react-dom'

// Selector de una opción entre varias, con el mismo modal a pantalla completa
// que TeamSelect/PlayerSelect (en vez de un <select> nativo) -- para que el
// admin tenga una experiencia consistente en toda la app, sobre todo en móvil.
export interface ModalSelectOption<T extends string> {
  value: T
  label: string
}

export default function ModalSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder,
}: {
  options: ModalSelectOption<T>[]
  value: T
  onChange: (v: T) => void
  // Título del modal.
  label?: string
  // Texto cuando no hay nada elegido todavía.
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected ? selected.label : (placeholder ?? 'Elige…')}</span>
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
                <h3 className="text-sm font-semibold text-gray-800">{label ?? 'Elige una opción'}</h3>
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
              <div className="flex-1 overflow-y-auto py-1">
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
                      o.value === value ? 'bg-brand-50 font-medium text-brand-800' : 'text-gray-700'
                    }`}
                  >
                    {o.label}
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
