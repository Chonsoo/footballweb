import type { SeasonQuestion } from './database.types'

// Título corto para mostrar en tarjetas compactas (Mis apuestas, Apuestas
// detalladas) en vez del enunciado completo de la pregunta, que suele ser
// largo ("Pichichi Absoluto: ¿quién será el máximo goleador..."). La mayoría
// de preguntas largas llevan un "título: enunciado", así que cortamos ahí; si
// no hay dos puntos, probamos a cortar en el primer "?" razonablemente
// pronto; si tampoco, se deja el texto completo (ya es corto, tipo "Real
// Madrid vs Barcelona").
export function shortQuestionLabel(question: SeasonQuestion): string {
  const text = question.question
  const colon = text.indexOf(':')
  if (colon > 3) return text.slice(0, colon).trim()
  const qmark = text.indexOf('?')
  if (qmark > 3 && qmark < 60) return text.slice(0, qmark + 1).trim()
  return text
}
