import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { getTeamColor } from '../lib/teamColors'
import { computeRanks, distFromLastTier, uniqueTierCount } from '../lib/ranking'
import RankingPointsPopup from '../components/RankingPointsPopup'
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
//
// Regla de precedencia: si hay empate, se muestra siempre el puesto más
// alto compartido (p.ej. empate a 2º y 3º -> los dos segundos), EXCEPTO
// cuando el empate es justo el de los últimos — a esos se les pone el
// farolillo y el puesto final. Pero si el empate es total (el primero
// empata con el último, un solo escalón de puntos en toda la tabla),
// manda el empate de primero: todos van con medalla de campeón, sin
// farolillo — por eso "isLastTier" ya viene calculado exigiendo que haya
// más de un escalón de puntos.
function rowStyleFor(rank: number, tierFromLast: number, tierCount: number, isLastTier: boolean): RowStyle {
  if (isLastTier) {
    return {
      background: '#fee2e2',
      borderColor: '#fca5a5',
      chip: { bg: 'bg-red-200 text-red-700', label: 'Farolillo rojo' },
    }
  }
  if (rank === 1) {
    return {
      background: 'linear-gradient(to right, #fbe9b8, #fffdf6)',
      borderColor: '#e0b64a',
      chip: { bg: 'bg-gold-100 text-gold-600', label: 'Campeón' },
    }
  }
  if (rank === 2) {
    return { background: 'linear-gradient(to right, #e2e8f0, #fafbfc)', borderColor: '#94a3b8' }
  }
  if (rank === 3) {
    return { background: 'linear-gradient(to right, #e8c4a0, #fdf8f3)', borderColor: '#b97a4a' }
  }

  if (tierCount > 3) {
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
  const [breakdownFor, setBreakdownFor] = useState<LeaderboardRow | null>(null)
  // Fila que parpadea justo después de pulsar "Tu puesto" -- así se nota que
  // el botón ha hecho algo incluso cuando la fila ya estaba a la vista y no
  // hay scroll perceptible.
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .then(({ data }) => {
        setRows((data as LeaderboardRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-white/80">Cargando clasificación…</p>

  const hasMyRow = !!user && rows.some((r) => r.user_id === user.id)

  function scrollToMe() {
    if (!user) return
    // "start" (en vez de "center") + el scroll-margin-top de la fila deja
    // la fila entera justo debajo de la barra superior fija, en vez de a
    // veces quedar tapada arriba cuando "center" no tenía margen de scroll
    // suficiente por estar cerca del principio de la lista.
    document.getElementById(`ranking-row-${user.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setHighlightId(user.id)
    setTimeout(() => setHighlightId(null), 1600)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">🏆 Clasificación</h1>
        <p className="text-sm text-white/80">Quién manda y quién paga la primera ronda.</p>
      </div>

      {hasMyRow && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-1.5 sm:bottom-6">
          {/* Etiqueta que aclara qué hace el botón y se desvanece sola a los
              pocos segundos, en vez de quedarse siempre puesta como un chip
              más de la lista. */}
          <span className="animate-ranking-fab-label rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
            Encuéntrate aquí 👇
          </span>
          <button
            type="button"
            onClick={scrollToMe}
            title="Ir a tu posición"
            aria-label="Ir a tu posición"
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl shadow-black/30 ring-4 ring-white transition-transform hover:scale-105 active:scale-95"
          >
            {/* Pulso suave, solo 2 veces al aparecer (antes era infinito y
                resultaba molesto). Blanco, no negro: el pulso se expande
                más allá del botón hacia el fondo verde oscuro de la
                página, y en negro apenas se distinguía ahí (oscuro sobre
                oscuro) -- en blanco sí se nota, a juego con el aro blanco
                del propio botón. */}
            <span
              className="absolute inset-0 -z-10 rounded-full bg-white/50"
              style={{ animation: 'ranking-fab-ping 1.8s cubic-bezier(0,0,0.2,1) 2' }}
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/30 bg-white/[0.67] p-6 text-center text-brand-900/60 backdrop-blur-sm">
          Todavía no hay puntos.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(() => {
            const ranks = computeRanks(rows)
            const tierCount = uniqueTierCount(rows)
            return rows.map((row, i) => {
              const rank = ranks[i]
              const tierFromLast = distFromLastTier(row.total_points, rows)
              const isLastTier = tierFromLast === 0 && rows.length > 1 && tierCount > 1
              const style = rowStyleFor(rank, tierFromLast, tierCount, isLastTier)
              const team = LALIGA_TEAMS_2026_27.find((t) => t.id === row.favorite_team)
              const teamColor = getTeamColor(row.favorite_team)
              const isMe = row.user_id === user?.id

              return (
                <button
                  type="button"
                  key={row.user_id}
                  id={`ranking-row-${row.user_id}`}
                  onClick={() => setBreakdownFor(row)}
                  title="Ver de dónde salen estos puntos"
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl border py-3 pl-4 pr-4 text-left shadow-sm transition-all duration-300 hover:brightness-95 ${
                    // Dorado en vez de negro: el negro semitransparente
                    // apenas se notaba sobre el fondo verde oscuro de la
                    // página (oscuro sobre oscuro en el borde exterior). El
                    // dorado contrasta bien tanto contra la tarjeta clara
                    // como contra el verde, y es el mismo acento que ya usa
                    // el resto de la app para "esto es lo importante".
                    highlightId === row.user_id ? 'scale-[1.02] shadow-lg ring-4 ring-gold-500' : ''
                  }`}
                  // scrollMarginTop: deja hueco para la barra superior fija
                  // (logo + pestañas) al hacer scrollIntoView, si no la fila
                  // queda tapada detrás.
                  style={{ background: style.background, borderColor: style.borderColor, scrollMarginTop: '120px' }}
                >
                  {/* Marca "tú" con una franja verde a la izquierda, sin bordes raros */}
                  {isMe && <span className="absolute inset-y-0 left-0 w-1.5 bg-brand-600" />}

                  <span className="flex w-9 shrink-0 flex-col items-center justify-center leading-none text-gray-500">
                    {isLastTier ? (
                      <>
                        <span className="text-base">🏮</span>
                        <span className="mt-0.5 text-[10px] font-bold">{rows.length}º</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">{rank <= 3 ? MEDALS[rank - 1] : rank}</span>
                    )}
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

                <div className="rounded-lg px-1 py-0.5 text-right">
                  <p className="text-lg font-bold text-gray-900">{row.total_points}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">pts</p>
                </div>
              </button>
              )
            })
          })()}
        </div>
      )}

      {breakdownFor && (
        <RankingPointsPopup
          userId={breakdownFor.user_id}
          username={breakdownFor.username}
          totalPoints={breakdownFor.total_points}
          onClose={() => setBreakdownFor(null)}
        />
      )}
    </div>
  )
}
