import { useEffect, useRef, useState } from 'react'
import type { TierItem } from '../lib/database.types'

// Alto máximo del desplegable (con scroll interno para listas largas, como
// los 12 equipos "sin competición europea").
const PANEL_MAX_HEIGHT = 224 // px, coincide con max-h-56

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
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = teams.find((t) => t.id === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Si no cabe entero por debajo (p.ej. cerca del final de la página), se
  // abre hacia arriba en vez de solaparse con lo que venga después.
  function toggleOpen() {
    if (!open && btnRef.current) {
      const spaceBelow = window.innerHeight - btnRef.current.getBoundingClientRect().bottom
      setOpenUp(spaceBelow < PANEL_MAX_HEIGHT + 16)
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

      {open && (
        <div
          className={`absolute inset-x-0 z-20 max-h-56 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
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
                t.id === value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'
              }`}
            >
              {t.badge && <img src={t.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
