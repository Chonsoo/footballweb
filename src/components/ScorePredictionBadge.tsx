import { scorePredictionBonuses, SCORE_PREDICTION_1X2_POINTS, SCORE_PREDICTION_EXACT_BONUS } from '../lib/scorePrediction'
import { formatPoints } from '../lib/formatPoints'

// Dos pastillas compactas para el resultado de un marcador (duelos Big
// Three y apuestas flash de tipo score_prediction), en vez de un "+X pts"
// plano que no deja claro de dónde salen los puntos: ⚽ por acertar el 1x2
// (quién gana o empate) y 🎯 por acertar además el marcador exacto -- se
// suman, así que un acierto exacto muestra las dos.
export default function ScorePredictionBadge({ points }: { points: number | null | undefined }) {
  const bonuses = scorePredictionBonuses(points)
  if (!bonuses) return null

  // Mismo estilo que el "+0 pts" del resto de bloques (PointsPill), en vez
  // de un gris aparte que desentonaba.
  if (!bonuses.sign) {
    return <span className="shrink-0 text-[11px] font-semibold text-green-600">+{formatPoints(0)}</span>
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      <span
        title="Acertaste el 1x2 (quién gana o empate)"
        className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700"
      >
        ⚽ +{SCORE_PREDICTION_1X2_POINTS}
      </span>
      {bonuses.exact && (
        <span
          title="Además, marcador exacto"
          className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700"
        >
          🎯 +{SCORE_PREDICTION_EXACT_BONUS}
        </span>
      )}
    </span>
  )
}
