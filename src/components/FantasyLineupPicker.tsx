import { useMemo, useState } from 'react'
import {
  FANTASY_FORMATIONS,
  FANTASY_POSITIONS,
  FANTASY_POSITION_LABELS,
  buildFantasySlots,
  formationLabel,
  slotKey,
  type FantasyFormation,
  type FantasyPlayer,
  type FantasyPosition,
  type FantasySlot,
} from '../lib/fantasyTypes'
import { normalizeText } from '../lib/textNormalize'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'

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
}

export default function FantasyLineupPicker({
  players,
  formation,
  value,
  onChange,
  onFormationChange,
  readOnly,
}: Props) {
  const slots = useMemo(() => buildFantasySlots(formation), [formation])
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<Set<FantasyPosition>>(new Set())

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
    filtered = filtered.filter((p) => normalizeText(p.name).includes(normalizeText(search)))
  }
  const unplacedCount = players.filter((p) => !placedIds.has(p.api_player_id)).length

  const selectedPlayer = selected != null ? playersById.get(selected) ?? null : null

  function handlePlayerClick(id: number) {
    if (readOnly) return
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

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
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
                      ? 'cursor-pointer bg-blue-50/40 hover:bg-blue-50'
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
                      active ? POSITION_COLORS[pos] + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {pos}
                  </button>
                )
              })}
            </div>
            <p className="text-xs font-medium text-gray-500">Sin colocar ({unplacedCount})</p>
            <div
              onClick={handlePoolAreaClick}
              className={`flex max-h-64 flex-col gap-1 overflow-y-auto rounded border border-dashed p-2 transition-colors sm:max-h-[60vh] ${
                selected != null && !readOnly ? 'cursor-pointer border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {filtered.length === 0 && <span className="text-xs text-gray-300">Sin resultados</span>}
              {filtered.map((p) => (
                <PlayerChip
                  key={p.api_player_id}
                  player={p}
                  selected={selected === p.api_player_id}
                  onClick={() => handlePlayerClick(p.api_player_id)}
                  pool
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-400">
          {selectedPlayer
            ? `Ahora toca un hueco de ${FANTASY_POSITION_LABELS[selectedPlayer.player_position]} para colocarlo (los demás huecos se atenúan).`
            : 'Toca un jugador y luego el hueco donde quieres colocarlo.'}
        </p>
      )}
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
      } ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
    >
      {player.photo_url && !imgError ? (
        <img
          src={player.photo_url}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${POSITION_COLORS[player.player_position]}`}
        >
          {player.player_position[0]}
        </span>
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
          <span className={`text-[10px] ${selected ? 'text-blue-100' : 'text-gray-400'}`}>
            {player.player_position}
            {team ? ` · ${team.name}` : ''}
          </span>
        )}
      </span>
    </button>
  )
}
