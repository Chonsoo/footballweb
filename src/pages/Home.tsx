import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeRanks, distFromLastTier } from '../lib/ranking'
import { isInitialPhaseClosed } from '../lib/deadlines'
import type { LeaderboardRow } from '../lib/database.types'

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
    description: 'La mente colmena — qué ha votado la mayoría.',
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

  const myIndex = user ? rows.findIndex((r) => r.user_id === user.id) : -1
  const myRow = myIndex >= 0 ? rows[myIndex] : null
  // Ranking 1224: si empatas con otro en puntos, mostráis el mismo puesto.
  const myRank = myIndex >= 0 ? computeRanks(rows)[myIndex] : null
  const myIsLast = myRow != null && rows.length > 1 && distFromLastTier(myRow.total_points, rows) === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-5 py-8 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 2px, transparent 2px, transparent 40px)',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">🏆</span>
          <h1 className="text-2xl font-extrabold tracking-tight text-gold-400 sm:text-3xl">PORRA ABUELONCHA</h1>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">Participantes</p>
              <p className="text-xl font-bold">{loading ? '…' : rows.length}</p>
            </div>
            {myRow && myRank != null && (
              <div
                className={`rounded-xl border px-4 py-2 backdrop-blur-sm ${
                  myIsLast ? 'border-red-400/50 bg-red-500/10' : 'border-gold-400/40 bg-white/10'
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">Tu puesto</p>
                <p className={`flex items-center justify-center gap-1.5 text-xl font-bold ${myIsLast ? 'text-red-200' : 'text-gold-400'}`}>
                  {myRank <= 3 && !myIsLast ? (
                    <span className="text-2xl leading-none">{MEDALS[myRank - 1]}</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      {myIsLast ? rows.length : myRank}º {myIsLast && <span className="text-2xl leading-none">🏮</span>}
                    </span>
                  )}
                  <span className="text-sm font-medium text-brand-100">· {myRow.total_points} pts</span>
                </p>
              </div>
            )}
          </div>
        </div>
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
