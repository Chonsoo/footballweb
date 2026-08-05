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
//
// Cada bloque es una lista de líneas cortas (se pintan como viñetas), en vez
// de un párrafo largo con guiones -- así se lee de un vistazo en vez de
// tener que seguir una frase larga de corrido.
export const BLOCK_SCORING_HINTS: Record<number, string[]> = {
  1: [
    'Cuanto más cerca quedes de la posición real de cada equipo, más puntos ganas: no hace falta acertar exacto toda la tabla.',
    'Campeón (1º): 25 pts si lo clavas exacto.',
    '2º y 3º: 15 pts cada uno si aciertas exacto.',
    'Del 4º al 7º: 10 pts si aciertas exacto.',
    'Del 8º al 17º hay margen de error: 7 pts exacto, 4 pts a 1 puesto, 2 pts a 2 puestos, 0 pts a 3 o más.',
    'Del 18º al 20º (descenso): 15 pts si aciertas exacto.',
    'Bonus por acertar toda una zona (aunque el orden interno no sea exacto): +3 Champions (1º-4º), +3 Europa League (5º-6º), +5 Descenso (18º-20º).',
  ],
  2: [
    'Pichichi Absoluto: quién marcará más goles en LaLiga esta temporada.',
    'Trofeo Zamora: qué portero encajará menos goles.',
    'Trofeo Zarra: máximo goleador español.',
    'Máximo Asistente: quién dará más asistencias (pases de gol).',
    'Pichichi "Clase Media": máximo goleador sin contar jugadores del Real Madrid, Barcelona o Atlético.',
    'El Fiasco Europeo: de los equipos con competición europea la temporada pasada, cuál acabará peor esta liga.',
    'Podio Underdog: un equipo revelación (sin competición europea previa) que crees que acabará arriba.',
    'Todos puntúan todo o nada (aciertas exacto o no sumas nada), menos Podio Underdog: ahí se compara tu equipo elegido con el de todos los demás participantes, y puntúa según qué tan bien quede en la clasificación real.',
  ],
  3: [
    '5 pts por acertar el 1x2 (quién gana o si es empate).',
    '+7 pts extra si además aciertas el marcador exacto.',
    'Hasta 12 pts en total por duelo.',
  ],
  4: [
    'Todo o nada: acierta si el resultado real queda por encima o por debajo de la línea marcada.',
    'Aciertas: te llevas los puntos de la pregunta. Fallas: no sumas nada.',
  ],
}
