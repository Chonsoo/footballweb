import { useMemo, useState } from 'react'
import {
  FANTASY_POSITION_LABELS,
  buildFantasySlots,
  slotKey,
  type FantasyFormation,
  type FantasyPlayer,
  type FantasyPosition,
  type FantasySlot,
} from '../lib/fantasyTypes'
import { normalizeText } from '../lib/textNormalize'

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
  readOnly?: boolean
}

export default function FantasyLineupPicker({ players, formation, value, onChange, readOnly }: Props) {
  const slots = useMemo(() => buildFantasySlots(formation), [formation])
  const [selected, setSelected] = useState<number | null>(null)
  const [search, setSearch] = useState('')

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
  const unplaced = players.filter((p) => !placedIds.has(p.api_player_id))
  const filtered = search.trim()
    ? unplaced.filter((p) => normalizeText(p.name).includes(normalizeText(search)))
    : unplaced

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
            <p className="text-xs font-medium text-gray-500">Sin colocar ({unplaced.length})</p>
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
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={player.name}
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
      <span className="min-w-0 truncate">{player.name}</span>
    </button>
  )
}
