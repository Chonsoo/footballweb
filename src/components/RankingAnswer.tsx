import { useState } from 'react'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type TierDef, type TierItem } from '../lib/database.types'
import { zoneForPosition, ZONE_COLORS } from '../lib/rankingZones'

interface Props {
  items: TierItem[]
  tiers: TierDef[]
  value: Record<string, number>
  onChange: (next: Record<string, number>) => void
  readOnly?: boolean
  // Rejilla de recuadros pequeños (como en Información/Mis apuestas) en vez
  // de la lista alta de una fila por puesto -- pensado para Admin, donde
  // solo hay que fijar la clasificación real y no conviene que ocupe tanto
  // de alto. La lista sigue siendo la que usan los participantes al apostar
  // (con 20 filas grandes es más fácil tocar bien en el móvil).
  compact?: boolean
}

export default function RankingAnswer({ items, tiers, value, onChange, readOnly, compact }: Props) {
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

  if (compact) {
    // Leyenda de colores: una vez por zona especial definida en `tiers`
    // (Campeón/Champions/Europa League/Descenso, según venga configurado),
    // más "Media tabla" al final para el resto de casillas sin zona.
    const legendZones = [
      ...tiers.map((t) => ({ id: t.id, label: t.label, color: ZONE_COLORS[t.id] ?? 'bg-gray-200' })),
      { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, color: 'bg-white border border-gray-200' },
    ]

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {legendZones.map((zone) => (
            <span key={zone.id} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${zone.color}`} />
              {zone.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
          {Array.from({ length: total }, (_, i) => i + 1).map((position) => {
            const occupant = teamAtPosition(position)
            const zone = zoneForPosition(position, tiers, total)
            return (
              <div
                key={position}
                onClick={() => handlePositionClick(position)}
                title={occupant ? `${position}º ${occupant.name}` : `${position}º`}
                className={`relative flex flex-col items-center gap-0.5 rounded-md py-1 transition-colors ${zone.color} ${
                  selected && !readOnly ? 'cursor-pointer ring-2 ring-brand-400 ring-offset-1' : ''
                }`}
              >
                {occupant ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTeamClick(occupant.id)
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      selected === occupant.id ? 'ring-2 ring-brand-700' : ''
                    }`}
                  >
                    {occupant.badge ? (
                      <img src={occupant.badge} alt="" className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-xs">🛡️</span>
                    )}
                  </button>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center text-xs text-gray-300">·</span>
                )}
                <span className="text-[9px] font-semibold text-gray-500">{position}º</span>
              </div>
            )
          })}
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Sin colocar ({unplaced.length})</p>
          <div
            onClick={handlePoolClick}
            className={`flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded border border-dashed p-2 transition-colors ${
              selected && value[selected] != null && !readOnly ? 'cursor-pointer border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {unplaced.length === 0 && <span className="text-xs text-gray-300">—</span>}
            {unplaced.map((it) => (
              <TeamChip key={it.id} item={it} selected={selected === it.id} onClick={() => handleTeamClick(it.id)} pool />
            ))}
          </div>
        </div>

        {!readOnly && (
          <p className="text-xs text-gray-400">
            {selected ? 'Ahora toca el puesto donde quieres colocarlo.' : 'Toca un equipo y luego su puesto.'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-stretch gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 overflow-hidden rounded border border-gray-200">
          {Array.from({ length: total }, (_, i) => i + 1).map((position) => {
            const occupant = teamAtPosition(position)
            const zone = zoneForPosition(position, tiers, total)
            return (
              <div
                key={position}
                onClick={() => handlePositionClick(position)}
                className={`flex h-11 items-center gap-2 border-b border-gray-100 px-2 transition-colors last:border-b-0 ${
                  selected && !readOnly ? 'cursor-pointer hover:bg-brand-50' : ''
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

        <div className="w-16 shrink-0 sm:w-52 lg:w-60">
          <div className="sticky top-16 pt-3">
            <p className="mb-1.5 text-xs font-medium text-gray-500">Sin colocar ({unplaced.length})</p>
            <div
              onClick={handlePoolClick}
              className={`flex max-h-[70vh] flex-wrap gap-1.5 overflow-y-auto rounded border border-dashed p-2 transition-colors ${
                selected && value[selected] != null && !readOnly ? 'cursor-pointer border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {unplaced.length === 0 && <span className="text-xs text-gray-300">—</span>}
              {unplaced.map((it) => (
                <TeamChip key={it.id} item={it} selected={selected === it.id} onClick={() => handleTeamClick(it.id)} pool />
              ))}
            </div>
          </div>
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
  pool,
}: {
  item: TierItem
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
      title={item.name}
      className={`flex items-center gap-1 rounded-full border text-xs ${
        pool ? 'p-1.5 sm:px-2 sm:py-1' : `max-w-full px-2 py-1 ${compact ? 'w-36 sm:w-40' : 'max-w-full'}`
      } ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
    >
      {item.badge && !imgError ? (
        <img src={item.badge} alt="" className="h-4 w-4 shrink-0 object-contain" onError={() => setImgError(true)} />
      ) : null}
      <span
        className={
          pool ? 'hidden whitespace-nowrap sm:inline' : compact ? 'min-w-0 truncate' : 'whitespace-nowrap'
        }
      >
        {item.name}
      </span>
    </button>
  )
}
