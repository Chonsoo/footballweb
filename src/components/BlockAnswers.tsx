import { useState } from 'react'
import AnswerSummary, { shortMatchTeamName, teamCode, formatMatchDate } from './AnswerSummary'
import RankingAccuracySummary from './RankingAccuracySummary'
import ScorePredictionBadge from './ScorePredictionBadge'
import { shortQuestionLabel } from '../lib/questionLabel'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import { formatPoints } from '../lib/formatPoints'
import { findTeamBadge } from '../lib/teamBadge'
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

// Escudo pequeño de tamaño fijo (sin texto) -- el nombre completo va solo en
// la cabecera del emparejamiento, aquí basta el escudo + title al pasar el
// ratón/mantener pulsado, así ningún nombre largo ("Atlético de Madrid")
// puede descuadrar la fila.
function TeamCrest({ name }: { name: string | undefined }) {
  const badge = findTeamBadge(name)
  const [err, setErr] = useState(false)
  if (!badge || err) return <span className="h-6 w-6 shrink-0" title={name} />
  return <img src={badge} alt={name ?? ''} title={name} className="h-6 w-6 shrink-0 object-contain" onError={() => setErr(true)} />
}

// Bloque 3 (duelos Big Three): agrupa cada emparejamiento (ida + vuelta) en
// una sola tarjeta. Cada fila (ida/vuelta) es su propio contenedor flex
// independiente en vez de compartir una única rejilla -- con una rejilla
// compartida, cuando la pastilla de puntos de una fila no se pintaba aún
// (sin calificar) React no generaba ese nodo y todas las columnas de las
// filas siguientes se desplazaban una posición, descuadrando todo.
function PairedResults({
  questions,
  answers,
  points,
  wide,
}: {
  questions: SeasonQuestion[]
  answers: Record<string, AnswerValue | undefined>
  points: PointsMap
  // Información no mete esto en una tarjeta/popup estrecho como Mis
  // apuestas o el desglose de puntos -- ahí ida y vuelta caben en la misma
  // fila (2 columnas) en vez de una debajo de otra, sin dejar tanto hueco
  // vacío a la derecha.
  wide?: boolean
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

  // Ida y vuelta ordenados por fecha (el más próximo primero); sin fecha
  // puesta todavía, al final. Y las 3 tarjetas de emparejamientos también
  // se ordenan por su partido más próximo, para que arriba salga siempre
  // lo que se juega antes.
  const dateOf = (q: SeasonQuestion) => q.config.match_date ?? '9999-99-99'
  const sortedPairs = [...pairs.values()]
    .map((legs) => [...legs].sort((a, b) => dateOf(a).localeCompare(dateOf(b))))
    .sort((a, b) => dateOf(a[0]).localeCompare(dateOf(b[0])))

  return (
    <div className="flex flex-col gap-2">
      {sortedPairs.map((legs, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm">
          <p className="truncate text-center text-[11px] font-semibold text-gray-400">
            {shortMatchTeamName(legs[0]?.config.home_team)} <span className="text-gray-300">vs</span>{' '}
            {shortMatchTeamName(legs[0]?.config.away_team)}
          </p>
          <div className={wide ? 'grid grid-cols-2 gap-x-3 gap-y-1.5' : 'flex flex-col gap-1.5'}>
            {legs.map((leg) => {
            const v = answers[leg.id] as { home: number; away: number } | undefined
            const date = formatMatchDate(leg.config.match_date)
            return (
              <div key={leg.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {/* Grupos de ancho fijo (no dependen de la longitud del
                    nombre real) para que el marcador quede siempre en la
                    misma columna entre la ida y la vuelta. El código de 3
                    letras identifica el equipo sin necesitar hover (en
                    móvil el title del escudo no se ve nunca). flex-wrap +
                    ml-auto: si no cabe todo en una línea (2 columnas en
                    Información, por ejemplo), la fecha/pastilla de puntos
                    baja a su propia línea en vez de desbordar o apretujarse. */}
                <span className="flex w-16 shrink-0 items-center justify-end gap-1">
                  <span className="text-[11px] font-bold text-gray-500">{teamCode(leg.config.home_team)}</span>
                  <TeamCrest name={leg.config.home_team} />
                </span>
                <span className="w-12 shrink-0 text-center text-sm font-bold text-gray-800">
                  {v ? `${v.home} - ${v.away}` : '—'}
                </span>
                <span className="flex w-16 shrink-0 items-center gap-1">
                  <TeamCrest name={leg.config.away_team} />
                  <span className="text-[11px] font-bold text-gray-500">{teamCode(leg.config.away_team)}</span>
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  {date && <span className="text-[10px] text-gray-400">{date}</span>}
                  <ScorePredictionBadge points={points[leg.id]} />
                </span>
              </div>
            )
            })}
          </div>
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
  wide = false,
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
  // Bloque 3: ida y vuelta en 2 columnas en vez de una debajo de otra --
  // solo tiene sentido fuera de tarjetas/popups estrechos (Información).
  wide?: boolean
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

            {b === 3 && <PairedResults questions={qs} answers={answers} points={points} wide={wide} />}

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
