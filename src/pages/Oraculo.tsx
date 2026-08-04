import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEDIA_TIER_ID, MEDIA_TIER_LABEL, type SeasonQuestion } from '../lib/database.types'
import { zoneForPosition } from '../lib/rankingZones'

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

interface SimpleStat {
  top: unknown
  pct: number
  total: number
}

interface TierStat {
  team_id: string
  tier_id: string
  pct: number
}

function formatAnswerValue(q: SeasonQuestion, value: unknown): string {
  if (q.answer_type === 'score_prediction') {
    const v = value as { home: number; away: number }
    return `${v.home} - ${v.away}`
  }
  return String(value)
}

function tierLabel(q: SeasonQuestion, tierId: string): string {
  if (tierId === MEDIA_TIER_ID) return MEDIA_TIER_LABEL
  return q.config.tiers?.find((t) => t.id === tierId)?.label ?? tierId
}

function teamName(q: SeasonQuestion, teamId: string): string {
  return q.config.items?.find((it) => it.id === teamId)?.name ?? teamId
}

export default function Oraculo() {
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [simpleStats, setSimpleStats] = useState<Record<string, SimpleStat | null>>({})
  const [tierStats, setTierStats] = useState<Record<string, TierStat[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const list = (qs as SeasonQuestion[]) ?? []
      setQuestions(list)

      const simple: Record<string, SimpleStat | null> = {}
      const tiers: Record<string, TierStat[]> = {}

      await Promise.all(
        list.map(async (q) => {
          if (q.answer_type === 'tier_list') {
            const { data } = await supabase.rpc('oracle_tier_counts', { p_question_id: q.id })
            const rows = (data as TierCountRow[]) ?? []
            const byTeam = new Map<string, TierCountRow[]>()
            for (const r of rows) {
              if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, [])
              byTeam.get(r.team_id)!.push(r)
            }
            const result: TierStat[] = []
            for (const [teamId, teamRows] of byTeam) {
              const total = teamRows.reduce((s, r) => s + Number(r.cnt), 0)
              const top = teamRows.reduce((a, b) => (Number(b.cnt) > Number(a.cnt) ? b : a))
              result.push({ team_id: teamId, tier_id: top.tier_id, pct: total > 0 ? (Number(top.cnt) / total) * 100 : 0 })
            }
            tiers[q.id] = result
          } else if (q.answer_type === 'ranking') {
            const { data } = await supabase.rpc('oracle_ranking_counts', { p_question_id: q.id })
            const rows = (data as RankingCountRow[]) ?? []
            const questionTiers = q.config.tiers ?? []
            const total = q.config.items?.length ?? 20

            // Reagrupa cada (equipo, posición, cnt) a (equipo, zona, cnt) usando la
            // misma regla que la UI de respuesta, y luego coge la zona más votada.
            const byTeam = new Map<string, Map<string, number>>()
            for (const r of rows) {
              const zone = zoneForPosition(Number(r.pos), questionTiers, total)
              if (!byTeam.has(r.team_id)) byTeam.set(r.team_id, new Map())
              const zoneCounts = byTeam.get(r.team_id)!
              zoneCounts.set(zone.id, (zoneCounts.get(zone.id) ?? 0) + Number(r.cnt))
            }
            const result: TierStat[] = []
            for (const [teamId, zoneCounts] of byTeam) {
              const entries = [...zoneCounts.entries()]
              const totalVotes = entries.reduce((s, [, c]) => s + c, 0)
              const [topZoneId, topCnt] = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
              result.push({ team_id: teamId, tier_id: topZoneId, pct: totalVotes > 0 ? (topCnt / totalVotes) * 100 : 0 })
            }
            tiers[q.id] = result
          } else {
            const { data } = await supabase.rpc('oracle_answer_counts', { p_question_id: q.id })
            const rows = (data as AnswerCountRow[]) ?? []
            if (rows.length === 0) {
              simple[q.id] = null
              return
            }
            const total = rows.reduce((s, r) => s + Number(r.cnt), 0)
            const top = rows.reduce((a, b) => (Number(b.cnt) > Number(a.cnt) ? b : a))
            simple[q.id] = { top: top.answer_value, pct: (Number(top.cnt) / total) * 100, total }
          }
        })
      )

      setSimpleStats(simple)
      setTierStats(tiers)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🔮 El oráculo</h1>
        <p className="text-sm text-gray-500">La respuesta más votada de cada pregunta, sin desvelar quién ha votado qué.</p>
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
          Todavía no hay preguntas.
        </div>
      )}

      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{q.competition}</p>
          <p className="mb-3 text-sm font-medium text-gray-800">{q.question}</p>

          {q.answer_type === 'tier_list' || q.answer_type === 'ranking' ? (
            (tierStats[q.id]?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">Todavía no hay respuestas.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {tierStats[q.id].map((r) => (
                  <li key={r.team_id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-gray-700">{teamName(q, r.team_id)}</span>
                      <span className="text-gray-500">
                        {tierLabel(q, r.tier_id)} <span className="font-semibold text-brand-700">{Math.round(r.pct)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(r.pct)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : simpleStats[q.id] ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm">
                <span className="font-semibold text-gray-800">{formatAnswerValue(q, simpleStats[q.id]!.top)}</span>{' '}
                <span className="font-semibold text-brand-700">{Math.round(simpleStats[q.id]!.pct)}%</span>{' '}
                <span className="text-gray-400">({simpleStats[q.id]!.total} respuestas)</span>
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.round(simpleStats[q.id]!.pct)}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Todavía no hay respuestas.</p>
          )}
        </div>
      ))}
    </div>
  )
}
