import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import FantasyPointsPopup from '../components/FantasyPointsPopup'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import { fetchPlayedMatchdays, fetchPlayerStats, pointsByPlayerFromStats } from '../lib/fantasyStatsQueries'
import { DEFAULT_FANTASY_FORMATION, type FantasyFormation, type FantasyMatchday, type FantasyPlayer } from '../lib/fantasyTypes'

type Subview = 'resumen' | 'jornadas' | 'liga'

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
  ['resumen', 'Resumen'],
  ['jornadas', 'Jornadas'],
  ['liga', 'Liga fantasy'],
]

export default function Fantasy() {
  const [subview, setSubview] = useState<Subview>('resumen')
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
      <div>
        <h1 className="text-xl font-bold text-gray-900">⚽ Fantasy</h1>
        <p className="text-sm text-gray-500">Tu 11 de Abuelonchos, jornada a jornada.</p>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
        {SUBVIEWS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubview(key)}
            className={`flex-1 px-3 py-2 font-medium transition-colors ${
              subview === key ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subview === 'resumen' && <ResumenView matchdays={matchdays} onPlayerSelect={(p) => openPopup(p)} />}
      {subview === 'jornadas' && <JornadasView matchdays={matchdays} onPlayerSelect={openPopup} />}
      {subview === 'liga' && <LigaView matchdays={matchdays} onPlayerSelect={(p) => openPopup(p)} />}

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

// --- Resumen: tu 11 y el total de puntos acumulado en las jornadas jugadas.

function ResumenView({
  matchdays,
  onPlayerSelect,
}: {
  matchdays: FantasyMatchday[]
  onPlayerSelect: (player: FantasyPlayer) => void
}) {
  const { players, value, formation, loading, complete } = useFantasyLineup()
  const [pointsByPlayer, setPointsByPlayer] = useState<Record<number, number>>({})
  const [loadingPoints, setLoadingPoints] = useState(true)

  const playerIds = useMemo(() => Object.keys(value).map(Number), [value])
  const idsKey = playerIds.slice().sort((a, b) => a - b).join(',')
  const playedNumbers = useMemo(() => new Set(matchdays.map((m) => m.number)), [matchdays])

  useEffect(() => {
    let active = true
    async function load() {
      if (playerIds.length === 0) {
        setPointsByPlayer({})
        setLoadingPoints(false)
        return
      }
      setLoadingPoints(true)
      const stats = await fetchPlayerStats(playerIds)
      const filtered = stats.filter((s) => playedNumbers.has(s.matchday_num))
      if (active) {
        setPointsByPlayer(pointsByPlayerFromStats(filtered))
        setLoadingPoints(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, playedNumbers])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  const total = Object.values(pointsByPlayer).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <span className="text-sm text-gray-500">Tus puntos fantasy (jornadas jugadas)</span>
        <span className="text-2xl font-bold text-brand-700">{loadingPoints ? '…' : total}</span>
      </div>
      {!complete && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Todavía no has completado tu 11 de Abuelonchos en Apuestas iniciales.
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <FantasyLineupPicker
          players={players}
          formation={formation}
          value={value}
          onChange={() => {}}
          readOnly
          hideSidebar
          pointsByPlayer={pointsByPlayer}
          onPlayerSelect={onPlayerSelect}
        />
      </div>
      <p className="text-center text-xs text-gray-400">Toca un jugador para ver de dónde salen sus puntos.</p>
    </div>
  )
}

// --- Jornadas: el mismo 11, pero con los puntos de una jornada concreta.

function JornadasView({
  matchdays,
  onPlayerSelect,
}: {
  matchdays: FantasyMatchday[]
  onPlayerSelect: (player: FantasyPlayer, matchday?: number) => void
}) {
  const { players, value, formation, loading } = useFantasyLineup()
  const [selectedMd, setSelectedMd] = useState<number | null>(null)
  const [pointsByPlayer, setPointsByPlayer] = useState<Record<number, number>>({})
  const [loadingPoints, setLoadingPoints] = useState(false)

  const playerIds = useMemo(() => Object.keys(value).map(Number), [value])
  const idsKey = playerIds.slice().sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (matchdays.length > 0 && selectedMd == null) {
      setSelectedMd(matchdays[matchdays.length - 1].number)
    }
  }, [matchdays, selectedMd])

  useEffect(() => {
    let active = true
    async function load() {
      if (selectedMd == null || playerIds.length === 0) {
        setPointsByPlayer({})
        return
      }
      setLoadingPoints(true)
      const stats = await fetchPlayerStats(playerIds, selectedMd)
      if (active) {
        setPointsByPlayer(pointsByPlayerFromStats(stats))
        setLoadingPoints(false)
      }
    }
    load()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMd, idsKey])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  if (matchdays.length === 0) {
    return <p className="text-gray-400">Todavía no hay jornadas marcadas como jugadas.</p>
  }

  const total = Object.values(pointsByPlayer).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {matchdays.map((md) => (
          <button
            key={md.number}
            type="button"
            onClick={() => setSelectedMd(md.number)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              selectedMd === md.number ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            J{md.number}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
        <span className="text-sm text-gray-500">Puntos en la jornada {selectedMd}</span>
        <span className="text-2xl font-bold text-brand-700">{loadingPoints ? '…' : total}</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <FantasyLineupPicker
          players={players}
          formation={formation}
          value={value}
          onChange={() => {}}
          readOnly
          hideSidebar
          pointsByPlayer={pointsByPlayer}
          onPlayerSelect={(p) => onPlayerSelect(p, selectedMd ?? undefined)}
        />
      </div>
      <p className="text-center text-xs text-gray-400">Toca un jugador para ver el desglose de esa jornada.</p>
    </div>
  )
}

// --- Liga fantasy: clasificación de participantes; al abrir uno se ve su 11
// con los puntos totales, igual que el propio en Resumen.

function LigaView({
  matchdays,
  onPlayerSelect,
}: {
  matchdays: FantasyMatchday[]
  onPlayerSelect: (player: FantasyPlayer) => void
}) {
  const [rows, setRows] = useState<FantasyLeaderboardRow[]>([])
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lineupByUser, setLineupByUser] = useState<Record<string, RivalLineup | null>>({})
  const [pointsByUser, setPointsByUser] = useState<Record<string, Record<number, number>>>({})
  const [loadingUser, setLoadingUser] = useState<string | null>(null)

  const playedNumbers = useMemo(() => new Set(matchdays.map((m) => m.number)), [matchdays])

  useEffect(() => {
    async function load() {
      const { data: lb } = await supabase
        .from('fantasy_leaderboard')
        .select('*')
        .eq('mode', 'abuelonchos')
        .order('total_points', { ascending: false })
      const { data: fp } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('eligible_abuelonchos', true)
        .eq('active', true)
        .order('name')
      setRows((lb as FantasyLeaderboardRow[]) ?? [])
      setPlayers((fp as FantasyPlayer[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

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
        const ids: number[] = []
        for (const row of (slotsData as { slot_position: string; slot_index: number; player_id: number }[]) ?? []) {
          value[String(row.player_id)] = `${row.slot_position}-${row.slot_index}`
          ids.push(row.player_id)
        }
        setLineupByUser((m) => ({
          ...m,
          [userId]: { formation: (lineupRow.formation as FantasyFormation) ?? DEFAULT_FANTASY_FORMATION, value },
        }))
        const stats = await fetchPlayerStats(ids)
        const filtered = stats.filter((s) => playedNumbers.has(s.matchday_num))
        setPointsByUser((m) => ({ ...m, [userId]: pointsByPlayerFromStats(filtered) }))
      } else {
        setLineupByUser((m) => ({ ...m, [userId]: null }))
      }
      setLoadingUser(null)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const isOpen = expanded === r.user_id
        return (
          <div key={r.user_id} className="overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
            <button onClick={() => toggle(r.user_id)} className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xs font-semibold text-gray-500 ring-1 ring-gray-100">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{r.username}</span>
              <span className="flex shrink-0 items-center gap-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-700">{r.total_points}</span> pts
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 bg-white p-3">
                {loadingUser === r.user_id ? (
                  <p className="text-sm text-gray-400">Cargando…</p>
                ) : lineupByUser[r.user_id] ? (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <FantasyLineupPicker
                      players={players}
                      formation={lineupByUser[r.user_id]!.formation}
                      value={lineupByUser[r.user_id]!.value}
                      onChange={() => {}}
                      readOnly
                      hideSidebar
                      pointsByPlayer={pointsByUser[r.user_id] ?? {}}
                      onPlayerSelect={onPlayerSelect}
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
      {rows.length === 0 && <p className="text-gray-400">Todavía no hay clasificación fantasy.</p>}
    </div>
  )
}
