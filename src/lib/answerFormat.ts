import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type AnswerValue, type QuestionConfig, type SeasonQuestion } from './database.types'
import { zoneForPosition } from './rankingZones'

export function formatAnswer(question: SeasonQuestion, answer: AnswerValue | undefined | null): string {
  if (answer == null) return '—'

  if (question.answer_type === 'score_prediction') {
    const v = answer as { home: number; away: number }
    if (v == null || v.home == null || v.away == null) return '—'
    return `${v.home} - ${v.away}`
  }

  if (question.answer_type === 'tier_list') {
    return formatTierList(question.config, answer as Record<string, string>)
  }

  if (question.answer_type === 'ranking') {
    return formatRanking(question.config, answer as Record<string, number>)
  }

  // text | choice
  return String(answer)
}

function formatTierList(config: QuestionConfig, value: Record<string, string>): string {
  const items = config.items ?? []
  const tiers = [...(config.tiers ?? []), { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, max: null }]

  const parts: string[] = []
  for (const tier of tiers) {
    const names = items
      .filter((it) => (value[it.id] ?? MEDIA_TIER_ID) === tier.id)
      .map((it) => it.name)
    if (tier.id !== MEDIA_TIER_ID && names.length > 0) {
      parts.push(`${tier.label}: ${names.join(', ')}`)
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sin colocar'
}

function formatRanking(config: QuestionConfig, value: Record<string, number>): string {
  const items = config.items ?? []
  const tiers = config.tiers ?? []
  const total = items.length

  if (Object.keys(value).length === 0) return 'Sin colocar'

  // Agrupa por zona (igual que la tier list) para que el resumen sea compacto,
  // aunque el dato guardado sea la posición exacta 1..N.
  const byZone = new Map<string, string[]>()
  for (const it of items) {
    const pos = value[it.id]
    if (pos == null) continue
    const zone = zoneForPosition(pos, tiers, total)
    if (!byZone.has(zone.id)) byZone.set(zone.id, [])
    byZone.get(zone.id)!.push(`${pos}º ${it.name}`)
  }

  // Orden: primero campeón/champions/europa (según config.tiers), luego media, luego descenso.
  const orderedIds = [...tiers.filter((t) => t.id !== 'descenso').map((t) => t.id), MEDIA_TIER_ID, 'descenso']
  const parts: string[] = []
  for (const id of orderedIds) {
    const names = byZone.get(id)
    if (names && names.length > 0) {
      const label = id === MEDIA_TIER_ID ? MEDIA_TIER_LABEL : tiers.find((t) => t.id === id)?.label ?? id
      parts.push(`${label}: ${names.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}`)
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sin colocar'
}
