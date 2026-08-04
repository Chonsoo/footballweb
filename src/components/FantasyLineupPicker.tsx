import { useMemo, useState } from 'react'
import {
  FANTASY_FORMATIONS,
  FANTASY_POSITIONS,
  FANTASY_POSITION_LABELS,
  buildFantasySlots,
  formationLabel,
  playerMatchesSearch,
  slotKey,
  type FantasyFormation,
  type FantasyPlayer,
  type FantasyPosition,
  type FantasySlot,
} from '../lib/fantasyTypes'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import PlayerCard from './PlayerCard'

const POSITION_COLORS: Record<FantasyPosition, string> = {
  POR: 'bg-orange-200 text-orange-900',
  DEF: 'bg-blue-200 text-blue-900',
  MED: 'bg-green-200 text-green-900',
  DEL: 'bg-red-200 text-red-900',
}

interface Props {
  players: FantasyPlayer[]
  formation: FantasyFormation
  // Clave: api_player_id (como string) · Valor: slotKey ("DEF-2", "POR-1"...)
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  onFormationChange?: (next: FantasyFormation) => void
  readOnly?: boolean
  // Solo el campo, sin buscador/banquillo ni el toggle campo/lista — para
  // mostrar un once ya cerrado (p.ej. en "Mis apuestas"), donde no hace
  // falta nada de eso.
  hideSidebar?: boolean
  // Puntos fantasy a mostrar como insignia sobre cada jugador colocado
  // (clave: api_player_id) — para la pestaña Fantasy (Resumen/Jornadas/Liga).
  pointsByPlayer?: Record<number, number>
  // En modo readOnly, tocar un jugador del campo llama aquí en vez de
  // intentar seleccionarlo para colocarlo (que no tiene sentido si es de
  // solo lectura) — se usa para abrir el popup de desglose de puntos.
  onPlayerSelect?: (player: FantasyPlayer) => void
}

export default function FantasyLineupPicker({
  players,
  formation,
  value,
  onChange,
  onFormationChange,
  readOnly,
  hideSidebar,
  pointsByPlayer,
  onPlayerSelect,
}: Props) {
  const slots = useMemo(() => buildFantasySlots(formation), [formation])
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<Set<FantasyPosition>>(new Set())
  const [view, setView] = useState<'pitch' | 'list'>('pitch')
  const [poolView, setPoolView] = useState<'chips' | 'cards'>('chips')

  function togglePositionFilter(pos: FantasyPosition) {
    setPositionFilter((cur) => {
      const next = new Set(cur)
      if (next.has(pos)) next.delete(pos)
      else next.add(pos)
      return next
    })
  }

  const playersById = useMemo(() => {
    const m = new Map<number, FantasyPlayer>()
    for (const p of players) m.set(p.api_player_id, p)
    return m
  }, [players])

  function playerAtSlot(key: string): FantasyPlayer | null {
    const idStr = Object.keys(value).find((id) => value[id] === key)
    return idStr ? playersById.get(Number(idStr)) ?? null : null
  }

  const placedIds = new Set(Object.keys(value).map(Number))
  let filtered = players.filter((p) => !placedIds.has(p.api_player_id))
  if (positionFilter.size > 0) {
    filtered = filtered.filter((p) => positionFilter.has(p.player_position))
  }
  if (search.trim()) {
    filtered = filtered.filter((p) => playerMatchesSearch(p, search))
  }
  const unplacedCount = players.filter((p) => !placedIds.has(p.api_player_id)).length

  const selectedPlayer = selected != null ? playersById.get(selected) ?? null : null

  function handlePlayerClick(id: number) {
    if (readOnly) {
      if (onPlayerSelect) {
        const p = playersById.get(id)
        if (p) onPlayerSelect(p)
      }
      return
    }
    setSelected((cur) => (cur === id ? null : id))
  }

  function handleSlotClick(slot: FantasySlot) {
    if (readOnly || selected == null || !selectedPlayer) return
    if (selectedPlayer.player_position !== slot.position) return // no encaja en ese hueco

    const key = slotKey(slot)
    const selectedIdStr = String(selected)
    const next = { ...value }
    const occupant = playerAtSlot(key)
    const selectedOldSlot = next[selectedIdStr]

    if (occupant && occupant.api_player_id !== selected) {
      if (selectedOldSlot != null) {
        next[String(occupant.api_player_id)] = selectedOldSlot
      } else {
        delete next[String(occupant.api_player_id)]
      }
    }
    next[selectedIdStr] = key
    onChange(next)
    setSelected(null)
  }

  function handlePoolAreaClick() {
    if (readOnly || selected == null) return
    const selectedIdStr = String(selected)
    if (value[selectedIdStr] == null) {
      setSelected(null)
      return
    }
    const next = { ...value }
    delete next[selectedIdStr]
    onChange(next)
    setSelected(null)
  }

  // Quita a un jugador colocado directamente (la "x" del avatar en el campo),
  // sin tener que seleccionarlo primero y luego tocar el banquillo.
  function handleRemovePlacement(id: number) {
    if (readOnly) return
    const next = { ...value }
    delete next[String(id)]
    onChange(next)
    if (selected === id) setSelected(null)
  }

  const effectiveView = hideSidebar ? 'pitch' : view

  return (
    <div className="flex flex-col gap-3">
      {!hideSidebar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {onFormationChange && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500" htmlFor="fantasy-formation">
                Formación
              </label>
              <select
                id="fantasy-formation"
                value={formationLabel(formation)}
                disabled={readOnly}
                onChange={(e) => {
                  const opt = FANTASY_FORMATIONS.find((f) => f.label === e.target.value)
                  if (opt) onFormationChange(opt.formation)
                }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                {FANTASY_FORMATIONS.map((f) => (
                  <option key={f.label} value={f.label}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex overflow-hidden rounded border border-gray-300 text-xs">
            <button
              type="button"
              onClick={() => setView('pitch')}
              className={`px-2 py-1 font-medium ${view === 'pitch' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Campo
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-2 py-1 font-medium ${view === 'list' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600'}`}
            >
              Lista
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
        {effectiveView === 'pitch' ? (
          <PitchView
            slots={slots}
            playerAtSlot={playerAtSlot}
            selected={selected}
            selectedPlayer={selectedPlayer}
            readOnly={readOnly}
            pointsByPlayer={pointsByPlayer}
            onSlotClick={handleSlotClick}
            onPlayerClick={handlePlayerClick}
            onRemovePlayer={handleRemovePlacement}
          />
        ) : (
          <div className="min-w-0 overflow-hidden rounded border border-gray-200 sm:flex-1">
            {slots.map((slot) => {
              const key = slotKey(slot)
              const occupant = playerAtSlot(key)
              const eligible = !!selectedPlayer && selectedPlayer.player_position === slot.position
              return (
                <div
                  key={key}
                  onClick={() => handleSlotClick(slot)}
                  className={`flex h-11 items-center gap-2 border-b border-gray-100 px-2 transition-colors last:border-b-0 ${
                    selectedPlayer && !readOnly
                      ? eligible
                        ? 'cursor-pointer bg-brand-50/40 hover:bg-brand-50'
                        : 'cursor-not-allowed opacity-40'
                      : ''
                  }`}
                >
                  <span
                    className={`flex h-6 w-9 shrink-0 items-center justify-center rounded text-[10px] font-semibold ${POSITION_COLORS[slot.position]}`}
                  >
                    {slot.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    {occupant ? (
                      <PlayerChip
                        player={occupant}
                        selected={selected === occupant.api_player_id}
                        onClick={() => handlePlayerClick(occupant.api_player_id)}
                        compact
                      />
                    ) : (
                      <span className="text-xs text-gray-300">Toca aquí</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!hideSidebar && (
        <div className="sm:w-64 sm:shrink-0">
          <div className="flex flex-col gap-1.5 pt-1 sm:sticky sm:top-16 sm:pt-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugador…"
              disabled={readOnly}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
            <div className="flex flex-wrap gap-1">
              {FANTASY_POSITIONS.map((pos) => {
                const active = positionFilter.has(pos)
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePositionFilter(pos)}
                    disabled={readOnly}
                    className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
                      active ? POSITION_COLORS[pos] + ' ring-2 ring-offset-1 ring-brand-500' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {pos}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-500">Sin colocar ({unplacedCount})</p>
              <div className="flex overflow-hidden rounded border border-gray-300 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPoolView('chips')}
                  className={`px-1.5 py-0.5 font-medium ${poolView === 'chips' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600'}`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setPoolView('cards')}
                  className={`px-1.5 py-0.5 font-medium ${poolView === 'cards' ? 'bg-yellow-700 text-white' : 'bg-white text-gray-600'}`}
                >
                  Cartas
                </button>
              </div>
            </div>
            <div
              onClick={handlePoolAreaClick}
              className={`flex max-h-64 overflow-y-auto rounded border border-dashed p-2 transition-colors sm:max-h-[60vh] ${
                poolView === 'cards' ? 'flex-row flex-wrap gap-2' : 'flex-col gap-1'
              } ${selected != null && !readOnly ? 'cursor-pointer border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'}`}
            >
              {filtered.length === 0 && <span className="text-xs text-gray-300">Sin resultados</span>}
              {filtered.map((p) =>
                poolView === 'cards' ? (
                  <PlayerCard
                    key={p.api_player_id}
                    player={p}
                    size="sm"
                    selected={selected === p.api_player_id}
                    onClick={() => handlePlayerClick(p.api_player_id)}
                  />
                ) : (
                  <PlayerChip
                    key={p.api_player_id}
                    player={p}
                    selected={selected === p.api_player_id}
                    onClick={() => handlePlayerClick(p.api_player_id)}
                    pool
                  />
                )
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {!readOnly && !hideSidebar && (
        <p className="text-xs text-gray-400">
          {selectedPlayer
            ? `Ahora toca un hueco de ${FANTASY_POSITION_LABELS[selectedPlayer.player_position]} para colocarlo (los demás huecos se atenúan).`
            : 'Toca un jugador y luego el hueco donde quieres colocarlo.'}
        </p>
      )}
    </div>
  )
}

const PITCH_ROWS: FantasyPosition[] = ['DEL', 'MED', 'DEF', 'POR']

function PitchView({
  slots,
  playerAtSlot,
  selected,
  selectedPlayer,
  readOnly,
  pointsByPlayer,
  onSlotClick,
  onPlayerClick,
  onRemovePlayer,
}: {
  slots: FantasySlot[]
  playerAtSlot: (key: string) => FantasyPlayer | null
  selected: number | null
  selectedPlayer: FantasyPlayer | null
  readOnly?: boolean
  pointsByPlayer?: Record<number, number>
  onSlotClick: (slot: FantasySlot) => void
  onPlayerClick: (id: number) => void
  onRemovePlayer: (id: number) => void
}) {
  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden rounded-lg border-2 border-green-900 p-3 py-6"
      style={{
        backgroundColor: '#2f8f4e',
        backgroundImage:
          'repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 36px, rgba(0,0,0,0.04) 36px, rgba(0,0,0,0.04) 72px)',
      }}
    >
      {/* Líneas del campo, solo decorativas */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/25" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-16 w-40 -translate-x-1/2 border border-b-0 border-white/25" />

      {PITCH_ROWS.map((pos) => {
        const rowSlots = slots.filter((s) => s.position === pos)
        if (rowSlots.length === 0) return null
        return (
          <div key={pos} className="flex flex-wrap items-start justify-evenly gap-2">
            {rowSlots.map((slot) => {
              const key = slotKey(slot)
              const occupant = playerAtSlot(key)
              const eligible = !!selectedPlayer && selectedPlayer.player_position === slot.position
              return (
                <div
                  key={key}
                  onClick={() => onSlotClick(slot)}
                  className={`flex flex-col items-center gap-0.5 rounded ${
                    selectedPlayer && !readOnly
                      ? eligible
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-40'
                      : ''
                  }`}
                >
                  {occupant ? (
                    <PitchAvatar
                      player={occupant}
                      selected={selected === occupant.api_player_id}
                      readOnly={readOnly}
                      points={pointsByPlayer?.[occupant.api_player_id]}
                      onClick={() => {
                        // Si ya hay otro jugador del banquillo seleccionado y encaja
                        // en esta posición, tocar a este ocupante los intercambia
                        // (misma lógica que tocar un hueco vacío).
                        if (selectedPlayer && selectedPlayer.api_player_id !== occupant.api_player_id && eligible) {
                          onSlotClick(slot)
                        } else {
                          onPlayerClick(occupant.api_player_id)
                        }
                      }}
                      onRemove={() => onRemovePlayer(occupant.api_player_id)}
                    />
                  ) : (
                    <>
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-xl font-light leading-none text-white/70 ${
                          selectedPlayer && !readOnly && eligible ? 'border-white bg-white/15 text-white' : 'border-white/40'
                        }`}
                      >
                        +
                      </span>
                      <span className="text-[9px] text-white/50">{slot.position}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function PitchAvatar({
  player,
  selected,
  readOnly,
  points,
  onClick,
  onRemove,
}: {
  player: FantasyPlayer
  selected: boolean
  readOnly?: boolean
  points?: number
  onClick: () => void
  onRemove: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const [badgeError, setBadgeError] = useState(false)
  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)
  const shortName = player.name.length > 12 ? player.name.split(' ').slice(-1)[0] : player.name

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`${player.name} · ${FANTASY_POSITION_LABELS[player.player_position]}${team ? ` · ${team.name}` : ''}`}
      className="flex w-14 cursor-pointer flex-col items-center gap-0.5"
    >
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-white ring-2 ring-brand-500' : 'border-white/70'
        }`}
      >
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Quitar del 11"
            className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white ring-2 ring-white hover:bg-red-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        {points != null && (
          <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {points}
          </span>
        )}
        {player.photo_url && !imgError ? (
          <>
            <img
              src={player.photo_url}
              alt=""
              className="h-full w-full rounded-full object-cover"
              onError={() => setImgError(true)}
            />
            {team?.badge && !badgeError && (
              <img
                src={team.badge}
                alt=""
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white object-contain ring-2 ring-white"
                onError={() => setBadgeError(true)}
              />
            )}
          </>
        ) : team?.badge && !badgeError ? (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white p-1.5">
            <img
              src={team.badge}
              alt=""
              className="h-full w-full object-contain"
              onError={() => setBadgeError(true)}
            />
          </span>
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center rounded-full text-xs font-semibold ${POSITION_COLORS[player.player_position]}`}
          >
            {player.player_position[0]}
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-[10px] font-medium text-white drop-shadow">{shortName}</span>
    </div>
  )
}

function PlayerChip({
  player,
  selected,
  onClick,
  compact,
  pool,
}: {
  player: FantasyPlayer
  selected: boolean
  onClick: () => void
  compact?: boolean
  pool?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const [badgeError, setBadgeError] = useState(false)
  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)

  // Colocado en un hueco: el propio hueco ya indica la posición con su
  // etiqueta, así que aquí no hace falta repetirla con un círculo.
  // En el banquillo (pool): en vez del círculo, el fondo de toda la
  // tarjeta lleva el color de la posición, para verlo de un vistazo.
  const colorClasses = selected
    ? 'border-brand-700 bg-brand-700 text-white'
    : pool
      ? `border-transparent ${POSITION_COLORS[player.player_position]}`
      : 'border-gray-300 bg-white text-gray-700'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`${player.name} · ${FANTASY_POSITION_LABELS[player.player_position]}${team ? ` · ${team.name}` : ''}`}
      className={`flex max-w-full items-center gap-1.5 rounded-full border text-xs ${
        pool ? 'w-full justify-start px-2 py-1.5' : `max-w-full px-2 py-1 ${compact ? 'w-36 sm:w-40' : 'max-w-full'}`
      } ${colorClasses}`}
    >
      {player.photo_url && !imgError && (
        <img
          src={player.photo_url}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {team?.badge && !badgeError && (
        <img
          src={team.badge}
          alt=""
          title={team.name}
          className="h-4 w-4 shrink-0 object-contain"
          onError={() => setBadgeError(true)}
        />
      )}
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="min-w-0 max-w-full truncate">{player.name}</span>
        {pool && (
          <span className={`text-[10px] ${selected ? 'text-brand-100' : 'opacity-70'}`}>
            {player.player_position}
            {team ? ` · ${team.name}` : ''}
          </span>
        )}
      </span>
    </button>
  )
}
