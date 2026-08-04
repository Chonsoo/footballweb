import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type SeasonQuestion } from '../lib/database.types'
import { zoneForPosition } from '../lib/rankingZones'
import { CHART_PALETTE, ChartLegend, DonutChart, RankedBars, SegmentedBar, type ChartSlice } from '../components/OracleCharts'

interface AnswerCountRow {
  answer_value: unknown
  cnt: number
}

interface TierCountRow {
  team_id: string
  tier_id: string
  cnt: number
}

interface RankingCountRow {
  team_id: string
  pos: number
  cnt: number
}

// Distribución completa (no solo la más votada) de las respuestas de una
// pregunta "simple" (texto, elección, marcador) -- se decide donut o barras
// según cuántas respuestas distintas haya, ver ANSWER_TYPE_ICON/renderSimple.
interface SimpleStat {
  rows: { label: string; pct: number }[]
  total: number
}

// Distribución de zona por equipo (Clasificación / tier list): un equipo
// puede tener votos repartidos entre varias zonas, no solo la más votada.
interface TeamZoneDist {
  team_id: string
  zones: ChartSlice[]
}

const ZONE_HEX: Record<string, string> = {
  campeon: '#fca5a5',
  champions: '#fdba74',
  europa: '#fde047',
  descenso: '#bef264',
  [MEDIA_TIER_ID]: '#e5e7eb',
}

const ANSWER_TYPE_ICON: Record<string, string> = {
  ranking: '🏆',
  tier_list: '📊',
  choice: '🗳️',
  score_prediction: '⚽',
  text: '💬',
}

// Umbral para elegir donut (pocas respuestas distintas, se lee bien en tarta)
// vs barras clasificadas (texto libre, buscador de jugador... con potencialmente
// muchas respuestas distintas, donde una tarta con 15 porciones finas no se lee).
const DONUT_MAX_SLICES = 6
const BAR_TOP_N = 5

function formatAnswerValue(q: SeasonQuestion, value: unknown): string {
  if (q.answer_type === 'score_prediction') {
    const v = value as { home: number; away: number }
    return `${v.home} - ${v.away}`
  }
  return String(value)
}

function teamName(q: SeasonQuestion, teamId: string): string {
  return q.config.items?.find((it) => it.id === teamId)?.name ?? teamId
}

function teamBadge(q: SeasonQuestion, teamId: string): string | undefined {
  return q.config.items?.find((it) => it.id === teamId)?.badge
}

export default function Oraculo() {
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [simpleStats, setSimpleStats] = useState<Record<string, SimpleStat | null>>({})
  const [zoneStats, setZoneStats] = useState<Record<string, TeamZoneDist[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const list = (qs as SeasonQuestion[]) ?? []
      setQuestions(list)

      const simple: Record<string, SimpleStat | null> = {}
      const zones: Record<string, TeamZoneDist[]> = {}

      await Promise.all(
        list.map(async (q) => {
          if (q.answer_type === 'tier_list') {
            const { data } = await supabase.rpc('oracle_tier_counts', { p_question_id: q.id })
            const rows = (data as TierCountRow[]) ?? []
            const tierLabels = new Map((q.config.tiers ?? []).map((t) => [t.id, t.label]))
            tierLabels.set(MEDIA_TIER_ID, MEDIA_TIER_LABEL)
            const tierOrder = [...(q.config.tiers ?? []).map((t) => t.id), MEDIA_TIER_ID]

            const byTeam = new Map<string, TierCountRow[]>()
            for (const r of rows) {
              if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, [])
              byTeam.get(r.team_id)!.push(r)
            }
            zones[q.id] = [...byTeam.entries()].map(([teamId, teamRows]) => {
              const total = teamRows.reduce((s, r) => s + Number(r.cnt), 0)
              const slices = teamRows
                .map((r) => ({
                  label: tierLabels.get(r.tier_id) ?? r.tier_id,
                  pct: total > 0 ? (Number(r.cnt) / total) * 100 : 0,
                  color: CHART_PALETTE[tierOrder.indexOf(r.tier_id) % CHART_PALETTE.length] ?? '#9ca3af',
                }))
                .sort((a, b) => b.pct - a.pct)
              return { team_id: teamId, zones: slices }
            })
          } else if (q.answer_type === 'ranking') {
            const { data } = await supabase.rpc('oracle_ranking_counts', { p_question_id: q.id })
            const rows = (data as RankingCountRow[]) ?? []
            const questionTiers = q.config.tiers ?? []
            const total = q.config.items?.length ?? 20

            // Reagrupa cada (equipo, posición, cnt) a (equipo, zona, cnt) usando la
            // misma regla que la UI de respuesta.
            const byTeam = new Map<string, Map<string, { label: string; cnt: number }>>()
            for (const r of rows) {
              const zone = zoneForPosition(Number(r.pos), questionTiers, total)
              if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, new Map())
              const zoneCounts = byTeam.get(r.team_id)!
              const prev = zoneCounts.get(zone.id)
              zoneCounts.set(zone.id, { label: zone.label, cnt: (prev?.cnt ?? 0) + Number(r.cnt) })
            }
            zones[q.id] = [...byTeam.entries()].map(([teamId, zoneCounts]) => {
              const entries = [...zoneCounts.entries()]
              const totalVotes = entries.reduce((s, [, v]) => s + v.cnt, 0)
              const slices = entries
                .map(([zoneId, v]) => ({
                  label: v.label,
                  pct: totalVotes > 0 ? (v.cnt / totalVotes) * 100 : 0,
                  color: ZONE_HEX[zoneId] ?? '#9ca3af',
                }))
                .sort((a, b) => b.pct - a.pct)
              return { team_id: teamId, zones: slices }
            })
          } else {
            const { data } = await supabase.rpc('oracle_answer_counts', { p_question_id: q.id })
            const rows = (data as AnswerCountRow[]) ?? []
            if (rows.length === 0) {
              simple[q.id] = null
              return
            }
            const total = rows.reduce((s, r) => s + Number(r.cnt), 0)
            const sorted = [...rows].sort((a, b) => Number(b.cnt) - Number(a.cnt))
            simple[q.id] = {
              total,
              rows: sorted.map((r) => ({ label: formatAnswerValue(q, r.answer_value), pct: (Number(r.cnt) / total) * 100 })),
            }
          }
        })
      )

      setSimpleStats(simple)
      setZoneStats(zones)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 via-white to-gold-100 p-4">
        <h1 className="text-xl font-bold text-gray-900">🔮 El oráculo</h1>
        <p className="text-sm text-gray-500">La respuesta más votada de cada pregunta, sin desvelar quién ha votado qué.</p>
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
          Todavía no hay preguntas.
        </div>
      )}

      {questions.map((q, i) => {
        const accent = CHART_PALETTE[i % CHART_PALETTE.length]
        const isZoneType = q.answer_type === 'tier_list' || q.answer_type === 'ranking'
        const teamRows = zoneStats[q.id] ?? []
        const stat = simpleStats[q.id]

        return (
          <div key={q.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1" style={{ backgroundColor: accent }} />
            <div className="p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-400">
                <span>{ANSWER_TYPE_ICON[q.answer_type] ?? '❓'}</span>
                {q.competition}
              </p>
              <p className="mb-3 text-sm font-medium text-gray-800">{q.question}</p>

              {isZoneType ? (
                teamRows.length === 0 ? (
                  <p className="text-sm text-gray-400">Todavía no hay respuestas.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {q.answer_type === 'ranking' && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px] text-gray-500">
                        {[...(q.config.tiers ?? []), { id: MEDIA_TIER_ID, label: MEDIA_TIER_LABEL, max: null }].map((t) => (
                          <span key={t.id} className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ZONE_HEX[t.id] ?? '#9ca3af' }} />
                            {t.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                      {teamRows.map((r) => {
                        const badge = teamBadge(q, r.team_id)
                        const top = r.zones[0]
                        return (
                          <li key={r.team_id} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-1.5 text-gray-700">
                                {badge ? (
                                  <img src={badge} alt="" className="h-4 w-4 shrink-0 object-contain" />
                                ) : (
                                  <span className="h-4 w-4 shrink-0" />
                                )}
                                <span className="truncate">{teamName(q, r.team_id)}</span>
                              </span>
                              {top && (
                                <span className="shrink-0 text-gray-500">
                                  {top.label} <span className="font-semibold text-gray-700">{Math.round(top.pct)}%</span>
                                </span>
                              )}
                            </div>
                            <SegmentedBar slices={r.zones} />
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              ) : stat ? (
                (() => {
                  const useDonut = stat.rows.length <= DONUT_MAX_SLICES
                  let sliceRows = stat.rows
                  if (!useDonut) {
                    const top = stat.rows.slice(0, BAR_TOP_N)
                    const restPct = stat.rows.slice(BAR_TOP_N).reduce((s, r) => s + r.pct, 0)
                    sliceRows = restPct > 0 ? [...top, { label: 'Otros', pct: restPct }] : top
                  }
                  const slices: ChartSlice[] = sliceRows.map((r, idx) => ({
                    label: r.label,
                    pct: r.pct,
                    color: CHART_PALETTE[idx % CHART_PALETTE.length],
                  }))
                  return (
                    <div className="flex flex-col gap-2">
                      {useDonut ? (
                        <div className="flex items-center gap-4">
                          <DonutChart slices={slices} />
                          <div className="min-w-0 flex-1">
                            <ChartLegend slices={slices} />
                          </div>
                        </div>
                      ) : (
                        <RankedBars slices={slices} />
                      )}
                      <p className="text-[11px] text-gray-400">
                        {stat.total} respuesta{stat.total === 1 ? '' : 's'}
                      </p>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-gray-400">Todavía no hay respuestas.</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
