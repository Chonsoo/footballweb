import { useEffect, useRef, useState } from 'react'
import { usePlayers } from '../lib/usePlayers'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { playerMatchesSearch, type FantasyPlayer, type FantasyPosition } from '../lib/fantasyTypes'

const SILHOUETTE = '/badges/player-silhouette.png'

const PANEL_MAX_HEIGHT = 288 // px, coincide con max-h-72

// Avatar pequeño (foto o silueta) para cada fila del desplegable. Aparte
// (no inline en el map) para que el estado de "la foto no cargó" sea por
// jugador y no se contamine entre filas.
function RowAvatar({ photoUrl }: { photoUrl: string | null }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
      {photoUrl && !imgError ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
      )}
    </div>
  )
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
  disabled,
}: {
  value: string
  onChange: (name: string) => void
  excludeTeamIds?: string[]
  position?: FantasyPosition
  disabled?: boolean
}) {
  const { players, loading } = usePlayers()
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [search, setSearch] = useState('')
  const [imgError, setImgError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  let pool = excludeTeamIds?.length ? players.filter((p) => !excludeTeamIds.includes(p.team_id ?? '')) : players
  if (position) pool = pool.filter((p) => p.player_position === position)
  const selected = pool.find((p) => p.name === value)

  const filtered = search.trim() ? pool.filter((p) => playerMatchesSearch(p, search)) : pool

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setImgError(false)
  }, [value])

  function toggleOpen() {
    if (!open && btnRef.current) {
      const spaceBelow = window.innerHeight - btnRef.current.getBoundingClientRect().bottom
      setOpenUp(spaceBelow < PANEL_MAX_HEIGHT + 16)
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
            <p className="text-xs text-gray-400">
              {selected.player_position}
              {selectedTeam ? ` · ${selectedTeam.name}` : ''}
            </p>
          </div>
        </div>
      )}

      {open && (
        <div
          className={`absolute inset-x-0 z-20 flex max-h-72 flex-col rounded border border-gray-200 bg-white shadow-lg ${
            openUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre del jugador…"
            className="m-1.5 rounded border border-gray-200 px-2 py-1.5 text-sm"
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
                    p.name === value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700'
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
      )}
    </div>
  )
}
