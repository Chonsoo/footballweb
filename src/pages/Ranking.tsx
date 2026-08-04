import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getTeamColor } from '../lib/teamColors'
import type { LeaderboardRow } from '../lib/database.types'

// Solo se marcan los extremos de la tabla: el 1º como "campeón" (dorado) y
// el último como "farolillo rojo" (el que paga la primera ronda). Nada de
// zona Champions en medio — con las medallas del podio ya se lee de sobra.
function zoneFor(position: number, total: number): { bar: string; chip: string; label: string } | null {
  if (position === 1) return { bar: 'bg-gold-500', chip: 'bg-gold-100 text-gold-600', label: 'Campeón' }
  if (position === total && total > 1) return { bar: 'bg-red-500', chip: 'bg-red-100 text-red-600', label: 'Farolillo rojo' }
  return null
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
            const zone = zoneFor(position, rows.length)
            const team = LALIGA_TEAMS_2026_27.find((t) => t.id === row.favorite_team)
            const teamColor = getTeamColor(row.favorite_team)
            const isMe = row.user_id === user?.id

            return (
              <div
                key={row.user_id}
                className={`relative flex items-center gap-3 overflow-hidden rounded-xl border bg-white py-3 pl-4 pr-4 shadow-sm ${
                  isMe ? 'border-brand-400 ring-1 ring-brand-300' : 'border-gray-200'
                }`}
              >
                {zone && <span className={`absolute inset-y-0 left-0 w-1.5 ${zone.bar}`} />}

                <span className="flex w-7 shrink-0 items-center justify-center text-lg font-bold text-gray-400">
                  {position <= 3 ? MEDALS[position - 1] : position === rows.length && rows.length > 1 ? '🏮' : position}
                </span>

                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100"
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
                  {zone && (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${zone.chip}`}>
                      {zone.label}
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
