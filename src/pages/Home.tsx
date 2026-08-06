import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeRanks, distFromLastTier, uniqueTierCount } from '../lib/ranking'
import { isInitialPhaseClosed } from '../lib/deadlines'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import PlayerAvatarMarquee from '../components/PlayerAvatarMarquee'
import { EASTER_EGG_HINTS, useEasterEgg } from '../lib/easterEgg'
import EasterEggStepModal from '../components/EasterEggStepModal'
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
    to: '/fantasy',
    icon: '⚽',
    title: 'Fantasy',
    description: 'Tu 11 de Abuelonchos, jornada a jornada.',
    // Nota: el icono es un emoji (⚽), así que "text-*" no le afecta a él
    // (los emoji llevan su propio color fijo) -- solo cambia el fondo de la
    // insignia. bg-gray-200 quedaba casi blanco encima de la tarjeta de
    // cristal; con gold-100 (el dorado propio de Fantasy) se nota como
    // insignia, igual que el resto de tarjetas.
    accent: 'bg-gold-100 text-gold-600',
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
  const teamPlayersWithPhoto = teamPlayers.filter((p) => p.photo_url)
  const teamPhotos = teamPlayersWithPhoto.map((p) => p.photo_url as string)
  const teamPlayerIds = teamPlayersWithPhoto.map((p) => p.api_player_id)

  // Abueloncho Dorado, paso 3: cazar al capitán elegido en el paso 2 entre
  // las fotos que van pasando en bucle.
  const { progress: eggProgress, advance: eggAdvance } = useEasterEgg()
  const [showStep3Modal, setShowStep3Modal] = useState(false)

  async function handleCaptainPhotoClick(playerId: number) {
    if (eggProgress?.step !== 2 || eggProgress.captainPlayerId !== playerId) return
    const ok = await eggAdvance(3)
    if (ok) setShowStep3Modal(true)
  }

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
    // Ya no hace falta una caja verde propia para la cabecera -- el fondo
    // verde de marca ahora viene del propio Layout (misma app en todas
    // partes), así que aquí solo flotan el título y la cinta de jugadores
    // directamente sobre ese verde, igual que en el login/onboarding
    // (AuthShell). El escudo del equipo favorito NO se repite aquí -- ya lo
    // pinta Layout como marca de agua fija de fondo en todas las páginas, y
    // poner otro aquí encima daba un molesto efecto de "escudo duplicado".
    <div className="relative flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl">
        {teamPhotos.length > 0 && (
          <div className="relative z-10 mb-4">
            <PlayerAvatarMarquee
              photos={teamPhotos}
              playerIds={teamPlayerIds}
              onPhotoClick={handleCaptainPhotoClick}
              direction="left"
              size="sm"
            />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-3 px-5 py-3 text-center text-white">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-gold-400 sm:text-3xl">PORRA ABUELONCHA</h1>

          <div className="flex w-full max-w-xs items-center justify-center gap-4 rounded-xl bg-white/[0.67] px-4 py-2.5 shadow-xl shadow-black/20 backdrop-blur-sm">
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
            <PlayerAvatarMarquee
              photos={teamPhotos}
              playerIds={teamPlayerIds}
              onPhotoClick={handleCaptainPhotoClick}
              direction="right"
              size="sm"
            />
          </div>
        )}
      </div>

      {showStep3Modal && (
        <EasterEggStepModal step={3} hint={EASTER_EGG_HINTS[3]} onClose={() => setShowStep3Modal(false)} />
      )}

      {profile?.username && (
        <p className="text-sm text-white/80">
          ¡Hola, <span className="font-medium text-white">{profile.username}</span>! ¿Qué quieres mirar?
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CARDS.filter((card) => card.to !== '/apuestas-iniciales' || !isInitialPhaseClosed()).map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="flex flex-col gap-2 rounded-xl bg-white/[0.67] p-4 shadow-md shadow-black/10 backdrop-blur-sm transition-transform active:scale-95 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${card.accent}`}>{card.icon}</span>
            <p className="text-sm font-semibold text-brand-950">{card.title}</p>
            <p className="text-xs text-brand-900/60">{card.description}</p>
          </Link>
        ))}

        {profile?.is_admin && (
          <Link
            to="/admin"
            className="flex flex-col gap-2 rounded-xl bg-white/[0.67] p-4 shadow-md shadow-black/10 backdrop-blur-sm transition-transform active:scale-95 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-lg text-red-600">⚙️</span>
            <p className="text-sm font-semibold text-brand-950">Admin</p>
            <p className="text-xs text-brand-900/60">Panel de administración.</p>
          </Link>
        )}
      </div>
    </div>
  )
}
