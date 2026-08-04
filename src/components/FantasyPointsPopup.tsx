import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { FANTASY_POSITION_LABELS, type FantasyMatchday, type FantasyPlayer, type FantasyPlayerStats } from '../lib/fantasyTypes'
import { aggregateFantasyBreakdown, calculateFantasyPoints, emptyFantasyStats, fantasyPointsBreakdown } from '../lib/fantasyScoring'

interface Props {
  player: FantasyPlayer
  // Jornadas ya jugadas (con datos cargados), orden ascendente.
  matchdays: FantasyMatchday[]
  // Con qué pestaña abrir el popup — p.ej. si se llega desde "Jornadas" con
  // una jornada concreta seleccionada, tiene sentido abrir ahí directamente.
  initialMatchday?: number
  onClose: () => void
}

// Popup reutilizable de desglose de puntos por jugador y jornada (o total de
// temporada) — se usa tanto para el propio 11 (Resumen/Jornadas) como para
// el de cualquier rival (Liga fantasy), ya que solo depende del jugador.
export default function FantasyPointsPopup({ player, matchdays, initialMatchday, onClose }: Props) {
  const [stats, setStats] = useState<FantasyPlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | 'total'>(initialMatchday ?? 'total')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('fantasy_player_stats')
        .select('*')
        .eq('player_id', player.api_player_id)
        .order('matchday_num', { ascending: true })
      if (active) {
        setStats((data as FantasyPlayerStats[]) ?? [])
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [player.api_player_id])

  const statsByMatchday = new Map(stats.map((s) => [s.matchday_num, s]))
  const { items, total } =
    selected === 'total'
      ? aggregateFantasyBreakdown(stats, player.player_position)
      : (() => {
          const row = statsByMatchday.get(selected) ?? emptyFantasyStats(player.player_position)
          return { items: fantasyPointsBreakdown(row), total: calculateFantasyPoints(row) }
        })()

  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)

  const cols = 'grid-cols-[44px_1fr_52px]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 pb-3">
          <div className="mb-3 flex items-center gap-3">
            {player.photo_url ? (
              <img src={player.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                {player.player_position}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{player.name}</p>
              <p className="text-xs text-gray-500">
                {FANTASY_POSITION_LABELS[player.player_position]}
                {team ? ` · ${team.name}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelected('total')}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                selected === 'total' ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Total
            </button>
            {matchdays.map((md) => (
              <button
                key={md.number}
                type="button"
                onClick={() => setSelected(md.number)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  selected === md.number ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                J{md.number}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla Cantidad · Estadística · Puntos: siempre las mismas 7 filas
            (a 0 cuando no aplica), así el popup mide siempre lo mismo tenga
            lo que tenga el jugador. */}
        <div className="border-y border-gray-100">
          <div className={`grid ${cols} gap-2 bg-gray-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400`}>
            <span className="text-center">Cant.</span>
            <span>Estadística</span>
            <span className="text-right">Puntos</span>
          </div>
          <div className="min-h-[252px]">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">Cargando…</p>
            ) : (
              items.map((it) => (
                <div
                  key={it.key}
                  className={`grid ${cols} items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-sm first:border-t-0`}
                >
                  <span className="text-center font-medium text-gray-500">{it.key === 'minutes' ? `${it.count}'` : it.count}</span>
                  <span className="text-gray-700">{it.label}</span>
                  <span
                    className={`text-right font-semibold ${
                      it.points < 0 ? 'text-red-600' : it.points > 0 ? 'text-green-600' : 'text-gray-300'
                    }`}
                  >
                    {it.points > 0 ? '+' : ''}
                    {it.points}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between bg-brand-700 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-white">
            Total {selected === 'total' ? 'temporada' : `jornada ${selected}`}
          </span>
          <span className="text-lg font-bold text-white">{total} pts</span>
        </div>
      </div>
    </div>
  )
}
