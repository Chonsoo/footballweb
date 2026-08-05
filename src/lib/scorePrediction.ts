// Puntuación de las preguntas de tipo score_prediction (duelos Big Three y
// cualquier apuesta flash de marcador): dos bonos que se SUMAN, no son
// excluyentes -- debe coincidir con
// supabase/migrations/034_score_prediction_1x2_points.sql.
//   - acertar el 1x2 (quién gana o empate, mismo signo local-visitante
//     que el resultado real) -> 5 pts
//   - acertar además el marcador exacto -> 7 pts extra (12 en total)
export const SCORE_PREDICTION_1X2_POINTS = 5
export const SCORE_PREDICTION_EXACT_BONUS = 7
export const SCORE_PREDICTION_EXACT_TOTAL = SCORE_PREDICTION_1X2_POINTS + SCORE_PREDICTION_EXACT_BONUS

// A partir de los puntos ya calificados (season_answers.points), deduce qué
// se acertó -- en vez de repetir en el cliente la lógica de comparar
// signos, así siempre coincide con lo que de verdad se aplicó en el
// servidor (incluida cualquier corrección manual de un admin).
export function scorePredictionBonuses(points: number | null | undefined): { sign: boolean; exact: boolean } | null {
  if (points == null) return null
  return {
    sign: points >= SCORE_PREDICTION_1X2_POINTS,
    exact: points >= SCORE_PREDICTION_EXACT_TOTAL,
  }
}
