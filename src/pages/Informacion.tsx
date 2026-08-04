import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zoneForPosition } from '../lib/rankingZones'
import type { SeasonQuestion, TierItem } from '../lib/database.types'

type Subview = 'clasificacion' | 'reglas'

const SUBVIEWS: [Subview, string][] = [
  ['clasificacion', 'Clasificación actual'],
  ['reglas', 'Reglas'],
]

const ZONE_CHIP: Record<string, string> = {
  campeon: 'bg-gold-100 text-gold-600',
  champions: 'bg-brand-100 text-brand-700',
  europa: 'bg-yellow-100 text-yellow-700',
  descenso: 'bg-red-100 text-red-700',
  media: 'bg-gray-50 text-gray-400',
}

// La Clasificación actual es, literalmente, la "clasificación real" que el
// admin fija en Admin › Resolver apuestas para el Bloque 1 (se puede volver
// a fijar tantas veces como haga falta durante la temporada) -- aquí solo se
// muestra en público, y es la misma que usan los ✓/✗ de Mis apuestas y
// Apuestas detalladas.
export default function Informacion() {
  const [subview, setSubview] = useState<Subview>('clasificacion')
  const [question, setQuestion] = useState<SeasonQuestion | null>(null)
  const [result, setResult] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: q } = await supabase.from('season_questions').select('*').eq('block', 1).eq('phase', 'initial').maybeSingle()
      const question = (q as SeasonQuestion) ?? null
      if (question) {
        const { data: r } = await supabase.from('season_results').select('result').eq('question_id', question.id).maybeSingle()
        setResult((r?.result as Record<string, number>) ?? null)
      }
      setQuestion(question)
      setLoading(false)
    }
    load()
  }, [])

  const items = question?.config.items ?? []
  const tiers = question?.config.tiers ?? []
  const total = items.length

  const ordered = result
    ? items
        .map((item) => ({ item, pos: result[item.id] }))
        .filter((e): e is { item: TierItem; pos: number } => e.pos != null)
        .sort((a, b) => a.pos - b.pos)
    : []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">ℹ️ Información</h1>
        <p className="text-sm text-gray-500">Cómo funciona la porra.</p>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
        {SUBVIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubview(key)}
            className={`flex-1 px-3 py-2 font-medium transition-colors ${
              subview === key ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subview === 'clasificacion' ? (
        loading ? (
          <p className="text-gray-500">Cargando…</p>
        ) : ordered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
            Todavía no se ha actualizado la clasificación actual.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <span className="text-3xl">🚧</span>
          <p className="font-medium text-gray-600">En construcción</p>
          <p className="max-w-sm text-sm text-gray-400">
            Aquí irán subpáginas con el detalle de las apuestas cerradas y el estado de cada una.
          </p>
        </div>
      )}
    </div>
  )
}
