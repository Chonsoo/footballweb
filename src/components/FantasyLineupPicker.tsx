import { useMemo, useState } from 'react'
import {
  BIG_THREE_LIMIT,
  FANTASY_FORMATIONS,
  FANTASY_POSITIONS,
  FANTASY_POSITION_LABELS,
  buildFantasySlots,
  formationLabel,
  isBigThreePlayer,
  playerMatchesSearch,
  slotKey,
  type FantasyFormation,
  type FantasyPlayer,
  type FantasyPosition,
  type FantasySlot,
} from '../lib/fantasyTypes'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import PlayerCard from './PlayerCard'
import PlayerRingAvatar from './PlayerRingAvatar'

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
  const [poolView, setPoolView] = useState<'chips' | 'cards'>('cards')
  // Aviso breve cuando se intenta colocar un 4º jugador del Big Three -- se
  // limpia solo al cambiar de selección o pasado un momento.
  const [bigThreeWarning, setBigThreeWarning] = useState(false)

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

  // Cuántos del 11 ya colocado son del Big Three (Real Madrid + Atlético +
  // Barcelona juntos, no por separado).
  const bigThreeCount = Object.keys(value).reduce((n, idStr) => {
    const p = playersById.get(Number(idStr))
    return p && isBigThreePlayer(p) ? n + 1 : n
  }, 0)

  function countBigThree(v: Record<string, string>): number {
    return Object.keys(v).reduce((n, idStr) => {
      const p = playersById.get(Number(idStr))
      return p && isBigThreePlayer(p) ? n + 1 : n
    }, 0)
  }

  const selectedPlayer = selected != null ? playersById.get(selected) ?? null : null

  function handlePlayerClick(id: number) {
    if (readOnly) {
      if (onPlayerSelect) {
        const p = playersById.get(id)
        if (p) onPlayerSelect(p)
      }
      return
    }
    setBigThreeWarning(false)
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

    // Máximo 3 jugadores entre Real Madrid, Atlético y Barcelona en total
    // (no 3 de cada) -- si este cambio se pasa, no se aplica.
    if (countBigThree(next) > BIG_THREE_LIMIT) {
      setBigThreeWarning(true)
      setSelected(null)
      return
    }

    setBigThreeWarning(false)
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

          {/* Mismo color de acento (brand-700) que el resto de toggles de la
              app en vez de verde/amarillo sueltos -- para que se sienta el
              mismo tipo de control en todos lados. */}
          <div className="flex overflow-hidden rounded border border-gray-300 text-xs">
            <button
              type="button"
              onClick={() => setView('pitch')}
              className={`px-2 py-1 font-medium ${view === 'pitch' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600'}`}
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
              // text-base (16px) en vez de text-xs: por debajo de 16px, iOS Safari
              // hace zoom automático de toda la página al enfocar el campo.
              // bg-white explícito: sin esto se veía "de cristal" (transparente),
              // dejando ver el fondo verde de detrás en vez de un campo opaco
              // como el resto de inputs de la app.
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-base sm:text-xs"
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
            {/* Máximo 3 jugadores entre los tres grandes (Real Madrid,
                Atlético y Barcelona) en total, sea la mezcla que sea --
                contador siempre visible, no solo un aviso al fallar. */}
            <p
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                bigThreeCount >= BIG_THREE_LIMIT ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
              }`}
            >
              ⚡ Big Three: {bigThreeCount}/{BIG_THREE_LIMIT}
            </p>
            {bigThreeWarning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                Máximo {BIG_THREE_LIMIT} jugadores entre Real Madrid, Atlético y Barcelona en total (da igual la mezcla).
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-500">Sin colocar ({unplacedCount})</p>
              <div className="flex overflow-hidden rounded border border-gray-300 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPoolView('cards')}
                  className={`px-1.5 py-0.5 font-medium ${poolView === 'cards' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600'}`}
                >
                  Cartas
                </button>
                <button
                  type="button"
                  onClick={() => setPoolView('chips')}
                  className={`px-1.5 py-0.5 font-medium ${poolView === 'chips' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600'}`}
                >
                  Lista
                </button>
              </div>
            </div>
            {/* En modo Cartas, sin fondo ni borde propios -- se funde con el
                fondo de detrás (la tarjeta/pantalla que envuelve todo esto),
                en vez de una caja blanca u opaca aparte. El estilo gris con
                borde discontinuo se queda solo para la Lista. */}
            <div
              onClick={handlePoolAreaClick}
              className={`flex max-h-64 overflow-y-auto rounded p-2 transition-colors sm:max-h-[60vh] ${
                poolView === 'cards' ? 'flex-row flex-wrap gap-2' : 'flex-col gap-1 border border-dashed'
              } ${
                selected != null && !readOnly
                  ? 'cursor-pointer border border-brand-500 bg-brand-50'
                  : poolView === 'cards'
                    ? 'border-0 bg-transparent'
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              {filtered.length === 0 && <span className="text-xs text-gray-300">Sin resultados</span>}
              {filtered.map((p) => {
                // Ya hay 3 del Big Three colocados: se atenúan los que
                // quedan por colocar de esos 3 equipos, igual que se
                // atenúan los huecos de una posición que no toca.
                const blocked = bigThreeCount >= BIG_THREE_LIMIT && isBigThreePlayer(p)
                return (
                  <div key={p.api_player_id} className={blocked ? 'pointer-events-none opacity-40' : ''} title={blocked ? 'Ya tienes 3 del Big Three' : undefined}>
                    {poolView === 'cards' ? (
                      <PlayerCard player={p} size="sm" selected={selected === p.api_player_id} onClick={() => handlePlayerClick(p.api_player_id)} />
                    ) : (
                      <PlayerChip player={p} selected={selected === p.api_player_id} onClick={() => handlePlayerClick(p.api_player_id)} pool />
                    )}
                  </div>
                )
              })}
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
      {/* Mismo marco circular "Abueluchos FC" que en las cartas del banquillo
          (PlayerCard), en vez del círculo simple de antes -- así el jugador
          colocado en el campo se ve igual que en el resto de la app. El
          escudo del equipo real se mantiene igual, superpuesto en la
          esquina. */}
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          selected ? 'ring-2 ring-brand-500 ring-offset-1' : ''
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
        <PlayerRingAvatar photoUrl={player.photo_url} className="h-full w-full" />
        {team?.badge && !badgeError && (
          <img
            src={team.badge}
            alt=""
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white object-contain ring-2 ring-white"
            onError={() => setBadgeError(true)}
          />
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
