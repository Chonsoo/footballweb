import { useState } from 'react'
import { MEDIA_TIER_ID, type TierDef, type TierItem } from '../lib/database.types'
import { zoneForPosition } from '../lib/rankingZones'

interface Props {
  items: TierItem[]
  tiers: TierDef[]
  value: Record<string, number>
  onChange: (next: Record<string, number>) => void
  readOnly?: boolean
}

export default function RankingAnswer({ items, tiers, value, onChange, readOnly }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const total = items.length

  function teamAtPosition(position: number): TierItem | null {
    const teamId = Object.keys(value).find((id) => value[id] === position)
    return teamId ? items.find((it) => it.id === teamId) ?? null : null
  }

  const unplaced = items.filter((it) => value[it.id] == null)

  function handleTeamClick(teamId: string) {
    if (readOnly) return
    setSelected((cur) => (cur === teamId ? null : teamId))
  }

  function handlePositionClick(position: number) {
    if (readOnly || !selected) return
    const next = { ...value }
    const occupant = teamAtPosition(position)
    const selectedOldPos = next[selected]

    if (occupant && occupant.id !== selected) {
      if (selectedOldPos != null) {
        next[occupant.id] = selectedOldPos
      } else {
        delete next[occupant.id]
      }
    }
    next[selected] = position
    onChange(next)
    setSelected(null)
  }

  function handlePoolClick() {
    if (readOnly || !selected) return
    if (value[selected] == null) {
      setSelected(null)
      return
    }
    const next = { ...value }
    delete next[selected]
    onChange(next)
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="md:sticky md:top-4 md:order-2 md:w-52 md:shrink-0 lg:w-60">
          <p className="mb-1.5 text-xs font-medium text-gray-500">Equipos sin colocar ({unplaced.length})</p>
          <div
            onClick={handlePoolClick}
            className={`flex min-h-[48px] flex-wrap gap-1.5 rounded border border-dashed p-2 transition-colors ${
              selected && value[selected] != null && !readOnly ? 'cursor-pointer border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {unplaced.length === 0 && <span className="text-xs text-gray-300">—</span>}
            {unplaced.map((it) => (
              <TeamChip key={it.id} item={it} selected={selected === it.id} onClick={() => handleTeamClick(it.id)} />
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded border border-gray-200 md:order-1 md:flex-1">
          {Array.from({ length: total }, (_, i) => i + 1).map((position) => {
            const occupant = teamAtPosition(position)
            const zone = zoneForPosition(position, tiers, total)
            return (
              <div
                key={position}
                onClick={() => handlePositionClick(position)}
                className={`flex h-11 items-center gap-2 border-b border-gray-100 px-2 transition-colors last:border-b-0 ${
                  selected && !readOnly ? 'cursor-pointer hover:bg-blue-50' : ''
                }`}
              >
                <span
                  className={`flex h-6 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold text-gray-800 ${zone.color}`}
                >
                  {position}
                </span>
                <div className="min-w-0 flex-1">
                  {occupant ? (
                    <TeamChip item={occupant} selected={selected === occupant.id} onClick={() => handleTeamClick(occupant.id)} compact />
                  ) : (
                    <span className="text-xs text-gray-300">Toca aquí</span>
                  )}
                </div>
                {zone.id !== MEDIA_TIER_ID && (
                  <span className="hidden shrink-0 text-[10px] text-gray-400 sm:inline">{zone.label}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-400">
          {selected
            ? 'Ahora toca el puesto donde quieres colocarlo (o el recuadro de equipos para quitarlo).'
            : 'Toca un equipo y luego su puesto.'}
        </p>
      )}
    </div>
  )
}

function TeamChip({
  item,
  selected,
  onClick,
  compact,
}: {
  item: TierItem
  selected: boolean
  onClick: () => void
  compact?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={item.name}
      className={`flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs ${compact ? 'w-full' : ''} ${
        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'
      }`}
    >
      {item.badge && !imgError ? (
        <img src={item.badge} alt="" className="h-4 w-4 shrink-0 object-contain" onError={() => setImgError(true)} />
      ) : null}
      <span className={compact ? 'min-w-0 truncate' : 'whitespace-nowrap'}>{item.name}</span>
    </button>
  )
}
