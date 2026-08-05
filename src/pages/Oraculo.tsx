import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePlayers } from '../lib/usePlayers'
import { findTeamBadge } from '../lib/teamBadge'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type SeasonQuestion } from '../lib/database.types'
import { zoneForPosition, type ZoneInfo } from '../lib/rankingZones'
import { CHART_PALETTE, ChartLegend, DonutChart, RankedBars, SplitBar, VerticalBars, type ChartSlice } from '../components/OracleCharts'

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

// Distribución completa de una pregunta "simple" (elección, texto), ordenada
// de más a menos votada.
interface SimpleStat {
  rows: { label: string; pct: number }[]
  total: number
}

// Solo la opción más votada por equipo -- Clasificación / tier list: aquí no
// interesa el desglose completo, solo "a qué zona cree la mayoría que va cada
// equipo y con qué margen".
interface TeamTopZone {
  team_id: string
  zone_id: string
  label: string
  pct: number
  color: string
}

const ZONE_HEX: Record<string, string> = {
  campeon: '#fca5a5',
  champions: '#fdba74',
  europa: '#fde047',
  descenso: '#bef264',
  [MEDIA_TIER_ID]: '#e5e7eb',
}

// Orden de zonas para la Clasificación: de más arriba de tabla a menos,
// dejando el descenso para el final -- y dentro de cada zona, de más a menos
// %, salvo en descenso que va al revés (de menos a más) para que el equipo
// más "favorito" a bajar quede el último de todos.
const ZONE_ORDER = ['campeon', 'champions', 'europa', MEDIA_TIER_ID, 'descenso']

const ANSWER_TYPE_ICON: Record<string, string> = {
  ranking: '🏆',
  tier_list: '📊',
  choice: '🗳️',
  text: '💬',
}

const BAR_TOP_N = 5
const PLAYER_SILHOUETTE = '/badges/player-silhouette.png'

function formatAnswerValue(value: unknown): string {
  return String(value)
}

function teamName(q: SeasonQuestion, teamId: string): string {
  return q.config.items?.find((it) => it.id === teamId)?.name ?? teamId
}

function teamBadge(q: SeasonQuestion, teamId: string): string | undefined {
  return q.config.items?.find((it) => it.id === teamId)?.badge
}

export default function Oraculo() {
  const { players } = usePlayers()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [simpleStats, setSimpleStats] = useState<Record<string, SimpleStat | null>>({})
  const [topZoneStats, setTopZoneStats] = useState<Record<string, TeamTopZone[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      // Los duelos de marcador (Big Three) no encajan bien en ningún gráfico
      // de "respuesta más votada" -- se quedan fuera de El Oráculo.
      const list = ((qs as SeasonQuestion[]) ?? []).filter((q) => q.answer_type !== 'score_prediction')
      setQuestions(list)

      const simple: Record<string, SimpleStat | null> = {}
      const topZones: Record<string, TeamTopZone[]> = {}

      await Promise.all(
        list.map(async (q) => {
          if (q.answer_type === 'tier_list' || q.answer_type === 'ranking') {
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
              topZones[q.id] = [...byTeam.entries()].map(([teamId, teamRows]) => {
                const total = teamRows.reduce((s, r) => s + Number(r.cnt), 0)
                const top = teamRows.reduce((a, b) => (Number(b.cnt) > Number(a.cnt) ? b : a))
                return {
                  team_id: teamId,
                  zone_id: top.tier_id,
                  label: tierLabels.get(top.tier_id) ?? top.tier_id,
                  pct: total > 0 ? (Number(top.cnt) / total) * 100 : 0,
                  color: CHART_PALETTE[tierOrder.indexOf(top.tier_id) % CHART_PALETTE.length] ?? '#9ca3af',
                }
              })
            } else {
              const { data } = await supabase.rpc('oracle_ranking_counts', { p_question_id: q.id })
              const rows = (data as RankingCountRow[]) ?? []
              const questionTiers = q.config.tiers ?? []
              const total = q.config.items?.length ?? 20

              const byTeam = new Map<string, Map<string, { zone: ZoneInfo; cnt: number }>>()
              for (const r of rows) {
                const zone = zoneForPosition(Number(r.pos), questionTiers, total)
                if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, new Map())
                const zoneCounts = byTeam.get(r.team_id)!
                const prev = zoneCounts.get(zone.id)
                zoneCounts.set(zone.id, { zone, cnt: (prev?.cnt ?? 0) + Number(r.cnt) })
              }
              topZones[q.id] = [...byTeam.entries()].map(([teamId, zoneCounts]) => {
                const entries = [...zoneCounts.values()]
                const totalVotes = entries.reduce((s, v) => s + v.cnt, 0)
                const top = entries.reduce((a, b) => (b.cnt > a.cnt ? b : a))
                return {
                  team_id: teamId,
                  zone_id: top.zone.id,
                  label: top.zone.label,
                  pct: totalVotes > 0 ? (top.cnt / totalVotes) * 100 : 0,
                  color: ZONE_HEX[top.zone.id] ?? '#9ca3af',
                }
              })
            }
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
              rows: sorted.map((r) => ({ label: formatAnswerValue(r.answer_value), pct: (Number(r.cnt) / total) * 100 })),
            }
          }
        })
      )

      setSimpleStats(simple)
      setTopZoneStats(topZones)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-white/80">Cargando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-white/[0.67] p-4 shadow-md shadow-black/10 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-gray-900">🔮 El oráculo</h1>
        <p className="text-sm text-gray-500">La respuesta más votada de cada pregunta, sin desvelar quién ha votado qué.</p>
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
          Todavía no hay preguntas.
        </div>
      )}

      {questions.map((q, i) => {
        const accent = CHART_PALETTE[i % CHART_PALETTE.length]
        const isZoneType = q.answer_type === 'tier_list' || q.answer_type === 'ranking'
        const stat = simpleStats[q.id]

        // Clasificación: agrupado de arriba de tabla hacia abajo (campeón,
        // Champions, Europa, media, descenso al final), y dentro de cada
        // grupo de más a menos % -- salvo en descenso, que va de menos a más
        // para que el más "cantado" a bajar quede el último del todo.
        const teamRows =
          q.answer_type === 'ranking'
            ? [...(topZoneStats[q.id] ?? [])].sort((a, b) => {
                const orderA = ZONE_ORDER.indexOf(a.zone_id)
                const orderB = ZONE_ORDER.indexOf(b.zone_id)
                if (orderA !== orderB) return orderA - orderB
                return a.zone_id === 'descenso' ? a.pct - b.pct : b.pct - a.pct
              })
            : (topZoneStats[q.id] ?? [])

        return (
          <div key={q.id} className="overflow-hidden rounded-xl bg-white/[0.67] shadow-md shadow-black/10 backdrop-blur-sm">
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
                    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                      {teamRows.map((r) => {
                        const badge = teamBadge(q, r.team_id)
                        return (
                          <li
                            key={r.team_id}
                            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px]"
                            style={{ backgroundColor: r.color }}
                          >
                            {badge ? (
                              <img src={badge} alt="" className="h-4 w-4 shrink-0 object-contain" />
                            ) : (
                              <span className="h-4 w-4 shrink-0" />
                            )}
                            <span className="min-w-0 flex-1 truncate font-medium text-gray-800" title={teamName(q, r.team_id)}>
                              {teamName(q, r.team_id)}
                            </span>
                            <span className="shrink-0 font-bold text-gray-800">{Math.round(r.pct)}%</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              ) : stat ? (
                (() => {
                  // Equipo con opciones fijas y acotadas (Fiasco Europeo, Podio
                  // Underdog): un donut con el % de cada equipo que sí recibió
                  // algún voto se lee bien y tiene sentido, porque el universo de
                  // respuestas posibles ya es pequeño de por sí.
                  if (q.config.team_ids) {
                    const slices: ChartSlice[] = stat.rows.map((r, idx) => ({
                      label: r.label,
                      pct: r.pct,
                      color: CHART_PALETTE[idx % CHART_PALETTE.length],
                      image: findTeamBadge(r.label),
                    }))
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <DonutChart slices={slices} />
                          <div className="min-w-0 flex-1">
                            <ChartLegend slices={slices} />
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {stat.total} respuesta{stat.total === 1 ? '' : 's'}
                        </p>
                      </div>
                    )
                  }

                  // Pregunta de 2 opciones (Sí/No): una sola barra partida en
                  // dos tramos de color en vez de dos barras sueltas.
                  if (stat.rows.length === 2 && !q.config.player_choice) {
                    // Color por el texto de la opción, no por cuál va primero
                    // (que depende de cuál va ganando) -- así "Sí" es siempre
                    // verde y "No" siempre rojo, gane quien gane.
                    const slices: ChartSlice[] = stat.rows.map((r) => ({
                      label: r.label,
                      pct: r.pct,
                      color: r.label.trim().toLowerCase() === 'no' ? '#ef4444' : '#2f8f4e',
                    }))
                    return (
                      <div className="flex flex-col gap-2">
                        <SplitBar slices={slices} />
                        <p className="text-[11px] text-gray-400">
                          {stat.total} respuesta{stat.total === 1 ? '' : 's'}
                        </p>
                      </div>
                    )
                  }

                  // Buscador de jugador (Pichichi, Zamora, Zarra...): columnas
                  // verticales con la foto del jugador, las 5 más votadas.
                  const top = stat.rows.slice(0, BAR_TOP_N)
                  const restPct = stat.rows.slice(BAR_TOP_N).reduce((s, r) => s + r.pct, 0)
                  const rows = restPct > 0 ? [...top, { label: 'Otros', pct: restPct }] : top
                  const slices: ChartSlice[] = rows.map((r, idx) => ({
                    label: r.label,
                    pct: r.pct,
                    color: CHART_PALETTE[idx % CHART_PALETTE.length],
                    image: q.config.player_choice ? players.find((p) => p.name === r.label)?.photo_url ?? undefined : undefined,
                    imageRound: true,
                    fallback: q.config.player_choice ? PLAYER_SILHOUETTE : undefined,
                  }))
                  return (
                    <div className="flex flex-col gap-2">
                      {q.config.player_choice ? <VerticalBars slices={slices} /> : <RankedBars slices={slices} />}
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
