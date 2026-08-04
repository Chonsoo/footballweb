// Ranking "1224": si dos participantes empatan a puntos, ambos comparten el
// mismo puesto y el siguiente salta el hueco (p.ej. dos empatados en 2º ->
// el siguiente es 4º, no 3º). `rows` debe venir ya ordenado de más a menos
// puntos.
export function computeRanks(rows: { total_points: number }[]): number[] {
  const ranks: number[] = []
  let lastPoints: number | null = null
  let lastRank = 0
  rows.forEach((r, i) => {
    if (lastPoints !== null && r.total_points === lastPoints) {
      ranks.push(lastRank)
    } else {
      ranks.push(i + 1)
      lastRank = i + 1
      lastPoints = r.total_points
    }
  })
  return ranks
}

// Distancia (en "escalones" de puntos distintos, no filas) desde el final de
// la tabla: 0 = el/los que menos puntos tienen (farolillo), 1 = el escalón
// justo por encima, etc. Así, si dos participantes empatan de últimos, los
// dos cuentan como un solo escalón (0) en vez de "correrse" uno al otro.
export function distFromLastTier(points: number, rows: { total_points: number }[]): number {
  const uniqueAsc = [...new Set(rows.map((r) => r.total_points))].sort((a, b) => a - b)
  return uniqueAsc.indexOf(points)
}

// Cuántos escalones de puntos distintos hay en la tabla. Si solo hay uno
// (todos exactamente empatados, del primero al último), no hay "farolillo"
// que valga: empatar de primero manda sobre empatar de último, así que ese
// caso se trata como empate a primero para todos, no como empate a último.
export function uniqueTierCount(rows: { total_points: number }[]): number {
  return new Set(rows.map((r) => r.total_points)).size
}
