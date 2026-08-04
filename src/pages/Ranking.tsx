import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getTeamColor } from '../lib/teamColors'
import type { LeaderboardRow } from '../lib/database.types'

interface RowStyle {
  rowBg: string
  border: string
  chip?: { bg: string; label: string }
}

// Toda la fila lleva color según el puesto, no solo un detalle: podio en
// oro/plata/bronce arriba, y hacia el farolillo rojo abajo el rojo se va
// intensificando cuanto más cerca del último puesto (los dos anteriores en
// naranja/rojo más suaves). El resto de la tabla se queda neutra.
function rowStyleFor(position: number, total: number): RowStyle {
  if (position === 1) {
    return {
      rowBg: 'bg-gradient-to-r from-gold-100 via-gold-50 to-white',
      border: 'border-gold-300',
      chip: { bg: 'bg-gold-100 text-gold-700', label: 'Campeón' },
    }
  }
  if (position === 2) {
    return { rowBg: 'bg-gradient-to-r from-slate-100 via-slate-50 to-white', border: 'border-slate-300' }
  }
  if (position === 3) {
    return { rowBg: 'bg-gradient-to-r from-orange-100 via-orange-50 to-white', border: 'border-orange-300' }
  }

  const distFromLast = total - position
  if (total > 3) {
    if (distFromLast === 0) {
      return {
        rowBg: 'bg-red-100',
        border: 'border-red-300',
        chip: { bg: 'bg-red-200 text-red-700', label: 'Farolillo rojo' },
      }
    }
    if (distFromLast === 1) return { rowBg: 'bg-orange-50', border: 'border-orange-200' }
    if (distFromLast === 2) return { rowBg: 'bg-amber-50', border: 'border-amber-100' }
  }

  return { rowBg: 'bg-white', border: 'border-gray-200' }
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Ranking() {
  const { user } = useAuth()
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .then(({ data }) => {
        setRows((data as LeaderboardRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-gray-500">Cargando clasificación…</p>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">🏆 Clasificación</h1>
        <p className="text-sm text-gray-500">Quién manda y quién paga la primera ronda.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
          Todavía no hay puntos.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => {
            const position = i + 1
            const style = rowStyleFor(position, rows.length)
            const isLast = position === rows.length && rows.length > 1
            const team = LALIGA_TEAMS_2026_27.find((t) => t.id === row.favorite_team)
            const teamColor = getTeamColor(row.favorite_team)
            const isMe = row.user_id === user?.id

            return (
              <div
                key={row.user_id}
                className={`relative flex items-center gap-3 overflow-hidden rounded-xl border py-3 pl-4 pr-4 shadow-sm ${style.rowBg} ${
                  isMe ? 'border-brand-400 ring-1 ring-brand-300' : style.border
                }`}
              >
                <span className="flex w-7 shrink-0 items-center justify-center text-lg font-bold text-gray-500">
                  {position <= 3 ? MEDALS[position - 1] : isLast ? '🏮' : position}
                </span>

                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 ring-1 ring-gray-100"
                  style={teamColor ? { boxShadow: `0 0 0 2px ${teamColor}55` } : undefined}
                >
                  {team?.badge ? (
                    <img src={team.badge} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <span className="text-sm">🛡️</span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-800">
                    {row.username}
                    {isMe && <span className="ml-1.5 text-xs font-medium text-brand-600">(tú)</span>}
                  </p>
                  {style.chip && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.chip.bg}`}>
                      {style.chip.label}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{row.total_points}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">pts</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
