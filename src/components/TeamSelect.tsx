import { useEffect, useRef, useState } from 'react'
import type { TierItem } from '../lib/database.types'

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
  const ref = useRef<HTMLDivElement>(null)
  const selected = teams.find((t) => t.id === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
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
