import type { AnswerValue, SeasonQuestion } from './database.types'

// Si una respuesta cuenta como "completa" para marcar el tic verde. Para
// texto/opción/marcador basta con que exista; para ranking hace falta que
// estén colocados TODOS los equipos (si no, aunque haya fila en la BD, la
// apuesta no está realmente terminada).
export function isAnswerComplete(question: SeasonQuestion, answer: AnswerValue | undefined | null): boolean {
  if (answer == null) return false

  if (question.answer_type === 'ranking') {
    const items = question.config.items ?? []
    if (items.length === 0) return false
    const value = answer as Record<string, number>
    return items.every((it) => value[it.id] != null)
  }

  if (question.answer_type === 'tier_list') {
    // cualquier respuesta cuenta (los no colocados caen en "media tabla" por defecto)
    return true
  }

  if (question.answer_type === 'score_prediction') {
    const v = answer as { home: number; away: number }
    return v?.home != null && v?.away != null
  }

  // text | choice
  return typeof answer === 'string' ? answer.trim().length > 0 : true
}
