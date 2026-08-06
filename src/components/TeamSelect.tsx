import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TierItem } from '../lib/database.types'

// Alto máximo del desplegable (con scroll interno para listas largas, como
// los 12 equipos "sin competición europea").
const PANEL_MAX_HEIGHT = 224 // px, coincide con max-h-56

interface PanelRect {
  left: number
  width: number
  top: number | null // solo si se abre hacia abajo
  bottom: number | null // solo si se abre hacia arriba
}

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
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = teams.find((t) => t.id === value)

  // Ojo: el panel vive en un portal a document.body (ver más abajo), así que
  // un clic DENTRO del panel no está dentro de `ref` (el botón) y hay que
  // comprobarlo aparte, o se cerraría solo con tocar cualquier fila.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Cerrar en vez de reposicionar en cada scroll/resize -- mismo motivo que
  // en PlayerSelect: el panel usa position:fixed anclado a la posición del
  // botón en el momento de abrir, y si la página se desplaza sin cerrar, se
  // quedaría "despegado" del botón.
  useEffect(() => {
    if (!open) return
    function close() {
      setOpen(false)
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Si no cabe entero por debajo (p.ej. cerca del final de la página), se
  // abre hacia arriba en vez de solaparse con lo que venga después.
  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < PANEL_MAX_HEIGHT + 16
      setPanelRect({
        left: rect.left,
        width: rect.width,
        top: openUp ? null : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : null,
      })
    }
    setOpen((v) => !v)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
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
        panelRect &&
        createPortal(
          // Portal a document.body + position:fixed anclado a la posición del
          // botón, igual que en PlayerSelect: si no, el panel queda atrapado
          // dentro del contexto de apilamiento de la tarjeta que lo contiene
          // (backdrop-blur-sm crea uno nuevo) y no puede pintarse por encima
          // de la siguiente tarjeta de pregunta.
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: panelRect.left,
              width: panelRect.width,
              top: panelRect.top ?? undefined,
              bottom: panelRect.bottom ?? undefined,
            }}
            className="z-50 max-h-56 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg"
          >
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  t.id === value ? 'bg-brand-50 font-medium text-brand-800' : 'text-gray-700'
                }`}
              >
                {t.badge && <img src={t.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                {t.name}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
