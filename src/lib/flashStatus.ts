import type { SeasonQuestion } from './database.types'

// Estado de una pregunta flash, de cara al usuario: abierta (se puede
// rellenar todavía), cerrada (ya pasó el plazo pero nadie ha metido el
// resultado real) o resuelta (ya hay resultado y, si toca, puntos).
export type FlashStatus = 'open' | 'closed' | 'resolved'

export const FLASH_STATUS_LABELS: Record<FlashStatus, string> = {
  open: 'Abierta',
  closed: 'Cerrada',
  resolved: 'Resuelta',
}

export const FLASH_STATUS_COLORS: Record<FlashStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  closed: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
}

export function getFlashStatus(question: SeasonQuestion, resolved: boolean): FlashStatus {
  if (resolved) return 'resolved'
  const isClosed = !!question.closes_at && new Date(question.closes_at).getTime() < Date.now()
  return isClosed ? 'closed' : 'open'
}

// Orden para listas de apuestas flash (Mis apuestas, Apuestas detalladas): la
// que menos tiempo le quede va arriba, en vez del orden de creación. Las que
// no llevan closes_at (no debería pasar en flash, pero por si acaso) van al
// final.
export function sortByClosesAt(questions: SeasonQuestion[]): SeasonQuestion[] {
  return [...questions].sort((a, b) => {
    if (!a.closes_at && !b.closes_at) return 0
    if (!a.closes_at) return 1
    if (!b.closes_at) return -1
    return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
  })
}
