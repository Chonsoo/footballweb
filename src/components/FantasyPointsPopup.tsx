import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import { FANTASY_POSITION_LABELS, type FantasyMatchday, type FantasyPlayer, type FantasyPlayerStats } from '../lib/fantasyTypes'
import { aggregateFantasyBreakdown, calculateFantasyPoints, fantasyPointsBreakdown } from '../lib/fantasyScoring'

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
  const selectedRow = selected === 'total' ? null : statsByMatchday.get(selected)
  const { items, total } =
    selected === 'total'
      ? aggregateFantasyBreakdown(stats)
      : selectedRow
        ? { items: fantasyPointsBreakdown(selectedRow), total: calculateFantasyPoints(selectedRow) }
        : { items: [], total: 0 }

  const team = LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
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

        {matchdays.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no hay jornadas jugadas.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
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

            {loading ? (
              <p className="text-sm text-gray-400">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400">
                {selected === 'total' ? 'Sin puntos todavía.' : 'No jugó, o no hay datos de esta jornada.'}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((it) => (
                  <div key={it.key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{it.label}</span>
                    <span className={`font-medium ${it.points < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {it.points > 0 ? '+' : ''}
                      {it.points}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-lg font-bold text-brand-700">{total} pts</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
