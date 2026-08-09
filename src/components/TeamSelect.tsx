import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TierItem } from '../lib/database.types'

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

  // Compartida entre la apertura y el "seguimiento" del botón mientras la
  // página aún se está moviendo (ver el efecto de scroll/resize más abajo).
  // Siempre abre hacia ABAJO -- nunca hacia arriba: probamos antes a
  // desplazar la página nosotros mismos al abrir para dejar hueco, pero eso
  // se sumaba al scroll que hace el propio navegador al enfocar un campo
  // cercano (el teclado desplaza la página sola), y las dos correcciones no
  // cuadraban entre sí. Ahora no tocamos el scroll nosotros: el panel se
  // coloca donde esté el botón en ese momento y, si el navegador desplaza la
  // página después, el efecto de "seguimiento" de abajo lo realinea solo.
  function computePanelRect(): PanelRect | null {
    if (!btnRef.current) return null
    const rect = btnRef.current.getBoundingClientRect()
    return {
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 4,
      bottom: null,
    }
  }

  // Mientras el panel está abierto, se recalcula su posición en CADA
  // fotograma siguiendo al botón (en vez de reaccionar a eventos de scroll o
  // resize) -- mismo motivo que en PlayerSelect: los eventos de scroll/resize
  // no siempre llegan en el momento exacto ni con la frecuencia necesaria
  // para mantener el panel pegado al botón mientras la página se mueve
  // (p.ej. por el teclado al enfocar otro campo cercano), así que a veces se
  // quedaba desalineado. Siguiendo la posición real fotograma a fotograma
  // queda siempre bien colocado sin importar la causa del movimiento.
  useEffect(() => {
    if (!open) return
    let rafId: number
    function track() {
      const rect = computePanelRect()
      if (rect) {
        setPanelRect((prev) =>
          prev && prev.left === rect.left && prev.width === rect.width && prev.top === rect.top ? prev : rect
        )
      }
      rafId = requestAnimationFrame(track)
    }
    rafId = requestAnimationFrame(track)
    return () => cancelAnimationFrame(rafId)
  }, [open])

  function toggleOpen() {
    if (!open) {
      const finalRect = computePanelRect()
      if (finalRect) setPanelRect(finalRect)
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
