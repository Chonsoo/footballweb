// Los 4 bloques del formulario de apuestas iniciales (compartido entre el
// wizard de bienvenida y la pestaña "Apuestas iniciales").
export const BLOCK_LABELS: Record<number, string> = {
  1: 'Bloque 1 · Clasificación de Liga',
  2: 'Bloque 2 · Premios individuales',
  3: 'Bloque 3 · Duelos Big Three',
  4: 'Bloque 4 · Over/Under',
}

export const BLOCKS = [1, 2, 3, 4]

// Explicación breve de cómo puntúa cada bloque, pensada para mostrarse antes
// de la pregunta (en el asistente de bienvenida) -- así el jugador sabe qué
// premia el sistema de puntos antes de rellenar, sin tener que ir a buscarlo
// al Reglamento.
export const BLOCK_SCORING_HINTS: Record<number, string> = {
  1: 'Cuantos más puestos aciertes (o te quedes cerca), más puntos. El campeón y el descenso dan más premio si aciertas de pleno, y hay un extra si aciertas todos los equipos de una zona (Champions, Europa League o descenso), aunque el orden entre ellos no sea exacto.',
  2: 'Acierto exacto y te llevas los puntos de la pregunta. Si fallas, no sumas nada en esa pregunta.',
  3: 'En cada duelo hay 5 puntos por acertar el 1x2 (quién gana o si es empate) y 7 puntos extra si además clavas el marcador exacto (hasta 12 en total por duelo).',
  4: 'Acierta si el resultado real queda por encima o por debajo de la línea marcada, y te llevas los puntos de la pregunta.',
}
