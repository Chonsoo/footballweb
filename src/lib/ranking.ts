// Fila mínima necesaria para calcular puestos y empates: total_points es
// obligatorio, y los 2 criterios de desempate de la clasificación general
// (ver supabase/migrations/040_leaderboard_tiebreak.sql) son opcionales --
// esta misma función también se usa para rankings más simples de un solo
// criterio (p.ej. el puesto dentro de la Liga fantasy, en
// RankingPointsPopup.tsx), donde no aplica ningún desempate adicional y
// basta con total_points. Si no vienen, se tratan como 0 (sin desempate).
interface RankableRow {
  total_points: number
  block1_points?: number
  fantasy_points?: number
}

// Compara dos filas por el criterio completo de desempate: 0 si empatan en
// los tres valores, un número != 0 si no (el signo no importa aquí, solo se
// usa para saber si son iguales).
function tieCompare(a: RankableRow, b: RankableRow): number {
  return (
    a.total_points - b.total_points ||
    (a.block1_points ?? 0) - (b.block1_points ?? 0) ||
    (a.fantasy_points ?? 0) - (b.fantasy_points ?? 0)
  )
}

// Ranking "1224": si dos participantes empatan en total_points Y en los
// criterios de desempate (block1_points, fantasy_points), comparten el mismo
// puesto y el siguiente salta el hueco (p.ej. dos empatados en 2º -> el
// siguiente es 4º, no 3º). Si el total coincide pero el desempate los
// distingue, cada uno saca su puesto propio en vez de compartirlo. `rows`
// debe venir ya ordenado de más a menos (total_points, luego block1_points,
// luego fantasy_points), que es como ya las devuelve la vista `leaderboard`.
export function computeRanks(rows: RankableRow[]): number[] {
  const ranks: number[] = []
  let lastRank = 0
  rows.forEach((r, i) => {
    if (i > 0 && tieCompare(r, rows[i - 1]) === 0) {
      ranks.push(lastRank)
    } else {
      ranks.push(i + 1)
      lastRank = i + 1
    }
  })
  return ranks
}

// Distancia (en "escalones" de puntos distintos, no filas) desde el final de
// la tabla: 0 = el/los que menos puntos tienen (farolillo), 1 = el escalón
// justo por encima, etc. Se agrupa por total_points solamente (no por el
// desempate completo) a propósito: es un matiz puramente visual (el
// degradado de color cerca del farolillo), y separar por desempate ahí
// generaría muchos escalones de 1 sola fila que no aportan nada a la vista.
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
