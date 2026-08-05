import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type TierDef } from './database.types'

export interface ZoneInfo {
  id: string
  label: string
  color: string
}

// Colores por id de tier "especial". El resto (media tabla) no lleva color.
// Exportado para poder pintar una leyenda de colores encima de la tabla
// (ver RankingAnswer.tsx), no solo para colorear cada fila/casilla.
export const ZONE_COLORS: Record<string, string> = {
  campeon: 'bg-red-300',
  champions: 'bg-orange-300',
  europa: 'bg-yellow-300',
  descenso: 'bg-lime-300',
}

// Deriva la zona (Campeón/Champions/Europa League/Descenso/Media tabla) a partir
// de la posición exacta (1..total). Las tiers "normales" (todas menos "descenso")
// se cuentan desde arriba (posición 1 hacia abajo); "descenso" ocupa siempre los
// últimos puestos de la tabla.
export function zoneForPosition(position: number, tiers: TierDef[], total: number): ZoneInfo {
  const descenso = tiers.find((t) => t.id === 'descenso')
  const topTiers = tiers.filter((t) => t.id !== 'descenso')

  let cumulative = 0
  for (const tier of topTiers) {
    cumulative += tier.max ?? 0
    if (position <= cumulative) {
      return { id: tier.id, label: tier.label, color: ZONE_COLORS[tier.id] ?? 'bg-gray-200' }
    }
  }

  if (descenso) {
    const descensoStart = total - (descenso.max ?? 0) + 1
    if (position >= descensoStart) {
      return { id: descenso.id, label: descenso.label, color: ZONE_COLORS[descenso.id] ?? 'bg-lime-300' }
    }
  }

  return { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, color: 'bg-white' }
}
