import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePlayers } from '../lib/usePlayers'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { playerMatchesSearch, type FantasyPlayer, type FantasyPosition } from '../lib/fantasyTypes'
import { playerHasNationality, getNationalityInfo } from '../lib/nationalityFlags'

const SILHOUETTE = '/badges/player-silhouette.png'

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

// Selector con buscador para preguntas de jugador (Pichichi, Trofeo Zamora,
// Máximo Asistente…). Se guarda el nombre del jugador como texto, igual que
// hace TeamSelect con los equipos, así el resto del flujo de calificación
// (config.options, comparación de texto) no cambia.
//
// Se muestra como un modal a pantalla completa (no un desplegable anclado al
// botón) a propósito: en móvil, con el teclado abierto, "position: fixed"
// puede quedar anclado al viewport de layout mientras el navegador desplaza
// la página dentro del viewport visual (dos sistemas de coordenadas
// distintos) -- cuanto más se movía la página, más se desincronizaba un
// panel anclado al botón, sin arreglo fiable entre navegadores. Un modal a
// pantalla completa no necesita seguir a ningún botón, así que el problema
// desaparece por diseño.
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
  const [search, setSearch] = useState('')
  const [imgError, setImgError] = useState(false)

  let pool = excludeTeamIds?.length ? players.filter((p) => !excludeTeamIds.includes(p.team_id ?? '')) : players
  if (position) pool = pool.filter((p) => p.player_position === position)
  if (nationality) pool = pool.filter((p) => playerHasNationality(p.nationality, nationality))
  const selected = pool.find((p) => p.name === value)

  const filtered = search.trim() ? pool.filter((p) => playerMatchesSearch(p, search)) : pool

  useEffect(() => {
    setImgError(false)
  }, [value])

  // Al cerrar (elegido un jugador o cancelado), se limpia la búsqueda para
  // la próxima vez que se abra.
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  function teamOf(p: FantasyPlayer) {
    return LALIGA_TEAMS_2026_27.find((t) => t.id === p.team_id)
  }
  const selectedTeam = selected ? teamOf(selected) : undefined

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen(true)}
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

      {selected && (
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
        createPortal(
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 p-3"
            onClick={() => setOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex h-[60vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-w-md"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-800">Elige un jugador</h3>
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
                // se reserva para el Abueloncho Dorado). autoFocus aquí es seguro:
                // al ser un modal a pantalla completa (no un desplegable anclado a
                // un botón), no importa que el teclado desplace la página.
                className="mx-3 mt-3 rounded border border-gray-200 px-2 py-1.5 text-base focus:border-brand-500 focus:outline-none sm:text-sm"
              />
              <div className="mt-2 flex-1 overflow-y-auto">
                {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>}
                {filtered.map((p) => {
                  const team = teamOf(p)
                  return (
                    <button
                      key={p.api_player_id}
                      type="button"
                      onClick={() => {
                        onChange(p.name)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${
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
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
