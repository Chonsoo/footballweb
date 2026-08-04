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
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-3">
          <div className="mb-3 flex items-center gap-3">
            {player.photo_url ? (
              <img src={player.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/20" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-brand-100">
                {player.player_position}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{player.name}</p>
              <p className="text-xs text-brand-200">
                {FANTASY_POSITION_LABELS[player.player_position]}
                {team ? ` · ${team.name}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded p-1 text-brand-200 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-lg bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setSelected('total')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                selected === 'total' ? 'bg-gold-500 text-brand-950' : 'text-brand-100 hover:bg-brand-800/60'
              }`}
            >
              Total
            </button>
            {matchdays.map((md) => (
              <button
                key={md.number}
                type="button"
                onClick={() => setSelected(md.number)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selected === md.number ? 'bg-gold-500 text-brand-950' : 'text-brand-100 hover:bg-brand-800/60'
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
        <div className="border-y border-white/10 bg-black/10">
          <div className={`grid ${cols} gap-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200`}>
            <span className="text-center">Cant.</span>
            <span>Estadística</span>
            <span className="text-right">Puntos</span>
          </div>
          <div className="min-h-[252px]">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-brand-200">Cargando…</p>
            ) : (
              items.map((it) => (
                <div
                  key={it.key}
                  className={`grid ${cols} items-center gap-2 border-t border-white/10 px-4 py-2.5 text-sm first:border-t-0`}
                >
                  <span className="text-center font-medium text-brand-200">{it.key === 'minutes' ? `${it.count}'` : it.count}</span>
                  <span className="text-brand-50">{it.label}</span>
                  <span
                    className={`text-right font-semibold ${
                      it.points < 0 ? 'text-red-400' : it.points > 0 ? 'text-green-400' : 'text-brand-300'
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

        <div className="flex items-center justify-between bg-gold-500 px-5 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-brand-950">
            Total {selected === 'total' ? 'temporada' : `jornada ${selected}`}
          </span>
          <span className="text-lg font-bold text-brand-950">{total} pts</span>
        </div>
      </div>
    </div>
  )
}
