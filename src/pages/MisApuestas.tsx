import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import { usePlayers } from '../lib/usePlayers'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import FantasyLineupPicker from '../components/FantasyLineupPicker'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

const SILHOUETTE = '/badges/player-silhouette.png'

const PHASE_LABEL: Record<string, string> = {
  initial: 'Apuestas iniciales',
  weekly: 'Apuestas de la semana',
}

// Fila de respuesta con la cara del jugador cuando la pregunta es de tipo
// "elige un jugador" (Pichichi, Zamora, Zarra…), en vez del texto plano.
function PlayerAnswer({ name }: { name: string }) {
  const { players } = usePlayers()
  const [imgError, setImgError] = useState(false)
  const player = players.find((p) => p.name === name)
  const team = player ? LALIGA_TEAMS_2026_27.find((t) => t.id === player.team_id) : undefined

  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
        {player?.photo_url && !imgError ? (
          <img src={player.photo_url} alt="" className="h-full w-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <img src={SILHOUETTE} alt="" className="h-full w-full scale-110 object-cover" />
        )}
      </div>
      <span className="flex items-center gap-1.5 font-medium text-gray-800">
        {name}
        {team?.badge && <img src={team.badge} alt="" title={team.name} className="h-4 w-4 shrink-0 object-contain" />}
      </span>
    </div>
  )
}

export default function MisApuestas() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(true)

  const lineup = useFantasyLineup()

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data: qs } = await supabase.from('season_questions').select('*').order('created_at', { ascending: true })
      const { data: as_ } = await supabase.from('season_answers').select('*').eq('user_id', user.id)
      const map: Record<string, AnswerValue> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) map[a.question_id] = a.answer
      setQuestions((qs as SeasonQuestion[]) ?? [])
      setAnswers(map)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  const byPhase = new Map<string, SeasonQuestion[]>()
  for (const q of questions) {
    if (!byPhase.has(q.phase)) byPhase.set(q.phase, [])
    byPhase.get(q.phase)!.push(q)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">✅ Mis apuestas</h1>
        <p className="text-sm text-gray-500">Repasa lo que has puesto tú.</p>
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400">
          Todavía no hay preguntas.
        </div>
      )}

      {[...byPhase.entries()].map(([phase, qs]) => (
        <div key={phase} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">{PHASE_LABEL[phase] ?? phase}</h2>
          <div className="flex flex-col gap-2">
            {qs.map((q) => {
              const answer = answers[q.id]
              const isPlayerChoice = q.answer_type === 'choice' && q.config.player_choice && typeof answer === 'string'
              return (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-gray-400">
                    <span className="uppercase tracking-wide">{q.competition}</span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-gray-800">{q.question}</p>
                  {answer == null ? (
                    <p className="text-sm text-gray-400">Sin responder</p>
                  ) : isPlayerChoice ? (
                    <PlayerAnswer name={answer as string} />
                  ) : (
                    <p className="text-sm text-gray-700">{formatAnswer(q, answer)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">El 11 de Abuelonchos</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {lineup.loading ? (
            <p className="text-sm text-gray-400">Cargando…</p>
          ) : lineup.filled === 0 ? (
            <p className="text-sm text-gray-400">Todavía no has puesto tu once, hazlo desde Apuestas iniciales.</p>
          ) : (
            <FantasyLineupPicker
              players={lineup.players}
              formation={lineup.formation}
              value={lineup.value}
              onChange={() => {}}
              readOnly
              hideSidebar
            />
          )}
        </div>
      </div>
    </div>
  )
}
