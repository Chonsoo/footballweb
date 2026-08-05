import AnswerSummary, { TeamBadgeLabel } from './AnswerSummary'
import RankingAccuracySummary from './RankingAccuracySummary'
import ScorePredictionBadge from './ScorePredictionBadge'
import { shortQuestionLabel } from '../lib/questionLabel'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import { formatPoints } from '../lib/formatPoints'
import type { AnswerValue, SeasonQuestion } from '../lib/database.types'

type PointsMap = Record<string, number | null | undefined>

// Puntos ya ganados en una pregunta calificada — null/undefined significa
// "todavía sin calificar", así que no se muestra nada hasta que un admin le
// ponga puntos (aunque sean 0, ahí sí se ve "+0 pts").
function PointsPill({ points }: { points: number | null | undefined }) {
  if (points == null) return null
  return <span className="shrink-0 text-[11px] font-semibold text-green-600">+{formatPoints(points)}</span>
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

// Bloque 3 (duelos Big Three): agrupa cada emparejamiento (ida + vuelta) en
// una sola fila en vez de 6 tarjetas sueltas.
function PairedResults({
  questions,
  answers,
  points,
}: {
  questions: SeasonQuestion[]
  answers: Record<string, AnswerValue | undefined>
  points: PointsMap
}) {
  const pairs = new Map<string, SeasonQuestion[]>()
  for (const q of questions) {
    const home = q.config.home_team
    const away = q.config.away_team
    if (!home || !away) continue
    const key = pairKey(home, away)
    if (!pairs.has(key)) pairs.set(key, [])
    pairs.get(key)!.push(q)
  }

  return (
    <div className="flex flex-col gap-2">
      {[...pairs.values()].map((legs, i) => (
        <div key={i} className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
          {legs.map((leg, j) => {
            const v = answers[leg.id] as { home: number; away: number } | undefined
            return (
              <div key={leg.id} className="flex items-center gap-2 text-sm">
                {j > 0 && <span className="text-gray-300">·</span>}
                <TeamBadgeLabel name={leg.config.home_team} />
                <span className="font-bold text-gray-800">{v ? `${v.home} - ${v.away}` : '—'}</span>
                <TeamBadgeLabel name={leg.config.away_team} />
                <ScorePredictionBadge points={points[leg.id]} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Agrupa las preguntas de la fase "initial" en sus bloques (1-4) y las pinta
// con el mismo formato compacto en "Mis apuestas" y "Apuestas detalladas":
// bloque 1 (ranking) con AnswerSummary a ancho completo, bloque 2 (premios
// individuales) en cuadrícula de 2 columnas, bloque 3 (duelos) combinado en
// filas ida/vuelta, bloque 4 (over/under) como lista compacta de una línea.
export default function BlockAnswers({
  questions,
  answers,
  points = {},
  currentResults = {},
  emptyLabel,
}: {
  questions: SeasonQuestion[]
  answers: Record<string, AnswerValue | undefined>
  points?: PointsMap
  // Clasificación actual del Bloque 1 (question_id -> resultado), para los
  // ✓/✗ por equipo -- ver Información › Clasificación actual.
  currentResults?: Record<string, AnswerValue | undefined>
  // Ver AnswerSummary: "Sin responder" por defecto, pero en Información
  // (donde "answers" es el resultado oficial, no la respuesta de un usuario)
  // tiene más sentido "Aún sin resolver".
  emptyLabel?: string
}) {
  const byBlock = new Map<number, SeasonQuestion[]>()
  for (const q of questions) {
    if (q.block == null) continue
    if (!byBlock.has(q.block)) byBlock.set(q.block, [])
    byBlock.get(q.block)!.push(q)
  }

  return (
    <div className="flex flex-col gap-4">
      {BLOCKS.map((b) => {
        const qs = byBlock.get(b) ?? []
        if (qs.length === 0) return null
        return (
          <div key={b} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{BLOCK_LABELS[b] ?? `Bloque ${b}`}</h3>

            {b === 1 &&
              qs.map((q) => {
                const real = currentResults[q.id] as Record<string, number> | undefined
                const predicted = answers[q.id] as Record<string, number> | undefined
                return (
                  <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                    <div className="mb-1 flex justify-end">
                      <PointsPill points={points[q.id]} />
                    </div>
                    {q.answer_type === 'ranking' && (
                      <RankingAccuracySummary real={real} predicted={predicted} total={q.config.items?.length ?? 0} />
                    )}
                    <AnswerSummary question={q} value={answers[q.id]} currentResult={real} emptyLabel={emptyLabel} />
                  </div>
                )
              })}

            {b === 2 && (
              <div className="grid grid-cols-2 gap-2">
                {qs.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
                        {shortQuestionLabel(q)}
                      </p>
                      <PointsPill points={points[q.id]} />
                    </div>
                    <AnswerSummary question={q} value={answers[q.id]} emptyLabel={emptyLabel} />
                  </div>
                ))}
              </div>
            )}

            {b === 3 && <PairedResults questions={qs} answers={answers} points={points} />}

            {b === 4 && (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {qs.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 text-xs text-gray-600">{q.question}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <AnswerSummary question={q} value={answers[q.id]} emptyLabel={emptyLabel} />
                      <PointsPill points={points[q.id]} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
