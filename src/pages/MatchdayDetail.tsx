import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Match, MatchBet, Matchday, Profile } from '../lib/database.types'

interface MatchWithBets extends Match {
  bets: (MatchBet & { profile?: Profile })[]
}

export default function MatchdayDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [matchday, setMatchday] = useState<Matchday | null>(null)
  const [matches, setMatches] = useState<MatchWithBets[]>([])
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data: md } = await supabase.from('matchdays').select('*').eq('id', id).single()
    const { data: ms } = await supabase
      .from('matches')
      .select('*')
      .eq('matchday_id', id)
      .order('kickoff', { ascending: true })
    const { data: bets } = await supabase.from('match_bets').select('*, profile:profiles(*)')

    const merged: MatchWithBets[] = ((ms as Match[]) ?? []).map((m) => ({
      ...m,
      bets: ((bets as (MatchBet & { profile?: Profile })[]) ?? []).filter((b) => b.match_id === m.id),
    }))

    setMatchday((md as Matchday) ?? null)
    setMatches(merged)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const closed = matchday ? new Date(matchday.deadline).getTime() < Date.now() : false

  async function saveBet(m: MatchWithBets) {
    const draft = drafts[m.id]
    if (!draft || draft.home === '' || draft.away === '' || !user) return
    setSavingId(m.id)
    await supabase.from('match_bets').upsert(
      {
        match_id: m.id,
        user_id: user.id,
        home_score_pred: Number(draft.home),
        away_score_pred: Number(draft.away),
      },
      { onConflict: 'match_id,user_id' }
    )
    setSavingId(null)
    await load()
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>
  if (!matchday) return <p className="text-gray-500">Jornada no encontrada.</p>

  return (
    <div className="flex flex-col gap-4">
      <Link to="/jornadas" className="text-sm text-brand-700">
        ← Jornadas
      </Link>
      <h1 className="text-xl font-semibold">
        {matchday.competition} — Jornada {matchday.number}
      </h1>
      <p className="text-sm text-gray-500">
        {closed ? 'Cerrada' : 'Abierta'} · deadline {new Date(matchday.deadline).toLocaleString('es-ES')}
      </p>

      <div className="flex flex-col gap-3">
        {matches.map((m) => {
          const myBet = m.bets.find((b) => b.user_id === user?.id)
          return (
            <div key={m.id} className="rounded border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-medium">
                  {m.home_team} vs {m.away_team}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(m.kickoff).toLocaleString('es-ES')}
                </span>
              </div>

              {m.status === 'finished' && (
                <p className="mb-2 text-sm text-gray-600">
                  Resultado real: {m.home_score} - {m.away_score}
                </p>
              )}

              {!closed ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={myBet?.home_score_pred}
                    placeholder="0"
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [m.id]: { home: e.target.value, away: d[m.id]?.away ?? String(myBet?.away_score_pred ?? '') },
                      }))
                    }
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={myBet?.away_score_pred}
                    placeholder="0"
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [m.id]: { home: d[m.id]?.home ?? String(myBet?.home_score_pred ?? ''), away: e.target.value },
                      }))
                    }
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                  <button
                    onClick={() => saveBet(m)}
                    disabled={savingId === m.id}
                    className="ml-2 rounded bg-brand-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {m.bets.map((b) => (
                    <li key={b.id} className="flex justify-between text-gray-700">
                      <span>{b.profile?.username ?? '—'}</span>
                      <span>
                        {b.home_score_pred} - {b.away_score_pred}
                        {b.points != null && (
                          <span className="ml-2 font-semibold text-green-600">+{b.points}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
