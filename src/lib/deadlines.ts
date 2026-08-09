// Fecha límite única para todo el formulario de "Apuestas iniciales"
// (incluido el Bloque 5, el 11 de Abuelonchos, que no tiene su propio
// closes_at por pregunta como el resto). Las preguntas normales de ese
// bloque llevan además su `closes_at` en la base de datos con esta misma
// fecha (ver migración 026), así que ambos mecanismos quedan sincronizados.
export const INITIAL_PHASE_DEADLINE = new Date('2026-09-02T23:59:00+02:00')

export function isInitialPhaseClosed(): boolean {
  return Date.now() > INITIAL_PHASE_DEADLINE.getTime()
}

export const INITIAL_PHASE_DEADLINE_LABEL = 'miércoles 2 de septiembre a las 23:59'
