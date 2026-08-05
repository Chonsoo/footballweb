import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from './QuestionCard'
import FantasyLineupPicker from './FantasyLineupPicker'
import AuthShell from './AuthShell'
import { useFantasyLineup } from '../lib/useFantasyLineup'
import { isAnswerComplete } from '../lib/isAnswerComplete'
import { BLOCKS, BLOCK_LABELS } from '../lib/blocks'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import type { AnswerValue, SeasonAnswer, SeasonQuestion } from '../lib/database.types'

interface Step {
  key: string
  label: string
  questions: SeasonQuestion[]
}

export default function OnboardingWizard({ onDone }: { onDone: () => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, SeasonAnswer>>({})
  const [step, setStep] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const fantasy = useFantasyLineup()

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString()
      const { data: qs } = await supabase
        .from('season_questions')
        .select('*')
        .eq('phase', 'initial')
        .or(`closes_at.is.null,closes_at.gt.${now}`)
        .order('block', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })

      const { data: as_ } = user
        ? await supabase.from('season_answers').select('*').eq('user_id', user.id)
        : { data: [] }

      const answersMap: Record<string, SeasonAnswer> = {}
      for (const a of (as_ as SeasonAnswer[]) ?? []) {
        answersMap[a.question_id] = a
      }

      setQuestions((qs as SeasonQuestion[]) ?? [])
      setAnswers(answersMap)
      setLoading(false)
    }
    load()
  }, [user])

  // Agrupa las preguntas iniciales en, como mucho, 4 pasos (uno por bloque),
  // igual que en "Apuestas iniciales", en vez de una pregunta por pantalla.
  const steps: Step[] = useMemo(() => {
    const byBlock = new Map<number, SeasonQuestion[]>()
    const noBlock: SeasonQuestion[] = []
    for (const q of questions) {
      if (q.block != null && BLOCKS.includes(q.block)) {
        if (!byBlock.has(q.block)) byBlock.set(q.block, [])
        byBlock.get(q.block)!.push(q)
      } else {
        noBlock.push(q)
      }
    }
    const result: Step[] = []
    for (const b of BLOCKS) {
      const qs = byBlock.get(b) ?? []
      if (qs.length > 0) result.push({ key: `block-${b}`, label: BLOCK_LABELS[b] ?? `Bloque ${b}`, questions: qs })
    }
    if (noBlock.length > 0) result.push({ key: 'no-block', label: 'Otras preguntas', questions: noBlock })
    return result
  }, [questions])

  // Paso 5, siempre el último: el 11 de Abuelonchos. No sale de
  // season_questions (usa fantasy_lineups/fantasy_lineup_players), así que
  // se añade aparte en vez de como un Step más.
  const totalSteps = steps.length + 1
  const isFantasyStep = step === steps.length

  async function finish() {
    await supabase.rpc('complete_onboarding')
    await refreshProfile()
    onDone()
  }

  function goNext() {
    if (step + 1 >= totalSteps) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }

  // Autoguardado: cada pregunta se guarda en cuanto se responde, sin esperar
  // a un botón "Siguiente" general (los tipos que ya tienen su propio botón
  // "Guardar", como texto o marcador, lo conservan).
  async function saveAnswer(questionId: string, value: AnswerValue) {
    if (!user) return
    setSavingId(questionId)
    const { data, error } = await supabase
      .from('season_answers')
      .upsert({ question_id: questionId, user_id: user.id, answer: value }, { onConflict: 'question_id,user_id' })
      .select('*')
      .single()
    setSavingId(null)
    if (error) return
    setAnswers((a) => ({ ...a, [questionId]: data as SeasonAnswer }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando…</p>
      </div>
    )
  }

  if (showIntro) {
    const favoriteTeam = LALIGA_TEAMS_2026_27.find((t) => t.id === profile?.favorite_team)
    return (
      <AuthShell
        maxWidth="max-w-lg"
        header={null}
        backgroundMark={
          favoriteTeam?.badge && (
            // Los escudos de equipo (a diferencia del símbolo de LaLiga, que
            // rellena casi toda su caja) traen bastante margen transparente
            // dentro del propio PNG -- a igual tamaño de caja se ven mucho
            // más pequeños. Para que el escudo en sí se perciba del mismo
            // tamaño que el logo de LaLiga en las otras pantallas, la caja
            // va aprox. un 45% más grande. Y se sube bastante (-translate-y)
            // para que quede concentrado detrás del escudo pequeño + título
            // de arriba, sin meterse por detrás del párrafo de texto.
            <img
              src={favoriteTeam.badge}
              alt=""
              className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(46rem,98vw,88vh)] w-[min(46rem,98vw,88vh)] -translate-x-1/2 -translate-y-24 object-contain opacity-40 sm:h-[min(58rem,90vw,88vh)] sm:w-[min(58rem,90vw,88vh)] sm:-translate-y-36"
            />
          )
        }
      >
        <div className="flex flex-col gap-6">
          <div className="text-center">
            {favoriteTeam?.badge && (
              <img src={favoriteTeam.badge} alt="" className="mx-auto mb-3 h-16 w-16 object-contain" />
            )}
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              ¡Bienvenido a la Porra de LaLiga 2026/27{profile?.username ? `, ${profile.username}` : ''}!
            </h1>
            <p className="text-left text-gray-500">
              Vas a dejar tus pronósticos para toda la temporada: quién será campeón, quién bajará, los premios
              individuales, los duelos entre grandes, algún que otro over/under y tu 11 de Abuelonchos. Todo
              repartido en {totalSteps} bloques.
            </p>
          </div>
          <div className="text-left text-sm text-gray-600">
            <p className="mb-2">
              No hace falta rellenarlo todo del tirón: cada respuesta se guarda sola en cuanto la marcas, y puedes
              saltarte cualquier bloque y completarlo más adelante desde «Apuestas iniciales» en el menú.
            </p>
            <p>Tómate el tiempo que necesites. ¡Que gane el mejor pronosticador!</p>
          </div>
          <button
            onClick={() => setShowIntro(false)}
            className="self-center rounded-lg bg-brand-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            Comenzar →
          </button>
        </div>
      </AuthShell>
    )
  }

  const current = isFantasyStep ? null : steps[step]
  const answeredCount = isFantasyStep
    ? fantasy.filled
    : current!.questions.filter((q) => isAnswerComplete(q, answers[q.id]?.answer)).length
  const totalCount = isFantasyStep ? fantasy.slots.length : current!.questions.length
  const allAnswered = isFantasyStep ? fantasy.complete : answeredCount === totalCount
  const someAnswered = answeredCount > 0

  // Con una sola pregunta por bloque (p.ej. el Bloque 1, la clasificación) no
  // tiene sentido distinguir "algunas respondidas" — solo hay una, completa o no.
  const skipLabel = isFantasyStep
    ? someAnswered
      ? 'Omitir huecos sin rellenar de este bloque'
      : 'Omitir este bloque'
    : current!.questions.length > 1 && someAnswered
      ? 'Omitir respuestas no contestadas de este bloque'
      : 'Omitir este bloque de preguntas'

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div>
        <p className="mb-1 text-sm text-gray-400">
          Bloque {step + 1} de {totalSteps}
        </p>
        <div className="h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-brand-700 transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{isFantasyStep ? 'El 11 de Abuelonchos' : current!.label}</h2>
        {isFantasyStep ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              Elige tu 11 solo con jugadores veteranos (nacidos antes de 1996). Máximo 3 jugadores entre Real Madrid,
              Atlético y Barcelona en total (da igual la mezcla). Cada jugador suma puntos jornada a jornada según su
              rendimiento real. Se guarda automáticamente al colocar cada jugador.
            </p>
            {fantasy.loading ? (
              <p className="text-sm text-gray-400">Cargando…</p>
            ) : fantasy.players.length === 0 ? (
              <p className="text-sm text-gray-400">
                Todavía no hay jugadores cargados. El admin puede añadirlos desde el panel (pestaña "Jugadores
                fantasy"). Puedes omitir este bloque y volver más adelante desde «Apuestas iniciales».
              </p>
            ) : (
              <FantasyLineupPicker
                players={fantasy.players}
                formation={fantasy.formation}
                value={fantasy.value}
                onChange={fantasy.handleChange}
                onFormationChange={fantasy.handleFormationChange}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {current!.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                myAnswer={answers[q.id]}
                closed={false}
                saving={savingId === q.id}
                onSave={(value) => saveAnswer(q.id, value)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <button onClick={goNext} className="text-left text-gray-400 hover:underline">
          {skipLabel}
        </button>
        <button
          onClick={goNext}
          disabled={!allAnswered}
          className="shrink-0 rounded bg-brand-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
