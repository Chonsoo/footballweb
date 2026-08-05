import { zoneBonusBreakdown } from '../lib/rankingScoring'

// Cuántos equipos coinciden EXACTOS entre la posición real (Clasificación
// actual, Bloque 1) y la predicha -- aparte de los puntos por margen de
// error, para que se vea de un vistazo cuántos "clavó" del todo.
export function countExactMatches(real: Record<string, number> | undefined, predicted: Record<string, number> | undefined): number {
  if (!real || !predicted) return 0
  let n = 0
  for (const [teamId, pos] of Object.entries(real)) {
    if (predicted[teamId] === pos) n++
  }
  return n
}

// Resumen compacto de aciertos del Bloque 1 (Clasificación de Liga): número
// de posiciones exactas + el bonus por pleno de zona (Champions/Europa
// League/Descenso). Reutilizado en Mis apuestas, Apuestas detalladas y el
// desglose de puntos de la Clasificación general -- un único sitio para no
// tener la misma cuenta triplicada. No pinta nada si todavía no hay
// clasificación real con la que comparar.
export default function RankingAccuracySummary({
  real,
  predicted,
  total,
}: {
  real: Record<string, number> | undefined
  predicted: Record<string, number> | undefined
  total: number
}) {
  if (!real) return null
  const exact = countExactMatches(real, predicted)
  const zones = zoneBonusBreakdown(real, predicted ?? {})

  return (
    <div className="mb-2 flex flex-col gap-1 text-xs">
      <p className="font-medium text-gray-600">
        Aciertos exactos: <span className="font-semibold text-gray-800">{exact} / {total}</span>
      </p>
      {zones.map((z) => (
        <p key={z.key} className="flex items-center justify-between text-gray-600">
          <span>
            {z.label} ({z.from}-{z.to}): <span className="font-semibold text-gray-800">{z.matched}/{z.size}</span>
          </span>
          <span className={`font-semibold ${z.bonus > 0 ? 'text-green-600' : 'text-gray-500'}`}>
            {z.bonus > 0 ? '+' : ''}
            {z.bonus}
          </span>
        </p>
      ))}
    </div>
  )
}
