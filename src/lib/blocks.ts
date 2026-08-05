// Los 4 bloques del formulario de apuestas iniciales (compartido entre el
// wizard de bienvenida y la pestaña "Apuestas iniciales").
export const BLOCK_LABELS: Record<number, string> = {
  1: 'Bloque 1 · Clasificación de Liga',
  2: 'Bloque 2 · Premios individuales',
  3: 'Bloque 3 · Duelos Big Three',
  4: 'Bloque 4 · Over/Under',
}

export const BLOCKS = [1, 2, 3, 4]

// Explicación de cómo puntúa cada bloque, pensada para el botón/modal de
// ayuda "💡 Cómo puntúa" (ver BlockScoringHelp.tsx) -- así el jugador sabe
// qué premia el sistema de puntos antes de rellenar, sin tener que ir a
// buscarlo al Reglamento.
export const BLOCK_SCORING_HINTS: Record<number, string> = {
  1: 'Cuanto más cerca quedes de la posición real de cada equipo, más puntos ganas — no hace falta acertar exacto toda la tabla. El campeón (1º) da 25 pts si lo clavas exacto; 2º y 3º dan 15 pts cada uno si aciertas exacto; del 4º al 7º dan 10 pts si aciertas exacto. Del 8º al 17º hay margen de error: acertar exacto son 7 pts, quedarte a 1 puesto de diferencia son 4 pts, a 2 puestos 2 pts, y a partir de 3 puestos de diferencia ya no suma nada. Del 18º al 20º (descenso) hay que acertar exacto para sumar 15 pts. Además, si aciertas TODOS los equipos de una zona, aunque el orden entre ellos no sea el exacto, te llevas un extra: +3 si aciertas los 4 puestos de Champions (del 1º al 4º, el campeón cuenta como parte de esta zona), +3 Europa League (5º-6º) y +5 Descenso (18º-20º).',
  2: 'Cada premio individual (Pichichi, Zamora, etc.) puntúa todo o nada: si aciertas exacto quién se lo lleva, te llevas los puntos de la pregunta; si fallas, no sumas nada en esa pregunta.',
  3: 'En cada duelo entre grandes hay dos formas de sumar: 5 puntos por acertar el 1x2 (quién gana o si es empate) y, si además aciertas el marcador exacto, 7 puntos extra — hasta 12 en total por duelo.',
  4: 'Cada pregunta de over/under puntúa todo o nada: acierta si el resultado real queda por encima o por debajo de la línea marcada y te llevas los puntos de la pregunta; si fallas, no sumas nada.',
}
