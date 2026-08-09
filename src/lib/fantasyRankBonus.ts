// Bonus de la Clasificación general por puesto en la Liga fantasy (no son
// los puntos fantasy en sí, sino puntos de premio según el puesto) -- misma
// tabla que la vista public.leaderboard (migración 041, "caída suave"),
// duplicada aquí para poder mostrar el desglose en el cliente sin
// round-trip extra. Si se cambia la tabla de puntos, hay que cambiarla en
// los dos sitios.
const BONUS_BY_RANK: Record<number, number> = {
  1: 45,
  2: 40,
  3: 35,
  4: 30,
  5: 25,
  6: 20,
  7: 15,
  8: 10,
  9: 5,
  10: 2,
}

export function fantasyRankBonus(rank: number): number {
  return BONUS_BY_RANK[rank] ?? 0
}
