import AnswerSummary, { TeamBadgeLabel } from './AnswerSummary'
import { shortQuestionLabel } from '../lib/questionLabel'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import type { AnswerValue, SeasonQuestion } from '../lib/database.types'

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

// Bloque 3 (duelos Big Three): agrupa cada emparejamiento (ida + vuelta) en
// una sola fila en vez de 6 tarjetas sueltas.
function PairedResults({ questions, answers }: { questions: SeasonQuestion[]; answers: Record<string, AnswerValue | undefined> }) {
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
}: {
  questions: SeasonQuestion[]
  answers: Record<string, AnswerValue | undefined>
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
              qs.map((q) => (
                <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
                  <AnswerSummary question={q} value={answers[q.id]} />
                </div>
              ))}

            {b === 2 && (
              <div className="grid grid-cols-2 gap-2">
                {qs.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                    <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-gray-400" title={q.question}>
                      {shortQuestionLabel(q)}
                    </p>
                    <AnswerSummary question={q} value={answers[q.id]} />
                  </div>
                ))}
              </div>
            )}

            {b === 3 && <PairedResults questions={qs} answers={answers} />}

            {b === 4 && (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
                {qs.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 text-xs text-gray-600">{q.question}</span>
                    <AnswerSummary question={q} value={answers[q.id]} />
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
