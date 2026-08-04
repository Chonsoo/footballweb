import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getTeamColor } from '../lib/teamColors'
import { computeRanks, distFromLastTier } from '../lib/ranking'
import type { LeaderboardRow } from '../lib/database.types'

interface RowStyle {
  background: string
  borderColor: string
  chip?: { bg: string; label: string }
}

// Toda la fila lleva color según el puesto, no solo un detalle: podio en
// oro/plata/bronce arriba (con tonos claramente distintos entre sí, no solo
// una variación sutil de amarillo), y hacia el farolillo rojo abajo el rojo
// se va intensificando cuanto más cerca del último puesto. Colores en
// "style" (no clases de Tailwind) para no depender de que existan tokens
// concretos en la paleta — antes "border-gold-300"/"border-brand-400" no
// existían y el navegador caía al negro por defecto, lo que se veía como un
// borde negro no intencionado en varias filas.
//
// "rank" viene ya calculado con empates tipo 1224 (dos empatados en 2º ->
// el siguiente es 4º), y "tierFromLast" mide en escalones de puntos
// distintos desde el final (no filas), para que un empate por el farolillo
// no reparta colores distintos a quienes tienen los mismos puntos.
function rowStyleFor(rank: number, tierFromLast: number, tierCount: number): RowStyle {
  if (rank === 1) {
    return {
      background: 'linear-gradient(to right, #fbe9b8, #fffdf6)',
      borderColor: '#e0b64a',
      chip: { bg: 'bg-gold-100 text-gold-700', label: 'Campeón' },
    }
  }
  if (rank === 2) {
    return { background: 'linear-gradient(to right, #e2e8f0, #fafbfc)', borderColor: '#94a3b8' }
  }
  if (rank === 3) {
    return { background: 'linear-gradient(to right, #e8c4a0, #fdf8f3)', borderColor: '#b97a4a' }
  }

  if (tierCount > 3) {
    if (tierFromLast === 0) {
      return {
        background: '#fee2e2',
        borderColor: '#fca5a5',
        chip: { bg: 'bg-red-200 text-red-700', label: 'Farolillo rojo' },
      }
    }
    if (tierFromLast === 1) return { background: '#fff1e6', borderColor: '#fdd9b5' }
    if (tierFromLast === 2) return { background: '#fffaeb', borderColor: '#fdecc8' }
  }

  return { background: '#ffffff', borderColor: '#e5e7eb' }
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
          {(() => {
            const ranks = computeRanks(rows)
            const tierCount = new Set(rows.map((r) => r.total_points)).size
            return rows.map((row, i) => {
              const rank = ranks[i]
              const tierFromLast = distFromLastTier(row.total_points, rows)
              const style = rowStyleFor(rank, tierFromLast, tierCount)
              const isLastTier = tierFromLast === 0 && rows.length > 1
              const team = LALIGA_TEAMS_2026_27.find((t) => t.id === row.favorite_team)
              const teamColor = getTeamColor(row.favorite_team)
              const isMe = row.user_id === user?.id

              return (
                <div
                  key={row.user_id}
                  className="relative flex items-center gap-3 overflow-hidden rounded-xl border py-3 pl-4 pr-4 shadow-sm"
                  style={{ background: style.background, borderColor: style.borderColor }}
                >
                  {/* Marca "tú" con una franja verde a la izquierda, sin bordes raros */}
                  {isMe && <span className="absolute inset-y-0 left-0 w-1.5 bg-brand-600" />}

                  <span className="flex w-7 shrink-0 items-center justify-center text-lg font-bold text-gray-500">
                    {rank <= 3 ? MEDALS[rank - 1] : isLastTier ? '🏮' : rank}
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
                    {isMe && (
                      <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        TÚ
                      </span>
                    )}
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
            })
          })()}
        </div>
      )}
    </div>
  )
}
