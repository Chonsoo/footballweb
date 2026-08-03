import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type AnswerValue, type QuestionConfig, type SeasonQuestion } from './database.types'

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
