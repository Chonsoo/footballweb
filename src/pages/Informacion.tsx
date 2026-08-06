import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zoneForPosition } from '../lib/rankingZones'
import BlockAnswers from '../components/BlockAnswers'
import AnswerSummary from '../components/AnswerSummary'
import { shortQuestionLabel } from '../lib/questionLabel'
import { getFlashStatus, FLASH_STATUS_LABELS, FLASH_STATUS_COLORS } from '../lib/flashStatus'
import { resultsTableForDisplay, useEasterEgg } from '../lib/easterEgg'
import type { AnswerValue, SeasonQuestion, TierItem } from '../lib/database.types'

type Subview = 'clasificacion' | 'resultados' | 'flash'

const SUBVIEWS: [Subview, string][] = [
  ['clasificacion', 'Clasificación actual'],
  ['resultados', 'Resultados'],
  ['flash', 'Apuestas flash'],
]

// Mismo color por zona que en el formulario donde se rellena (RankingAnswer.tsx
// / zoneForPosition, ver lib/rankingZones.ts) y que en el resumen de Mis
// apuestas/Detalladas (AnswerSummary.tsx) -- antes esta tabla tenía su propia
// paleta aparte (oro/azul/rojo) que no coincidía con la de la propia app.
const ZONE_CHIP: Record<string, string> = {
  campeon: 'bg-red-100 text-red-700',
  champions: 'bg-orange-100 text-orange-700',
  europa: 'bg-yellow-100 text-yellow-700',
  descenso: 'bg-lime-100 text-lime-700',
  media: 'bg-gray-50 text-gray-400',
}

const EMPTY_RESULT_LABEL = 'Aún sin resolver'

// Todo lo de esta página lee de season_results (lo que el admin fija en
// Admin › Bloques iniciales / Apuestas flash), nunca de las respuestas de un
// usuario concreto -- es el "resultado oficial" público, se pueda volver a
// fijar cuantas veces haga falta según avance la temporada.
export default function Informacion() {
  const [subview, setSubview] = useState<Subview>('clasificacion')
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [resultsMap, setResultsMap] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(true)
  const { progress: eggProgress } = useEasterEgg()

  useEffect(() => {
    async function load() {
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from('season_questions').select('*').order('created_at', { ascending: true }),
        supabase.from('season_results').select('*'),
      ])
      setQuestions((qs as SeasonQuestion[]) ?? [])
      const map: Record<string, AnswerValue> = {}
      for (const r of (rs as { question_id: string; result: AnswerValue }[]) ?? []) map[r.question_id] = r.result
      setResultsMap(map)
      setLoading(false)
    }
    load()
  }, [])

  const block1Question = questions.find((q) => q.phase === 'initial' && q.block === 1)
  const block1Result = block1Question ? (resultsMap[block1Question.id] as Record<string, number> | undefined) : undefined
  const items = block1Question?.config.items ?? []
  const tiers = block1Question?.config.tiers ?? []
  const total = items.length

  const ordered = block1Result
    ? items
        .map((item) => ({ item, pos: block1Result[item.id] }))
        .filter((e): e is { item: TierItem; pos: number } => e.pos != null)
        .sort((a, b) => a.pos - b.pos)
    : []

  const otherBlocksQuestions = questions.filter((q) => q.phase === 'initial' && q.block != null && q.block !== 1)
  const flashQuestions = questions.filter((q) => q.phase === 'weekly')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">ℹ️ Información</h1>
        <p className="text-sm text-white/80">Cómo funciona la porra.</p>
      </div>

      <div className="flex overflow-hidden rounded-lg bg-white/[0.4] text-sm backdrop-blur-sm">
        {SUBVIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubview(key)}
            className={`flex-1 px-3 py-2 font-medium transition-colors ${
              subview === key ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-white/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-white/80">Cargando…</p>
      ) : subview === 'clasificacion' ? (
        ordered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
            Todavía no se ha actualizado la clasificación actual.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
            {ordered.map(({ item, pos }) => {
              const zone = zoneForPosition(pos, tiers, total)
              return (
                <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0">
                  <span className="w-6 shrink-0 text-right text-sm font-semibold text-gray-500">{pos}º</span>
                  {item.badge ? (
                    <img src={item.badge} alt="" className="h-6 w-6 shrink-0 object-contain" />
                  ) : (
                    <span className="h-6 w-6 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{item.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ZONE_CHIP[zone.id] ?? ZONE_CHIP.media}`}>
                    {zone.label}
                  </span>
                </div>
              )
            })}
          </div>
        )
      ) : subview === 'resultados' ? (
        <div className="flex flex-col gap-3">
          {otherBlocksQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
              Todavía no hay preguntas aquí.
            </div>
          ) : (
            <BlockAnswers questions={otherBlocksQuestions} answers={resultsMap} emptyLabel={EMPTY_RESULT_LABEL} showDates />
          )}

          {/* Solo visible mientras está "activa" la apuesta del paso 5 del
              Abueloncho Dorado (igual ventana que la tarjeta especial en
              Apuestas flash) -- una vez completado el paso 5, desaparece
              igual que el resto de pistas: es un evento de una sola vez, no
              una sección permanente. */}
          {eggProgress?.step === 4 && (
            <div className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
              <div className="m-3 overflow-hidden rounded-lg border border-gray-200 bg-white/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Día</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsTableForDisplay().map(({ day, home, away }) => (
                      <tr key={day} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-3 py-2 text-gray-700">{day}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          {home} - {away}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="px-4 pb-4 text-xs text-gray-500">
                🔒 Hay una apuesta nueva esperando respuesta. Que no se te pase el día... mañana el resultado será
                otro.
              </p>
            </div>
          )}
        </div>
      ) : (
        flashQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
            Todavía no hay preguntas aquí.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {flashQuestions.map((q) => {
              const resolved = q.id in resultsMap
              const status = getFlashStatus(q, resolved)
              return (
                <div key={q.id} className="flex flex-col gap-1 rounded-lg bg-white/[0.67] p-2 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${FLASH_STATUS_COLORS[status]}`}>
                      {FLASH_STATUS_LABELS[status]}
                    </span>
                  </div>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-600" title={q.question}>
                    {shortQuestionLabel(q)}
                  </p>
                  <AnswerSummary question={q} value={resultsMap[q.id]} emptyLabel={EMPTY_RESULT_LABEL} />
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
