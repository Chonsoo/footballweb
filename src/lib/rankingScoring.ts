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
// NOTA: esto NO incluye los bonus extra por "pleno de zona" (Champions completa,
// Europa League completa, Descenso completo, etc.) del documento original, porque
// los rangos de esas zonas de bonus no coinciden con los rangos de arriba y habría
// que decidir exactamente qué puestos cuentan para cada bonus antes de automatizarlo.
// Esos bonus, de momento, hay que añadirlos a mano sobre el resultado sugerido.
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
  return total
}
