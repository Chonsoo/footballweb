import { computeRanks } from './ranking'

// Reparto en metálico de la porra: cada participante confirmado pone 10€, y
// el bote se reparte entre los 5 primeros de la clasificación general según
// estos porcentajes (suman 100%). Ver Reglamento > Premios.
export const ENTRY_FEE_EUR = 10
export const PRIZE_PERCENTAGES = [43, 25, 14, 11, 7] // 1º, 2º, 3º, 4º, 5º

interface RankableRow {
  total_points: number
  block1_points?: number
  fantasy_points?: number
}

export function computeTotalPool(participantCount: number): number {
  return participantCount * ENTRY_FEE_EUR
}

// Importe de cada fila, alineado 1:1 con `rows` (0 si no toca premio). `rows`
// debe venir ya ordenado como la vista `leaderboard` (total_points desc,
// block1_points desc, fantasy_points desc) -- mismo requisito que
// computeRanks, que es lo que usa por debajo para saber quién empata.
//
// Si varios empatan y su grupo cae dentro (total o parcialmente) del top 5,
// se suma el % de todas las posiciones nominales que ocupa el grupo y se
// reparte a partes iguales entre todos sus miembros -- así, empatar a 2º-3º
// reparte el 25%+14% entre los dos, y un empate a 3 bandas que pise el puesto
// 5 (p.ej. 4º-5º-6º) reparte el 11%+7% (el 6º no lleva %) entre los 3.
export function computePrizes(rows: RankableRow[]): number[] {
  const ranks = computeRanks(rows)
  const totalPool = computeTotalPool(rows.length)
  const prizes = new Array(rows.length).fill(0)

  let i = 0
  while (i < rows.length) {
    const rank = ranks[i]
    let j = i
    while (j < rows.length && ranks[j] === rank) j++
    const groupSize = j - i

    let pctSum = 0
    for (let pos = rank; pos < rank + groupSize; pos++) {
      if (pos >= 1 && pos <= PRIZE_PERCENTAGES.length) pctSum += PRIZE_PERCENTAGES[pos - 1]
    }
    if (pctSum > 0) {
      // Los % oficiales (ver Reglamento > Premios) no cambian, pero el
      // importe final se redondea a euros enteros -- de puertas para
      // afuera nadie ve "19,60€", solo cantidades limpias. Es a propósito
      // que esto NO se explique en ningún sitio visible: los % publicados
      // siguen siendo la fuente de verdad, el redondeo es solo de cara al
      // pago real.
      const amountPerPerson = Math.round((totalPool * pctSum) / 100 / groupSize)
      for (let k = i; k < j; k++) prizes[k] = amountPerPerson
    }
    i = j
  }

  return prizes
}

// "60€" si es un número entero, "60,20€" si lleva decimales (coma española,
// máximo 2 decimales, sin ceros de sobra).
export function formatEuros(n: number): string {
  const rounded = Math.round(n * 100) / 100
  const str = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${str.replace('.', ',')}€`
}
