import { useState } from 'react'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type TierDef, type TierItem } from '../lib/database.types'

interface Props {
  items: TierItem[]
  tiers: TierDef[]
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  readOnly?: boolean
}

// Colores estilo "tier list" clásico (S/A/B/C/D) aplicados en orden a las categorías definidas.
const TIER_COLORS = ['bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-lime-300', 'bg-green-300']

export default function TierListAnswer({ items, tiers, value, onChange, readOnly }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  function itemsInTier(tierId: string) {
    if (tierId === MEDIA_TIER_ID) {
      return items.filter((it) => !value[it.id] || value[it.id] === MEDIA_TIER_ID)
    }
    return items.filter((it) => value[it.id] === tierId)
  }

  function tierCapacity(tierId: string) {
    return tiers.find((t) => t.id === tierId)?.max ?? null
  }

  function handleItemClick(itemId: string) {
    if (readOnly) return
    setSelected((cur) => (cur === itemId ? null : itemId))
  }

  function handleTierClick(tierId: string) {
    if (readOnly || !selected) return
    const capacity = tierCapacity(tierId)
    if (capacity != null && itemsInTier(tierId).length >= capacity && value[selected] !== tierId) {
      return // categoría llena
    }
    const next = { ...value }
    if (tierId === MEDIA_TIER_ID) {
      delete next[selected]
    } else {
      next[selected] = tierId
    }
    onChange(next)
    setSelected(null)
  }

  const media = itemsInTier(MEDIA_TIER_ID)

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded border border-gray-200">
        {tiers.map((tier, i) => {
          const tierItems = itemsInTier(tier.id)
          const capacity = tier.max
          const full = capacity != null && tierItems.length >= capacity
          const color = TIER_COLORS[i % TIER_COLORS.length]
          return (
            <div key={tier.id} className="flex border-b border-gray-200 last:border-b-0">
              <div className={`flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 p-2 text-center ${color}`}>
                <span className="text-xs font-semibold text-gray-800">{tier.label}</span>
                {capacity != null && (
                  <span className="text-[10px] text-gray-700">
                    {tierItems.length}/{capacity}
                  </span>
                )}
              </div>
              <div
                onClick={() => handleTierClick(tier.id)}
                className={`flex min-h-[56px] flex-1 flex-wrap items-center gap-1.5 p-2 transition-colors ${
                  selected && !readOnly
                    ? full
                      ? 'cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer bg-blue-50'
                    : 'bg-white'
                }`}
              >
                {tierItems.map((it) => (
                  <TeamChip key={it.id} item={it} selected={selected === it.id} onClick={() => handleItemClick(it.id)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-500">
          {MEDIA_TIER_LABEL} ({media.length})
        </p>
        <div
          onClick={() => handleTierClick(MEDIA_TIER_ID)}
          className={`flex min-h-[64px] flex-wrap gap-1.5 rounded border border-dashed p-2 transition-colors ${
            selected && !readOnly ? 'cursor-pointer border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {media.length === 0 && <span className="text-xs text-gray-300">—</span>}
          {media.map((it) => (
            <TeamChip key={it.id} item={it} selected={selected === it.id} onClick={() => handleItemClick(it.id)} />
          ))}
        </div>
      </div>

      {!readOnly && (
        <p className="text-xs text-gray-400">
          {selected ? 'Ahora toca la categoría donde quieres colocarlo.' : 'Toca un equipo y luego la categoría.'}
        </p>
      )}
    </div>
  )
}

function TeamChip({ item, selected, onClick }: { item: TierItem; selected: boolean; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={item.name}
      className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-700'
      }`}
    >
      {item.badge && !imgError ? (
        <img src={item.badge} alt="" className="h-4 w-4 object-contain" onError={() => setImgError(true)} />
      ) : null}
      {item.name}
    </button>
  )
}
