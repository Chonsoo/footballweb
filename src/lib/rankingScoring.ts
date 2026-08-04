// Fórmula de puntos del Bloque 1 ("Tabla de Clasificación") de la Porra Macro LaLiga.
// Para cada equipo, compara su posición REAL (fijada por el admin como resultado)
// con la posición que predijo cada jugador, y sigue estas reglas:
//
//   posición real 1        -> 25 pts si acierta la posición exacta
//   posición real 2-3      -> 15 pts si acierta la posición exacta
//   posición real 4-7      -> 10 pts si acierta la posición exacta
//   posición real 8-17     -> sistema de margen de error:
//                              0 puestos de diferencia: 7 pts
//                              1 puesto:  4 pts
//                              2 puestos: 2 pts
//                              3+ puestos: 0 pts
//   posición real 18-20    -> 15 pts si acierta la posición exacta
//
// Además, bonus de "pleno de zona": si TODOS los equipos de una zona
// coinciden con la predicción (da igual el orden dentro de la zona), suma un
// extra fijo -- ver ZONES más abajo.
export function scoreRankingAnswer(real: Record<string, number>, predicted: Record<string, number>): number {
  let total = 0
  for (const [teamId, realPos] of Object.entries(real)) {
    const predPos = predicted?.[teamId]
    if (predPos == null) continue

    if (realPos === 1) {
      if (predPos === 1) total += 25
    } else if (realPos === 2 || realPos === 3) {
      if (predPos === realPos) total += 15
    } else if (realPos >= 4 && realPos <= 7) {
      if (predPos === realPos) total += 10
    } else if (realPos >= 8 && realPos <= 17) {
      const diff = Math.abs(predPos - realPos)
      total += diff === 0 ? 7 : diff === 1 ? 4 : diff === 2 ? 2 : 0
    } else if (realPos >= 18 && realPos <= 20) {
      if (predPos === realPos) total += 15
    }
  }
  return total + scoreZoneBonus(real, predicted)
}

// Bonus por "pleno de zona": Champions (1-4) +3, Europa League (5-6) +3,
// Descenso (18-20) +5 -- todo o nada por zona, sin importar el orden interno
// (p.ej. si predices los 4 equipos correctos de Champions pero en el orden
// equivocado dentro de esas 4 posiciones, el bonus de Champions igualmente
// se suma entero).
export interface RankingZone {
  key: string
  label: string
  from: number
  to: number
  bonus: number
}

export const RANKING_ZONES: RankingZone[] = [
  { key: 'champions', label: 'Champions', from: 1, to: 4, bonus: 3 },
  { key: 'europa', label: 'Europa League', from: 5, to: 6, bonus: 3 },
  { key: 'descenso', label: 'Descenso', from: 18, to: 20, bonus: 5 },
]

function teamsInZone(positions: Record<string, number>, from: number, to: number): Set<string> {
  return new Set(Object.entries(positions).filter(([, pos]) => pos >= from && pos <= to).map(([teamId]) => teamId))
}

export function scoreZoneBonus(real: Record<string, number>, predicted: Record<string, number>): number {
  return zoneBonusBreakdown(real, predicted).reduce((sum, z) => sum + z.bonus, 0)
}

export interface ZoneBonusRow {
  key: string
  label: string
  from: number
  to: number
  matched: number
  size: number
  bonus: number
}

// Desglose por zona (para mostrar en el popup de puntos): cuántos de esa
// zona acertó (sin importar el orden) y si se llevó el bonus completo.
export function zoneBonusBreakdown(real: Record<string, number>, predicted: Record<string, number>): ZoneBonusRow[] {
  return RANKING_ZONES.map((zone) => {
    const size = zone.to - zone.from + 1
    const realTeams = teamsInZone(real, zone.from, zone.to)
    const predictedTeams = teamsInZone(predicted, zone.from, zone.to)
    const matched = [...realTeams].filter((id) => predictedTeams.has(id)).length
    const fullMatch = realTeams.size === size && matched === size
    return { key: zone.key, label: zone.label, from: zone.from, to: zone.to, matched, size, bonus: fullMatch ? zone.bonus : 0 }
  })
}
