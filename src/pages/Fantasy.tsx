import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import FantasyPointsPopup from '../components/FantasyPointsPopup'
import FantasyScoringRules from '../components/FantasyScoringRules'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import { fetchPlayedMatchdays, fetchPlayerStats, pointsByPlayerFromStats } from '../lib/fantasyStatsQueries'
import {
  DEFAULT_FANTASY_FORMATION,
  type FantasyFormation,
  type FantasyMatchday,
  type FantasyPlayer,
  type FantasyPlayerStats,
} from '../lib/fantasyTypes'

type Subview = 'liga' | 'resumen' | 'puntos'

interface FantasyLeaderboardRow {
  mode: string
  user_id: string
  username: string
  total_points: number
}

interface RivalLineup {
  formation: FantasyFormation
  value: Record<string, string>
}

const SUBVIEWS: [Subview, string][] = [
  ['liga', 'Clasificación'],
  ['resumen', 'Mi equipo'],
  ['puntos', 'Cómo puntúa'],
]

// Selector de pestañas/jornadas con "pista" oscura y estado activo en
// dorado — Fantasy tiene su propia identidad visual (negro/grafito +
// dorado, look "premium") en vez del verde del resto de la app, para que se
// note que es su propia sección dentro de la porra.
function darkTrackBtn(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-gold-500 text-neutral-950' : 'text-neutral-300 hover:bg-neutral-800/60'
  }`
}

function scopeChip(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active ? 'bg-gold-500 text-neutral-950' : 'bg-neutral-800/60 text-neutral-300 hover:bg-neutral-800'
  }`
}

export default function Fantasy() {
  const [subview, setSubview] = useState<Subview>('liga')
  const [matchdays, setMatchdays] = useState<FantasyMatchday[]>([])
  const [popupPlayer, setPopupPlayer] = useState<FantasyPlayer | null>(null)
  const [popupMatchday, setPopupMatchday] = useState<number | undefined>(undefined)

  useEffect(() => {
    fetchPlayedMatchdays().then(setMatchdays)
  }, [])

  function openPopup(player: FantasyPlayer, matchday?: number) {
    setPopupPlayer(player)
    setPopupMatchday(matchday)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 px-4 py-4 text-white shadow-sm">
        <h1 className="text-xl font-bold">⚽ Fantasy</h1>
        <p className="text-sm text-neutral-300">Tu 11 de Abuelonchos, jornada a jornada.</p>

        <div className="mt-3 flex overflow-hidden rounded-lg bg-black/20 p-1 text-sm">
          {SUBVIEWS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setSubview(key)} className={`flex-1 ${darkTrackBtn(subview === key)}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {subview === 'resumen' && <MiEquipoView matchdays={matchdays} onPlayerSelect={openPopup} />}
      {subview === 'liga' && <LigaView matchdays={matchdays} onPlayerSelect={openPopup} />}
      {subview === 'puntos' && <FantasyScoringRules />}

      {popupPlayer && (
        <FantasyPointsPopup
          player={popupPlayer}
          matchdays={matchdays}
          initialMatchday={popupMatchday}
          onClose={() => setPopupPlayer(null)}
        />
      )}
    </div>
  )
}

// --- Mi equipo: tu 11, con selector Total / Jn arriba (igual que en
// Clasificación) — en Total se ve el acumulado de puntos de la temporada, en
// una jornada concreta solo los de ese día.

function MiEquipoView({
  matchdays,
  onPlayerSelect,
}: {
  matchdays: FantasyMatchday[]
  onPlayerSelect: (player: FantasyPlayer, matchday?: number) => void
}) {
  const { players, value, formation, loading, complete } = useFantasyLineup()
  const [scope, setScope] = useState<number | 'total'>('total')
  const [rawStats, setRawStats] = useState<FantasyPlayerStats[]>([])
  const [loadingPoints, setLoadingPoints] = useState(true)

  const playerIds = useMemo(() => Object.keys(value).map(Number), [value])
  const idsKey = playerIds.slice().sort((a, b) => a - b).join(',')
  const playedNumbers = useMemo(() => new Set(matchdays.map((m) => m.number)), [matchdays])
  const lastMd = matchdays.length > 0 ? matchdays[matchdays.length - 1].number : null

  useEffect(() => {
    let active = true
    async function load() {
      if (playerIds.length === 0) {
        setRawStats([])
        setLoadingPoints(false)
        return
      }
      setLoadingPoints(true)
      const stats = await fetchPlayerStats(playerIds, scope === 'total' ? undefined : scope)
      const filtered = scope === 'total' ? stats.filter((s) => playedNumbers.has(s.matchday_num)) : stats
      if (active) {
        setRawStats(filtered)
        setLoadingPoints(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, scope, playedNumbers])

  if (loading) return <p className="text-white/80">Cargando…</p>

  const pointsByPlayer = pointsByPlayerFromStats(rawStats)
  const total = Object.values(pointsByPlayer).reduce((a, b) => a + b, 0)
  // Puntos de la última jornada jugada, para el aviso pequeño bajo el total
  // (solo tiene sentido en modo Total, viendo una jornada concreta ya es
  // justo ese número).
  const lastJornadaTotal =
    lastMd != null ? rawStats.filter((s) => s.matchday_num === lastMd).reduce((sum, s) => sum + s.points, 0) : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setScope('total')} className={scopeChip(scope === 'total')}>
          Total
        </button>
        {matchdays.map((md) => (
          <button key={md.number} type="button" onClick={() => setScope(md.number)} className={scopeChip(scope === md.number)}>
            J{md.number}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-800 px-4 py-3 text-white shadow-sm">
        <span className="text-sm text-neutral-300">
          {scope === 'total' ? 'Tus puntos fantasy (jornadas jugadas)' : `Tus puntos en la jornada ${scope}`}
        </span>
        <div className="text-right">
          <span className="text-2xl font-bold text-gold-400">{loadingPoints ? '…' : total}</span>
          {scope === 'total' && lastMd != null && (
            <p className="text-[11px] text-neutral-400">
              {lastJornadaTotal > 0 ? '+' : ''}
              {lastJornadaTotal} en J{lastMd}
            </p>
          )}
        </div>
      </div>
      {!complete && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Todavía no has completado tu 11 de Abuelonchos en Apuestas iniciales.
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-white/20">
        <FantasyLineupPicker
          players={players}
          formation={formation}
          value={value}
          onChange={() => {}}
          readOnly
          hideSidebar
          pointsByPlayer={pointsByPlayer}
          onPlayerSelect={(p) => onPlayerSelect(p, scope === 'total' ? undefined : scope)}
        />
      </div>
      <p className="text-center text-xs text-white/70">Toca un jugador para ver de dónde salen sus puntos.</p>
    </div>
  )
}

// --- Clasificación: participantes con selector Total / Jn arriba — al
// elegir una jornada concreta, tanto el orden como los puntos que se ven al
// abrir un 11 son los de esa jornada, no el acumulado. En Total, cada fila
// lleva también cuánto sumó en la última jornada y una flecha si ha subido o
// bajado puestos respecto a antes de esa última jornada.

const MEDALS = ['🥇', '🥈', '🥉']

function rankRowStyle(rank: number): { background: string; borderColor: string } {
  if (rank === 1) return { background: 'linear-gradient(to right, #fbe9b8, #fffdf6)', borderColor: '#e0b64a' }
  if (rank === 2) return { background: 'linear-gradient(to right, #e2e8f0, #fafbfc)', borderColor: '#94a3b8' }
  if (rank === 3) return { background: 'linear-gradient(to right, #e8c4a0, #fdf8f3)', borderColor: '#b97a4a' }
  return { background: '#ffffff', borderColor: '#e5e7eb' }
}

interface RankingRow {
  user_id: string
  username: string
  points: number
  lastJornadaPoints?: number
  arrow?: 'up' | 'down' | 'same' | null
}

interface MatchdayLeaderboardRow {
  mode: string
  user_id: string
  username: string
  matchday_num: number
  points: number
}

function LigaView({
  matchdays,
  onPlayerSelect,
}: {
  matchdays: FantasyMatchday[]
  onPlayerSelect: (player: FantasyPlayer, matchday?: number) => void
}) {
  const [scope, setScope] = useState<number | 'total'>('total')
  const [totalBase, setTotalBase] = useState<RankingRow[]>([])
  const [byMatchday, setByMatchday] = useState<MatchdayLeaderboardRow[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lineupByUser, setLineupByUser] = useState<Record<string, RivalLineup | null>>({})
  const [loadingUser, setLoadingUser] = useState<string | null>(null)
  const [pointsByPlayer, setPointsByPlayer] = useState<Record<number, number>>({})

  const playedNumbers = useMemo(() => new Set(matchdays.map((m) => m.number)), [matchdays])
  const lastMd = matchdays.length > 0 ? matchdays[matchdays.length - 1].number : null

  // Carga inicial: jugadores fantasy (para pintar los 11) + los dos listados
  // de puntos (total acumulado, y el desglose por jornada de una sola vez,
  // para no tener que volver a pedir nada al cambiar de jornada o calcular
  // cómo iba la clasificación antes de la última).
  useEffect(() => {
    async function load() {
      const { data: fp } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('eligible_abuelonchos', true)
        .eq('active', true)
        .order('name')
      setPlayers((fp as FantasyPlayer[]) ?? [])

      const { data: lb } = await supabase.from('fantasy_leaderboard').select('*').eq('mode', 'abuelonchos')
      setTotalBase(((lb as FantasyLeaderboardRow[]) ?? []).map((r) => ({ user_id: r.user_id, username: r.username, points: r.total_points })))

      const { data: bm } = await supabase.from('fantasy_leaderboard_by_matchday').select('*').eq('mode', 'abuelonchos')
      setByMatchday((bm as MatchdayLeaderboardRow[]) ?? [])

      setLoadingRows(false)
    }
    load()
  }, [])

  const lastJornadaByUser = useMemo(() => {
    const m = new Map<string, number>()
    if (lastMd == null) return m
    for (const r of byMatchday) {
      if (r.matchday_num === lastMd) m.set(r.user_id, r.points)
    }
    return m
  }, [byMatchday, lastMd])

  // Clasificación total: viene de fantasy_leaderboard (funciona incluso sin
  // ninguna jornada jugada, todos a 0), con la flecha de movimiento respecto
  // a como iba la clasificación antes de la última jornada -- solo tiene
  // sentido con 2+ jornadas jugadas para tener algo con lo que comparar.
  const totalRows = useMemo<RankingRow[]>(() => {
    const sorted = totalBase.slice().sort((a, b) => b.points - a.points)
    if (matchdays.length < 2) {
      return sorted.map((r) => ({ ...r, lastJornadaPoints: lastJornadaByUser.get(r.user_id) ?? 0, arrow: null }))
    }
    const previous = sorted
      .map((r) => ({ user_id: r.user_id, points: r.points - (lastJornadaByUser.get(r.user_id) ?? 0) }))
      .sort((a, b) => b.points - a.points)
    const prevRank = new Map<string, number>()
    previous.forEach((r, i) => prevRank.set(r.user_id, i + 1))
    return sorted.map((r, i) => {
      const currentRank = i + 1
      const prev = prevRank.get(r.user_id)
      const arrow: 'up' | 'down' | 'same' | null = prev == null ? null : currentRank < prev ? 'up' : currentRank > prev ? 'down' : 'same'
      return { ...r, lastJornadaPoints: lastJornadaByUser.get(r.user_id) ?? 0, arrow }
    })
  }, [totalBase, matchdays.length, lastJornadaByUser])

  // Clasificación de una jornada concreta: se saca del mismo fetch inicial,
  // filtrando en el cliente -- no hace falta pedir nada nuevo al cambiar.
  const matchdayRows = useMemo<RankingRow[]>(() => {
    if (scope === 'total') return []
    return byMatchday
      .filter((r) => r.matchday_num === scope)
      .map((r) => ({ user_id: r.user_id, username: r.username, points: r.points }))
      .sort((a, b) => b.points - a.points)
  }, [byMatchday, scope])

  const rows = scope === 'total' ? totalRows : matchdayRows

  // Puntos por jugador para los 11 ya abiertos: el punto de un jugador en una
  // jornada (o en total) es el mismo dato sin importar en el 11 de quién se
  // esté mostrando, así que basta un único mapa global que se recalcula al
  // cambiar de jornada o al abrir un nuevo participante.
  useEffect(() => {
    const ids = Array.from(
      new Set(
        Object.values(lineupByUser)
          .filter((l): l is RivalLineup => l != null)
          .flatMap((l) => Object.keys(l.value).map(Number))
      )
    )
    if (ids.length === 0) {
      setPointsByPlayer({})
      return
    }
    let active = true
    async function load() {
      const stats = await fetchPlayerStats(ids, scope === 'total' ? undefined : scope)
      const filtered = scope === 'total' ? stats.filter((s) => playedNumbers.has(s.matchday_num)) : stats
      if (active) setPointsByPlayer(pointsByPlayerFromStats(filtered))
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, lineupByUser, playedNumbers])

  async function toggle(userId: string) {
    if (expanded === userId) {
      setExpanded(null)
      return
    }
    setExpanded(userId)
    if (!(userId in lineupByUser)) {
      setLoadingUser(userId)
      const { data: lineupRow } = await supabase
        .from('fantasy_lineups')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', 'abuelonchos')
        .maybeSingle()

      if (lineupRow) {
        const { data: slotsData } = await supabase
          .from('fantasy_lineup_players')
          .select('*')
          .eq('lineup_id', lineupRow.id)
        const value: Record<string, string> = {}
        for (const row of (slotsData as { slot_position: string; slot_index: number; player_id: number }[]) ?? []) {
          value[String(row.player_id)] = `${row.slot_position}-${row.slot_index}`
        }
        setLineupByUser((m) => ({
          ...m,
          [userId]: { formation: (lineupRow.formation as FantasyFormation) ?? DEFAULT_FANTASY_FORMATION, value },
        }))
      } else {
        setLineupByUser((m) => ({ ...m, [userId]: null }))
      }
      setLoadingUser(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setScope('total')} className={scopeChip(scope === 'total')}>
          Total
        </button>
        {matchdays.map((md) => (
          <button key={md.number} type="button" onClick={() => setScope(md.number)} className={scopeChip(scope === md.number)}>
            J{md.number}
          </button>
        ))}
      </div>

      {loadingRows ? (
        <p className="text-white/80">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => {
            const rank = i + 1
            const isOpen = expanded === r.user_id
            const style = rankRowStyle(rank)
            return (
              <div
                key={r.user_id}
                className="overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: style.borderColor }}
              >
                <button
                  onClick={() => toggle(r.user_id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  style={{ background: style.background }}
                >
                  <span className="flex w-7 shrink-0 items-center justify-center text-lg font-bold leading-none">
                    {rank <= 3 ? MEDALS[rank - 1] : <span className="text-sm text-gray-400">{rank}</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{r.username}</span>
                  {scope === 'total' && r.arrow && r.arrow !== 'same' && (
                    <span
                      className={`shrink-0 text-sm font-bold ${r.arrow === 'up' ? 'text-green-600' : 'text-red-600'}`}
                      title={r.arrow === 'up' ? 'Sube en la clasificación' : 'Baja en la clasificación'}
                    >
                      {r.arrow === 'up' ? '▲' : '▼'}
                    </span>
                  )}
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-right">
                      <p className="text-sm font-semibold text-gray-700">
                        {r.points} <span className="font-normal text-gray-500">pts</span>
                      </p>
                      {scope === 'total' && lastMd != null && (
                        <p className="text-[10px] text-gray-400">
                          {(r.lastJornadaPoints ?? 0) > 0 ? '+' : ''}
                          {r.lastJornadaPoints ?? 0} en J{lastMd}
                        </p>
                      )}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/40 bg-white/[0.67] p-3 backdrop-blur-sm">
                    {loadingUser === r.user_id ? (
                      <p className="text-sm text-gray-400">Cargando…</p>
                    ) : lineupByUser[r.user_id] ? (
                      <div className="overflow-hidden rounded-lg border border-white/20">
                        <FantasyLineupPicker
                          players={players}
                          formation={lineupByUser[r.user_id]!.formation}
                          value={lineupByUser[r.user_id]!.value}
                          onChange={() => {}}
                          readOnly
                          hideSidebar
                          pointsByPlayer={pointsByPlayer}
                          onPlayerSelect={(p) => onPlayerSelect(p, scope === 'total' ? undefined : scope)}
                        />
                      </div>
                    ) : (
                      <p className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 text-sm text-gray-400">Sin poner / aún no visible</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {rows.length === 0 && <p className="text-white/70">Todavía no hay clasificación fantasy.</p>}
        </div>
      )}
    </div>
  )
}
