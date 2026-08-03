import { useState } from 'react'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type TierDef, type TierItem } from '../lib/database.types'

interface Props {
  items: TierItem[]
  tiers: TierDef[]
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
  readOnly?: boolean
}

export default function TierListAnswer({ items, tiers, value, onChange, readOnly }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const allTiers: TierDef[] = [...tiers, { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, max: null }]

  function itemsInTier(tierId: string) {
    if (tierId === MEDIA_TIER_ID) {
      return items.filter((it) => !value[it.id] || value[it.id] === MEDIA_TIER_ID)
    }
    return items.filter((it) => value[it.id] === tierId)
  }

  function handleItemClick(itemId: string) {
    if (readOnly) return
    setSelected((cur) => (cur === itemId ? null : itemId))
  }

  function handleTierClick(tierId: string) {
    if (readOnly || !selected) return
    const capacity = allTiers.find((t) => t.id === tierId)?.max
    if (capacity != null && itemsInTier(tierId).length >= capacity && value[selected] !== tierId) {
      return // tier llena
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

  return (
    <div className="flex flex-col gap-2">
      {allTiers.map((tier) => {
        const tierItems = itemsInTier(tier.id)
        const full = tier.max != null && tierItems.length >= tier.max
        return (
          <div
            key={tier.id}
            onClick={() => handleTierClick(tier.id)}
            className={`rounded border p-2 transition-colors ${
              selected && !readOnly
                ? full && tier.id !== MEDIA_TIER_ID
                  ? 'cursor-not-allowed border-gray-200 opacity-50'
                  : 'cursor-pointer border-blue-400 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>{tier.label}</span>
              {tier.max != null && (
                <span>
                  {tierItems.length}/{tier.max}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tierItems.length === 0 && <span className="text-xs text-gray-300">—</span>}
              {tierItems.map((it) => (
                <button
                  type="button"
                  key={it.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleItemClick(it.id)
                  }}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                    selected === it.id
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {it.badge && <img src={it.badge} alt="" className="h-4 w-4" />}
                  {it.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {!readOnly && (
        <p className="text-xs text-gray-400">
          {selected ? 'Ahora toca la categoría donde quieres colocarlo.' : 'Toca un equipo y luego la categoría.'}
        </p>
      )}
    </div>
  )
}
