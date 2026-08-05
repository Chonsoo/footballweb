import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeRanks, distFromLastTier, uniqueTierCount } from '../lib/ranking'
import { isInitialPhaseClosed } from '../lib/deadlines'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import PlayerAvatarMarquee from '../components/PlayerAvatarMarquee'
import type { LeaderboardRow } from '../lib/database.types'
import type { FantasyPlayer } from '../lib/fantasyTypes'

const MEDALS = ['🥇', '🥈', '🥉']

interface HomeCard {
  to: string
  icon: string
  title: string
  description: string
  accent: string
}

const CARDS: HomeCard[] = [
  {
    to: '/clasificacion',
    icon: '🏆',
    title: 'Clasificación',
    description: 'La tabla general, quién manda y quién paga la primera ronda.',
    accent: 'bg-gold-100 text-gold-600',
  },
  {
    to: '/apuestas-iniciales',
    icon: '📝',
    title: 'Apuestas iniciales',
    description: 'Las apuestas de antes de empezar la temporada.',
    accent: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/apuestas-semana',
    icon: '⚡',
    title: 'Apuestas flash',
    description: 'Pronósticos jornada a jornada.',
    accent: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/oraculo',
    icon: '🔮',
    title: 'El oráculo',
    description: 'La mente colmena: qué ha votado la mayoría.',
    accent: 'bg-purple-100 text-purple-700',
  },
  {
    to: '/mis-apuestas',
    icon: '✅',
    title: 'Mis apuestas',
    description: 'Repasa lo que has puesto tú.',
    accent: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/apuestas-detalladas',
    icon: '🔍',
    title: 'Apuestas detalladas',
    description: 'Lo que ha puesto cada participante, para llorar luego.',
    accent: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/informacion',
    icon: 'ℹ️',
    title: 'Información',
    description: 'Cómo funciona la porra.',
    accent: 'bg-gray-100 text-gray-600',
  },
  {
    to: '/reglamento',
    icon: '📜',
    title: 'Reglamento oficial',
    description: 'Las normas, letra pequeña incluida.',
    accent: 'bg-gray-100 text-gray-600',
  },
]

export default function Home() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [teamPlayers, setTeamPlayers] = useState<FantasyPlayer[]>([])

  const favoriteTeam = LALIGA_TEAMS_2026_27.find((t) => t.id === profile?.favorite_team)
  const teamPhotos = teamPlayers.filter((p) => p.photo_url).map((p) => p.photo_url as string)

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      // Desempate estable por nombre: con todos a 0 puntos al principio de
      // temporada, sin un segundo criterio el orden (y por tanto "tu
      // puesto") puede variar de una carga a otra sin motivo aparente.
      .order('username', { ascending: true })
      .then(({ data }) => {
        const sorted = ((data as LeaderboardRow[]) ?? []).sort((a, b) => b.total_points - a.total_points)
        setRows(sorted)
        setLoading(false)
      })
  }, [])

  // Misma cinta de jugadores del equipo favorito que en el asistente de
  // apuestas iniciales (OnboardingWizard), para que la portada tras el
  // logueo no "parezca otra app" -- mismo fondo verde + escudo + jugadores.
  useEffect(() => {
    async function loadTeamPlayers() {
      if (!favoriteTeam) {
        setTeamPlayers([])
        return
      }
      const { data } = await supabase
        .from('fantasy_players')
        .select('*')
        .eq('team_id', favoriteTeam.id)
        .eq('active', true)
      setTeamPlayers((data as FantasyPlayer[]) ?? [])
    }
    loadTeamPlayers()
  }, [favoriteTeam])

  const myIndex = user ? rows.findIndex((r) => r.user_id === user.id) : -1
  const myRow = myIndex >= 0 ? rows[myIndex] : null
  // Ranking 1224: si empatas con otro en puntos, mostráis el mismo puesto.
  const myRank = myIndex >= 0 ? computeRanks(rows)[myIndex] : null
  // Empate de últimos manda... salvo que sea un empate total (el primero
  // empata con el último): en ese caso todos van "primeros" con medalla, no
  // farolillo.
  const myIsLast =
    myRow != null && rows.length > 1 && distFromLastTier(myRow.total_points, rows) === 0 && uniqueTierCount(rows) > 1

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 py-5 text-white shadow-lg">
        {favoriteTeam?.badge ? (
          <img
            src={favoriteTeam.badge}
            alt=""
            className="pointer-events-none absolute left-1/2 top-1/2 h-[80%] w-[80%] max-h-56 max-w-56 -translate-x-1/2 -translate-y-1/2 object-contain opacity-15"
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 2px, transparent 2px, transparent 40px)',
            }}
          />
        )}

        {teamPhotos.length > 0 && (
          <div className="relative z-10 mb-4">
            <PlayerAvatarMarquee photos={teamPhotos} direction="left" size="sm" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 px-5 text-center">
          {!favoriteTeam?.badge && <span className="text-4xl">🏆</span>}
          <h1 className="text-2xl font-extrabold tracking-tight text-gold-400 sm:text-3xl">PORRA ABUELONCHA</h1>

          <div className="flex w-full max-w-xs items-center justify-center gap-4 rounded-xl bg-white/[0.67] px-4 py-2.5 shadow-inner backdrop-blur-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">Participantes</p>
              <p className="text-xl font-bold text-brand-950">{loading ? '…' : rows.length}</p>
            </div>
            {myRow && myRank != null && (
              <div className="border-l border-brand-900/10 pl-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-700">Tu puesto</p>
                <p className={`flex items-center justify-center gap-1.5 text-xl font-bold ${myIsLast ? 'text-red-600' : 'text-brand-800'}`}>
                  {myRank <= 3 && !myIsLast ? (
                    <span className="text-2xl leading-none">{MEDALS[myRank - 1]}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {myIsLast ? rows.length : myRank}º {myIsLast && <span className="text-2xl leading-none">🏮</span>}
                    </span>
                  )}
                  <span className="text-sm font-medium text-brand-700">· {myRow.total_points} pts</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {teamPhotos.length > 0 && (
          <div className="relative z-10 mt-4">
            <PlayerAvatarMarquee photos={teamPhotos} direction="right" size="sm" />
          </div>
        )}
      </div>

      {profile?.username && (
        <p className="text-sm text-gray-500">
          ¡Hola, <span className="font-medium text-gray-700">{profile.username}</span>! ¿Qué quieres mirar?
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CARDS.filter((card) => card.to !== '/apuestas-iniciales' || !isInitialPhaseClosed()).map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-transform active:scale-95 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${card.accent}`}>{card.icon}</span>
            <p className="text-sm font-semibold text-gray-800">{card.title}</p>
            <p className="text-xs text-gray-400">{card.description}</p>
          </Link>
        ))}

        {profile?.is_admin && (
          <Link
            to="/admin"
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-transform active:scale-95 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-lg text-red-600">⚙️</span>
            <p className="text-sm font-semibold text-gray-800">Admin</p>
            <p className="text-xs text-gray-400">Panel de administración.</p>
          </Link>
        )}
      </div>
    </div>
  )
}
