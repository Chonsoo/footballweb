// Bonus de la Clasificación general por puesto en la Liga fantasy (no son
// los puntos fantasy en sí, sino puntos de premio según el puesto) -- misma
// tabla que la vista public.leaderboard (migración 031), duplicada aquí
// para poder mostrar el desglose en el cliente sin round-trip extra. Si se
// cambia la tabla de puntos, hay que cambiarla en los dos sitios.
const BONUS_BY_RANK: Record<number, number> = {
  1: 25,
  2: 21,
  3: 17,
  4: 12,
  5: 7,
  6: 5,
  7: 3,
  8: 2,
  9: 1,
}

export function fantasyRankBonus(rank: number): number {
  return BONUS_BY_RANK[rank] ?? 0
}
