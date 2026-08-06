import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayers } from '../lib/usePlayers'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { playerMatchesSearch, type FantasyPlayer, type FantasyPosition } from '../lib/fantasyTypes'
import { playerHasNationality, getNationalityInfo } from '../lib/nationalityFlags'

const SILHOUETTE = '/badges/player-silhouette.png'

const PANEL_MAX_HEIGHT = 288 // px, coincide con max-h-72

// Avatar pequeño (solo foto real) para cada fila del desplegable. Aparte
// (no inline en el map) para que el estado de "la foto no cargó" sea por
// jugador y no se contamine entre filas. Si no hay foto real no se pinta la
// silueta genérica aquí — en una lista larga, repetir el mismo icono negro
// en decenas de filas es ruido visual sin información; solo aporta cuando
// hay una foto de verdad que mostrar. Se deja un hueco del mismo tamaño para
// que el escudo y el nombre no bailen entre filas con y sin foto.
function RowAvatar({ photoUrl }: { photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  if (!photoUrl || imgError) return <div className="h-6 w-6 shrink-0" />
  return (
    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
      <img src={photoUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
    </div>
  )
}

interface PanelRect {
  left: number
  width: number
  top: number | null // solo si se abre hacia abajo
  bottom: number | null // solo si se abre hacia arriba
}

// Selector con buscador para preguntas de jugador (Pichichi, Trofeo Zamora,
// Máximo Asistente…). Se guarda el nombre del jugador como texto, igual que
// hace TeamSelect con los equipos, así el resto del flujo de calificación
// (config.options, comparación de texto) no cambia.
export default function PlayerSelect({
  value,
  onChange,
  excludeTeamIds,
  position,
  nationality,
  disabled,
}: {
  value: string
  onChange: (name: string) => void
  excludeTeamIds?: string[]
  position?: FantasyPosition
  nationality?: string
  disabled?: boolean
}) {
  const { players, loading } = usePlayers()
  const [open, setOpen] = useState(false)
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null)
  const [search, setSearch] = useState('')
  const [imgError, setImgError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  let pool = excludeTeamIds?.length ? players.filter((p) => !excludeTeamIds.includes(p.team_id ?? '')) : players
  if (position) pool = pool.filter((p) => p.player_position === position)
  if (nationality) pool = pool.filter((p) => playerHasNationality(p.nationality, nationality))
  const selected = pool.find((p) => p.name === value)

  const filtered = search.trim() ? pool.filter((p) => playerMatchesSearch(p, search)) : pool

  // Cierra al hacer clic fuera -- ojo, el panel desplegado vive en un portal
  // a document.body (ver más abajo), así que un clic DENTRO del panel no
  // está dentro de `ref` (el botón) y hay que comprobarlo aparte, o se
  // cerraría solo con tocar cualquier fila.
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

  useEffect(() => {
    setImgError(false)
  }, [value])

  // Cerrar en vez de reposicionar en cada scroll/resize -- el panel usa
  // position:fixed anclado a la posición del botón en el momento de abrir
  // (ver toggleOpen), y si la página se desplaza sin cerrar, se quedaría
  // "despegado" del botón. Cerrarlo es la solución más simple y ya es el
  // patrón que se usa en el resto de desplegables de la app.
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

  function teamOf(p: FantasyPlayer) {
    return LALIGA_TEAMS_2026_27.find((t) => t.id === p.team_id)
  }
  const selectedTeam = selected ? teamOf(selected) : undefined

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled || loading}
        onClick={toggleOpen}
        className="flex w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          {selectedTeam?.badge && <img src={selectedTeam.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {loading ? 'Cargando jugadores…' : selected ? selected.name : 'Busca un jugador…'}
          </span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {selected && !open && (
        <div className="mt-2 flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
            {selected.photo_url && !imgError ? (
              <img
                src={selected.photo_url}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800">{selected.name}</p>
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <span>
                {selected.player_position}
                {selectedTeam ? ` · ${selectedTeam.name}` : ''}
              </span>
              {(() => {
                const nat = getNationalityInfo(selected.nationality)
                return nat ? <span title={nat.label}>{nat.flag}</span> : null
              })()}
            </p>
          </div>
        </div>
      )}

      {open &&
        panelRect &&
        createPortal(
          // Portal a document.body + position:fixed anclado a la posición del
          // botón: si no, el panel queda ATRAPADO dentro del contexto de
          // apilamiento de la tarjeta que lo contiene (backdrop-blur-sm crea
          // uno nuevo, igual que un transform), y por más z-index que se le
          // ponga nunca puede pintarse por encima de la SIGUIENTE tarjeta de
          // pregunta -- justo lo que pasaba antes (el desplegable de
          // "Pichichi Absoluto" se quedaba tapado detrás de "Trofeo Zamora").
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              left: panelRect.left,
              width: panelRect.width,
              top: panelRect.top ?? undefined,
              bottom: panelRect.bottom ?? undefined,
            }}
            className="z-50 flex max-h-72 flex-col rounded border border-gray-200 bg-white shadow-lg"
          >
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre del jugador…"
              // text-base (16px) en vez de text-sm: por debajo de 16px, iOS Safari
              // hace zoom automático de toda la página al enfocar el campo.
              // focus:outline-none + un anillo propio en vez de dejar el foco por
              // defecto del navegador -- sin esto, según el navegador/SO puede
              // salir de un color que no pega con la app (p.ej. dorado, que aquí
              // se reserva para el Abueloncho Dorado).
              className="m-1.5 rounded border border-gray-200 px-2 py-1.5 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
            />
            <div className="overflow-y-auto">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>}
              {filtered.map((p) => {
                const team = teamOf(p)
                return (
                  <button
                    key={p.api_player_id}
                    type="button"
                    onClick={() => {
                      onChange(p.name)
                      setSearch('')
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      p.name === value ? 'bg-brand-50 font-medium text-brand-800' : 'text-gray-700'
                    }`}
                  >
                    <RowAvatar photoUrl={p.photo_url} />
                    {team?.badge && <img src={team.badge} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {p.player_position}
                      {team ? ` · ${team.name}` : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
