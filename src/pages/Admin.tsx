import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import { normalizeText } from '../lib/textNormalize'
import { scoreRankingAnswer } from '../lib/rankingScoring'
import { computeFiasco, computeUnderdogPodium, scoreUnderdogAnswer, type UnderdogPodium } from '../lib/underdogScoring'
import { SCORE_PREDICTION_1X2_POINTS, SCORE_PREDICTION_EXACT_BONUS } from '../lib/scorePrediction'
import RankingAnswer from '../components/RankingAnswer'
import PlayerSelect from '../components/PlayerSelect'
import TeamSelect from '../components/TeamSelect'
import { ScoreStepper, TeamLabel } from '../components/QuestionInput'
import ConfirmDialog from '../components/ConfirmDialog'
import { LALIGA_TEAMS_2026_27 } from '../lib/teamData'
import {
  FANTASY_POSITION_LABELS,
  type FantasyMatchday,
  type FantasyPlayer,
  type FantasyPlayerStats,
  type FantasyPosition,
} from '../lib/fantasyTypes'
import { calculateFantasyPoints } from '../lib/fantasyScoring'
import type {
  AnswerType,
  AnswerValue,
  Profile,
  QuestionConfig,
  QuestionPhase,
  SeasonAnswer,
  SeasonQuestion,
  SeasonResult,
  TierItem,
} from '../lib/database.types'

type Tab = 'users' | 'flash' | 'initial' | 'fantasy' | 'fantasy-stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Usuarios' },
  { id: 'flash', label: 'Apuestas flash' },
  { id: 'initial', label: 'Bloques iniciales' },
  { id: 'fantasy', label: 'Jugadores fantasy' },
  { id: 'fantasy-stats', label: 'Puntuación fantasy' },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Panel de administración</h1>

      {/* Mismo lenguaje visual que la tira de pestañas de la app (burbujas
          redondeadas, deslizable) en vez de la barra con subrayado de antes —
          así el panel tiene su propia navegación reconocible, sin depender
          del navbar general. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersSection />}
      {tab === 'flash' && <FlashAdminSection />}
      {tab === 'initial' && <InitialBlocksSection />}
      {tab === 'fantasy' && <FantasyPlayersSection />}
      {tab === 'fantasy-stats' && <FantasyStatsSection />}
    </div>
  )
}

// ---------------- Apuestas flash: crear + resolver, cada semana según van llegando ----------------
function FlashAdminSection() {
  const [subtab, setSubtab] = useState<'resolve' | 'create'>('resolve')

  return (
    <section className="flex flex-col gap-4">
      <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
        <button
          type="button"
          onClick={() => setSubtab('resolve')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            subtab === 'resolve' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Resolver
        </button>
        <button
          type="button"
          onClick={() => setSubtab('create')}
          className={`flex-1 px-3 py-2 font-medium transition-colors ${
            subtab === 'create' ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Crear
        </button>
      </div>

      {subtab === 'resolve' ? <ResolveQuestionsSection lockedPhase="weekly" /> : <CreateQuestionSection lockedPhase="weekly" />}
    </section>
  )
}

// ---------------- Bloques iniciales: un formulario dedicado por bloque en vez
// de una lista plana de preguntas -- se fijan una vez al principio de
// temporada y solo se van resolviendo, así que aquí no hay "Crear". Bloque 1
// es la clasificación real (ranking); 2, 3 y 4 se resuelven por campos
// (dropdowns/marcadores) con un único "Guardar" por bloque en vez de tener
// que entrar pregunta a pregunta. ----------------
const INITIAL_BLOCKS = [1, 2, 3, 4] as const
const BLOCK_LABELS: Record<number, string> = {
  1: 'Bloque 1 · Clasificación',
  2: 'Bloque 2 · Premios',
  3: 'Bloque 3 · Duelos',
  4: 'Bloque 4 · Sí / No',
}

type AnswerWithProfile = SeasonAnswer & { profile?: Profile }
type Status = { type: 'ok' | 'error'; text: string } | null

function StatusBanner({ status }: { status: Status }) {
  if (!status) return null
  return (
    <p className={`rounded px-3 py-2 text-xs font-medium ${status.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {status.text}
    </p>
  )
}

function teamOptionsFor(config: QuestionConfig): TierItem[] {
  const ids = config.team_ids ?? []
  return ids.map((id) => LALIGA_TEAMS_2026_27.find((t) => t.id === id)).filter((t): t is TierItem => !!t)
}

function isUnderdogQuestion(q: SeasonQuestion) {
  return q.question.toLowerCase().includes('underdog')
}

function InitialBlocksSection() {
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<AnswerWithProfile[]>([])
  const [results, setResults] = useState<SeasonResult[]>([])
  const [loading, setLoading] = useState(true)
  const [block, setBlock] = useState<(typeof INITIAL_BLOCKS)[number]>(1)

  async function load() {
    const [{ data: qs }, { data: as_ }, { data: rs }] = await Promise.all([
      supabase.from('season_questions').select('*').eq('phase', 'initial').order('created_at', { ascending: true }),
      supabase.from('season_answers').select('*, profile:profiles(*)'),
      supabase.from('season_results').select('*'),
    ])
    setQuestions((qs as SeasonQuestion[]) ?? [])
    setAnswers((as_ as AnswerWithProfile[]) ?? [])
    setResults((rs as SeasonResult[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  const blockQuestions = (n: number) => questions.filter((q) => q.block === n)
  const block1Question = blockQuestions(1)[0]
  const block1Result = results.find((r) => r.question_id === block1Question?.id)?.result as Record<string, number> | undefined

  return (
    <section className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {INITIAL_BLOCKS.map((n) => (
          <button
            key={n}
            onClick={() => setBlock(n)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              block === n ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {BLOCK_LABELS[n]}
          </button>
        ))}
      </div>

      {block === 1 && (
        <Block1Panel
          question={block1Question}
          answers={answers.filter((a) => a.question_id === block1Question?.id)}
          result={results.find((r) => r.question_id === block1Question?.id)}
          onChanged={load}
        />
      )}
      {block === 2 && (
        <Block2Panel questions={blockQuestions(2)} answers={answers} results={results} block1Result={block1Result} onChanged={load} />
      )}
      {block === 3 && <Block3Panel questions={blockQuestions(3)} answers={answers} results={results} onChanged={load} />}
      {block === 4 && <Block4Panel questions={blockQuestions(4)} answers={answers} results={results} onChanged={load} />}
    </section>
  )
}

// ---------------- Ajuste manual de puntos por respuesta, reutilizable en
// cualquier bloque -- colapsado por defecto, para no perder la posibilidad de
// corregir un caso puntual sin que sea el flujo principal. ----------------
function ManualPointsEditor({
  question,
  answers,
  onChanged,
}: {
  question: SeasonQuestion
  answers: AnswerWithProfile[]
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const sortedAnswers = [...answers].sort((a, b) =>
    normalizeText(formatAnswer(question, a.answer)).localeCompare(normalizeText(formatAnswer(question, b.answer)))
  )

  async function saveOne(answerId: string) {
    const raw = pointsDrafts[answerId]
    if (raw === undefined || raw === '') return
    const { error } = await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
    if (error) {
      setStatus({ type: 'error', text: error.message })
      return
    }
    await onChanged()
  }

  async function saveAll() {
    setSaving(true)
    setStatus(null)
    const entries = Object.entries(pointsDrafts).filter(([, v]) => v !== '')
    for (const [answerId, raw] of entries) {
      const { error } = await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
      if (error) {
        setStatus({ type: 'error', text: error.message })
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setStatus({ type: 'ok', text: 'Puntos guardados ✓' })
    await onChanged()
  }

  return (
    <div className="rounded border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-500"
      >
        <span>
          Ajustar a mano · {question.question.split(':')[0]} ({answers.length})
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-gray-100 p-3">
          <StatusBanner status={status} />
          {Object.keys(pointsDrafts).length > 0 && (
            <button onClick={saveAll} disabled={saving} className="self-end text-xs text-brand-700 hover:underline disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar todas'}
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            {answers.length === 0 && <p className="text-sm text-gray-400">Nadie ha respondido todavía.</p>}
            {sortedAnswers.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 px-3 py-2 text-sm">
                <span>
                  <strong>{a.profile?.username ?? '—'}</strong>: {formatAnswer(question, a.answer)}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={a.points != null ? String(a.points) : 'pts'}
                    value={pointsDrafts[a.id] ?? ''}
                    onChange={(e) => setPointsDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                  />
                  <button onClick={() => saveOne(a.id)} className="text-brand-700 hover:underline">
                    Guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Bloque 1: Clasificación de Liga ----------------
function Block1Panel({
  question,
  answers,
  result,
  onChanged,
}: {
  question?: SeasonQuestion
  answers: AnswerWithProfile[]
  result?: SeasonResult
  onChanged: () => void
}) {
  const [resultDraft, setResultDraft] = useState<Record<string, number>>((result?.result as Record<string, number>) ?? {})
  const [saving, setSaving] = useState(false)
  const [laligaLoading, setLaligaLoading] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  useEffect(() => {
    setResultDraft((result?.result as Record<string, number>) ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.resolved_at])

  if (!question) return <p className="text-sm text-gray-400">No hay pregunta de Clasificación de Liga creada.</p>

  async function fetchStandingsFromLaliga() {
    setStatus(null)
    setLaligaLoading(true)
    try {
      const resp = await fetch('/api/laliga-standings')
      const data = (await resp.json()) as { positions?: Record<string, number>; unmapped?: string[]; error?: string }
      if (!resp.ok || !data.positions) throw new Error(data.error ?? `El proxy respondió ${resp.status}`)
      setResultDraft(data.positions)
      const extra = data.unmapped && data.unmapped.length > 0 ? ` (sin mapear: ${data.unmapped.join(', ')})` : ''
      setStatus({ type: 'ok', text: `Clasificación traída de LaLiga.com${extra} — revisa y pulsa "Guardar"` })
    } catch (err) {
      setStatus({ type: 'error', text: `No se pudo traer de LaLiga.com: ${err instanceof Error ? err.message : 'error desconocido'}` })
    } finally {
      setLaligaLoading(false)
    }
  }

  async function save() {
    setStatus(null)
    setSaving(true)
    const { error } = await supabase.rpc('set_season_result', { p_question_id: question!.id, p_result: resultDraft })
    if (error) {
      setStatus({ type: 'error', text: `No se pudo guardar: ${error.message}` })
      setSaving(false)
      return
    }
    for (const a of answers) {
      const pts = scoreRankingAnswer(resultDraft, (a.answer as Record<string, number>) ?? {})
      const { error: pe } = await supabase.rpc('set_answer_points', { p_answer_id: a.id, p_points: pts })
      if (pe) {
        setStatus({ type: 'error', text: `Resultado guardado, pero fallaron algunos puntos: ${pe.message}` })
        setSaving(false)
        await onChanged()
        return
      }
    }
    setSaving(false)
    setStatus({ type: 'ok', text: `Guardado ✓ — resultado y puntos de ${answers.length} participante(s) actualizados` })
    await onChanged()
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusBanner status={status} />
      <div className="rounded bg-gray-50 p-3">
        <p className="mb-2 text-xs font-medium text-gray-500">Clasificación real</p>
        <RankingAnswer items={question.config.items ?? []} tiers={question.config.tiers ?? []} value={resultDraft} onChange={setResultDraft} />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={fetchStandingsFromLaliga}
            disabled={laligaLoading}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {laligaLoading ? 'Trayendo…' : 'Actualizar desde LaLiga.com'}
          </button>
          <button onClick={save} disabled={saving} className="rounded bg-brand-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Guardar fija la clasificación real (se ve en Información › Clasificación actual y en los ✓/✗ de Mis
          apuestas / Apuestas detalladas) y calcula y aplica los puntos de todos los participantes a la vez, con el
          bonus de zona incluido (Champions +3, Europa League +3, Descenso +5).
        </p>
      </div>

      <ManualPointsEditor question={question} answers={answers} onChanged={onChanged} />
    </div>
  )
}

// ---------------- Bloque 2: Premios individuales y narrativos ----------------
function Block2Panel({
  questions,
  answers,
  results,
  block1Result,
  onChanged,
}: {
  questions: SeasonQuestion[]
  answers: AnswerWithProfile[]
  results: SeasonResult[]
  block1Result?: Record<string, number>
  onChanged: () => void
}) {
  const resultFor = (id: string) => results.find((r) => r.question_id === id)?.result

  const [drafts, setDrafts] = useState<Record<string, AnswerValue>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  useEffect(() => {
    const init: Record<string, AnswerValue> = {}
    for (const q of questions) {
      init[q.id] = resultFor(q.id) ?? (isUnderdogQuestion(q) ? { gold: '', silver: '', bronze: '' } : '')
    }
    setDrafts(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => q.id).join(','), results.map((r) => r.resolved_at).join(',')])

  function teamName(id: string | null) {
    return LALIGA_TEAMS_2026_27.find((t) => t.id === id)?.name ?? ''
  }

  function computeFromClassification() {
    if (!block1Result) return
    const next = { ...drafts }
    for (const q of questions) {
      if (!q.config.team_ids) continue
      if (isUnderdogQuestion(q)) {
        const qAnswers = answers.filter((a) => a.question_id === q.id)
        const pickedIds = qAnswers
          .map((a) => LALIGA_TEAMS_2026_27.find((t) => t.name === a.answer)?.id)
          .filter((id): id is string => !!id)
        const podium = computeUnderdogPodium(block1Result, pickedIds)
        next[q.id] = { gold: teamName(podium.gold), silver: teamName(podium.silver), bronze: teamName(podium.bronze) }
      } else {
        const worst = computeFiasco(block1Result, q.config.team_ids)
        next[q.id] = teamName(worst)
      }
    }
    setDrafts(next)
  }

  async function save() {
    setStatus(null)
    setSaving(true)
    for (const q of questions) {
      const draft = drafts[q.id]
      const underdog = isUnderdogQuestion(q)
      const isEmpty = underdog ? !(draft as { gold?: string })?.gold : !draft
      if (isEmpty) continue

      const { error: e1 } = await supabase.rpc('set_season_result', { p_question_id: q.id, p_result: draft })
      if (e1) {
        setStatus({ type: 'error', text: `Error en "${q.question.split(':')[0]}": ${e1.message}` })
        setSaving(false)
        return
      }

      if (underdog) {
        const names = draft as { gold: string; silver: string; bronze: string }
        const podium: UnderdogPodium = {
          gold: LALIGA_TEAMS_2026_27.find((t) => t.name === names.gold)?.id ?? null,
          silver: LALIGA_TEAMS_2026_27.find((t) => t.name === names.silver)?.id ?? null,
          bronze: LALIGA_TEAMS_2026_27.find((t) => t.name === names.bronze)?.id ?? null,
        }
        const qAnswers = answers.filter((a) => a.question_id === q.id)
        for (const a of qAnswers) {
          const pts = scoreUnderdogAnswer(podium, a.answer as string)
          const { error: pe } = await supabase.rpc('set_answer_points', { p_answer_id: a.id, p_points: pts })
          if (pe) {
            setStatus({ type: 'error', text: `Puntos de "${q.question.split(':')[0]}": ${pe.message}` })
            setSaving(false)
            await onChanged()
            return
          }
        }
      } else {
        const { error: e2 } = await supabase.rpc('apply_season_result_points', { p_question_id: q.id })
        if (e2) {
          setStatus({ type: 'error', text: `Puntos de "${q.question.split(':')[0]}": ${e2.message}` })
          setSaving(false)
          await onChanged()
          return
        }
      }
    }
    setSaving(false)
    setStatus({ type: 'ok', text: 'Bloque 2 guardado ✓' })
    await onChanged()
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusBanner status={status} />
      <div className="flex flex-col gap-4 rounded bg-gray-50 p-3">
        {questions.map((q) => {
          const teams = teamOptionsFor(q.config)
          const underdog = isUnderdogQuestion(q)
          return (
            <div key={q.id} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-gray-500">{q.question.split(':')[0]}</p>
              {q.config.player_choice ? (
                <PlayerSelect
                  value={(drafts[q.id] as string) ?? ''}
                  onChange={(name) => setDrafts((d) => ({ ...d, [q.id]: name }))}
                  excludeTeamIds={q.config.exclude_team_ids}
                  position={q.config.player_position}
                  nationality={q.config.player_nationality}
                />
              ) : q.config.team_ids && underdog ? (
                <div className="flex flex-wrap gap-3">
                  {(['gold', 'silver', 'bronze'] as const).map((tier) => {
                    const draft = (drafts[q.id] as { gold: string; silver: string; bronze: string }) ?? {
                      gold: '',
                      silver: '',
                      bronze: '',
                    }
                    const currentId = teams.find((t) => t.name === draft[tier])?.id ?? ''
                    return (
                      <div key={tier} className="flex items-center gap-1.5">
                        <span className="text-sm">{tier === 'gold' ? '🥇' : tier === 'silver' ? '🥈' : '🥉'}</span>
                        <TeamSelect
                          teams={teams}
                          value={currentId}
                          onChange={(id) =>
                            setDrafts((d) => ({
                              ...d,
                              [q.id]: { ...draft, [tier]: teams.find((t) => t.id === id)?.name ?? '' },
                            }))
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              ) : q.config.team_ids ? (
                <TeamSelect
                  teams={teams}
                  value={teams.find((t) => t.name === drafts[q.id])?.id ?? ''}
                  onChange={(id) => setDrafts((d) => ({ ...d, [q.id]: teams.find((t) => t.id === id)?.name ?? '' }))}
                />
              ) : null}
            </div>
          )
        })}
        <div className="mt-1 flex flex-wrap gap-2">
          <button
            onClick={computeFromClassification}
            disabled={!block1Result}
            title={!block1Result ? 'Primero fija la clasificación real en el Bloque 1' : undefined}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Calcular Fiasco / Underdog desde la clasificación
          </button>
          <button onClick={save} disabled={saving} className="rounded bg-brand-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          El Fiasco Europeo se calcula como el peor colocado de los equipos con Europa la temporada pasada. El Podio
          Underdog se calcula solo entre los equipos que algún participante haya elegido: si nadie eligió al que
          quedó mejor, el oro pasa al siguiente que sí haya elegido alguien (15 / 8 / 3 pts).
        </p>
      </div>

      {questions.map((q) => (
        <ManualPointsEditor key={q.id} question={q} answers={answers.filter((a) => a.question_id === q.id)} onChanged={onChanged} />
      ))}
    </div>
  )
}

// ---------------- Bloque 3: Duelos directos (marcadores) ----------------
function Block3Panel({
  questions,
  answers,
  results,
  onChanged,
}: {
  questions: SeasonQuestion[]
  answers: AnswerWithProfile[]
  results: SeasonResult[]
  onChanged: () => void
}) {
  const resultFor = (id: string) => results.find((r) => r.question_id === id)?.result as { home: number; away: number } | undefined

  const [drafts, setDrafts] = useState<Record<string, { home: number; away: number }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusById, setStatusById] = useState<Record<string, Status>>({})

  useEffect(() => {
    const init: Record<string, { home: number; away: number }> = {}
    for (const q of questions) init[q.id] = resultFor(q.id) ?? { home: 0, away: 0 }
    setDrafts(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => q.id).join(','), results.map((r) => r.resolved_at).join(',')])

  // Cada duelo se guarda por separado -- se van jugando en fechas distintas,
  // así que forzar un único "Guardar" para los 6 obligaría a fijar 0-0 (un
  // resultado real, no "sin jugar todavía") en los que aún no se han disputado.
  async function saveOne(q: SeasonQuestion) {
    setStatusById((s) => ({ ...s, [q.id]: null }))
    setSavingId(q.id)
    const draft = drafts[q.id] ?? { home: 0, away: 0 }
    const { error: e1 } = await supabase.rpc('set_season_result', { p_question_id: q.id, p_result: draft })
    if (e1) {
      setStatusById((s) => ({ ...s, [q.id]: { type: 'error', text: `No se pudo guardar: ${e1.message}` } }))
      setSavingId(null)
      return
    }
    const { error: e2 } = await supabase.rpc('apply_season_result_points', { p_question_id: q.id })
    setSavingId(null)
    if (e2) {
      setStatusById((s) => ({ ...s, [q.id]: { type: 'error', text: `Resultado guardado, pero fallaron los puntos: ${e2.message}` } }))
      await onChanged()
      return
    }
    setStatusById((s) => ({ ...s, [q.id]: { type: 'ok', text: 'Guardado ✓' } }))
    await onChanged()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded bg-gray-50 p-3">
        {questions.map((q) => {
          const draft = drafts[q.id] ?? { home: 0, away: 0 }
          const resolved = !!resultFor(q.id)
          return (
            <div key={q.id} className="flex flex-col gap-1 rounded bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TeamLabel name={q.config.home_team ?? 'Local'} align="right" />
                <ScoreStepper value={draft.home} onChange={(home) => setDrafts((d) => ({ ...d, [q.id]: { ...draft, home } }))} />
                <span className="shrink-0">-</span>
                <ScoreStepper value={draft.away} onChange={(away) => setDrafts((d) => ({ ...d, [q.id]: { ...draft, away } }))} />
                <TeamLabel name={q.config.away_team ?? 'Visitante'} />
                <button
                  onClick={() => saveOne(q)}
                  disabled={savingId === q.id}
                  className="ml-auto shrink-0 rounded bg-brand-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {savingId === q.id ? 'Guardando…' : resolved ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
              {/* Al guardar se puntúa solo automáticamente: no hace falta elegir
                  el 1x2 aparte, se deduce del marcador. Puntos fijos (no
                  dependen de "points" de la pregunta) -- ver apply_season_result_points. */}
              <p className="text-[11px] text-gray-400">
                ⚽ Solo 1x2: {SCORE_PREDICTION_1X2_POINTS} pts · 🎯 + marcador exacto: +{SCORE_PREDICTION_EXACT_BONUS} pts ({SCORE_PREDICTION_1X2_POINTS + SCORE_PREDICTION_EXACT_BONUS} en total)
              </p>
              <StatusBanner status={statusById[q.id] ?? null} />
            </div>
          )
        })}
      </div>

      {questions.map((q) => (
        <ManualPointsEditor key={q.id} question={q} answers={answers.filter((a) => a.question_id === q.id)} onChanged={onChanged} />
      ))}
    </div>
  )
}

// ---------------- Bloque 4: Sí / No ----------------
function Block4Panel({
  questions,
  answers,
  results,
  onChanged,
}: {
  questions: SeasonQuestion[]
  answers: AnswerWithProfile[]
  results: SeasonResult[]
  onChanged: () => void
}) {
  const resultFor = (id: string) => results.find((r) => r.question_id === id)?.result as string | undefined

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  useEffect(() => {
    const init: Record<string, string> = {}
    for (const q of questions) init[q.id] = resultFor(q.id) ?? ''
    setDrafts(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => q.id).join(','), results.map((r) => r.resolved_at).join(',')])

  async function save() {
    setStatus(null)
    setSaving(true)
    for (const q of questions) {
      const draft = drafts[q.id]
      if (!draft) continue
      const { error: e1 } = await supabase.rpc('set_season_result', { p_question_id: q.id, p_result: draft })
      if (e1) {
        setStatus({ type: 'error', text: `Error: ${e1.message}` })
        setSaving(false)
        return
      }
      const { error: e2 } = await supabase.rpc('apply_season_result_points', { p_question_id: q.id })
      if (e2) {
        setStatus({ type: 'error', text: `Puntos: ${e2.message}` })
        setSaving(false)
        await onChanged()
        return
      }
    }
    setSaving(false)
    setStatus({ type: 'ok', text: 'Bloque 4 guardado ✓' })
    await onChanged()
  }

  async function clearAll() {
    setConfirmClear(false)
    setStatus(null)
    setClearing(true)
    for (const q of questions) {
      if (!resultFor(q.id)) continue
      const { error } = await supabase.rpc('clear_season_result', { p_question_id: q.id })
      if (error) {
        setStatus({ type: 'error', text: `No se pudo limpiar: ${error.message}` })
        setClearing(false)
        return
      }
    }
    setClearing(false)
    setStatus({ type: 'ok', text: 'Resultado del Bloque 4 limpiado ✓' })
    await onChanged()
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusBanner status={status} />
      <div className="flex flex-col gap-4 rounded bg-gray-50 p-3">
        {questions.map((q) => (
          <div key={q.id} className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-gray-500">{q.question}</p>
            <div className="flex gap-2">
              {(q.config.options ?? ['Sí', 'No']).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDrafts((d) => ({ ...d, [q.id]: opt }))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    drafts[q.id] === opt ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex flex-wrap gap-2">
          <button onClick={save} disabled={saving} className="rounded bg-brand-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={() => setConfirmClear(true)}
            disabled={clearing}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
          >
            {clearing ? 'Limpiando…' : 'Limpiar resultado'}
          </button>
        </div>
      </div>

      {questions.map((q) => (
        <ManualPointsEditor key={q.id} question={q} answers={answers.filter((a) => a.question_id === q.id)} onChanged={onChanged} />
      ))}

      {confirmClear && (
        <ConfirmDialog
          title="Limpiar resultado"
          message="¿Borrar el resultado fijado de las preguntas del Bloque 4? Nadie aparecerá como acertante hasta que se vuelva a guardar."
          confirmLabel="Limpiar"
          danger
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}

// ---------------- Usuarios / admins ----------------
function UsersSection() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmToggle, setConfirmToggle] = useState<Profile | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<Profile | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('username')
    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleAdmin(u: Profile) {
    await supabase.rpc('set_user_admin', { p_user_id: u.id, p_is_admin: !u.is_admin })
    setConfirmToggle(null)
    await load()
  }

  async function removeUser(u: Profile) {
    setRemoveError(null)
    const { error } = await supabase.rpc('delete_user', { p_user_id: u.id })
    if (error) {
      setRemoveError(error.message)
      return
    }
    setConfirmRemove(null)
    await load()
  }

  // Yo mismo voy fijo arriba, sin ninguna acción disponible (ni cambiar mi
  // propio rol ni borrarme) -- el resto debajo, en el orden de siempre.
  const me = users.find((u) => u.id === currentUser?.id)
  const others = users.filter((u) => u.id !== currentUser?.id)

  function renderRow(u: Profile, isMe: boolean) {
    return (
      <tr key={u.id} className={`border-t border-gray-100 ${isMe ? 'bg-brand-50/40' : ''}`}>
        <td className="px-4 py-2">
          {u.username}
          {isMe && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">Tú</span>}
          {!u.email_confirmed && (
            <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">sin confirmar</span>
          )}
        </td>
        <td className="px-4 py-2">{u.is_admin ? 'Admin' : 'User'}</td>
        <td className="px-4 py-2 text-right">
          {!isMe && (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmToggle(u)}
                title={u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                aria-label={u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                className="rounded p-1 text-base hover:bg-gray-100"
              >
                🔄
              </button>
              <button
                onClick={() => setConfirmRemove(u)}
                title="Borrar"
                aria-label="Borrar"
                className="rounded p-1 text-base hover:bg-red-50"
              >
                🗑️
              </button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Usuarios</h2>
      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : (
        <table className="w-full overflow-hidden rounded border border-gray-200 bg-white text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {me && renderRow(me, true)}
            {others.map((u) => renderRow(u, false))}
          </tbody>
        </table>
      )}

      {confirmToggle && (
        <ConfirmDialog
          title="Cambiar rol"
          message={
            confirmToggle.is_admin
              ? `¿Quitar el rol de admin a ${confirmToggle.username}?`
              : `¿Hacer admin a ${confirmToggle.username}? Podrá gestionar usuarios, preguntas y puntuaciones.`
          }
          confirmLabel={confirmToggle.is_admin ? 'Quitar admin' : 'Hacer admin'}
          onConfirm={() => toggleAdmin(confirmToggle)}
          onCancel={() => setConfirmToggle(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Borrar usuario"
          message={
            removeError ??
            `¿Borrar a ${confirmRemove.username}? Se eliminan también todas sus apuestas. Esto no se puede deshacer.`
          }
          confirmLabel="Borrar"
          danger
          onConfirm={() => removeUser(confirmRemove)}
          onCancel={() => {
            setConfirmRemove(null)
            setRemoveError(null)
          }}
        />
      )}
    </section>
  )
}

// ---------------- Crear apuesta ----------------
function CreateQuestionSection({ lockedPhase }: { lockedPhase?: QuestionPhase }) {
  const [competition, setCompetition] = useState('liga')
  const [question, setQuestion] = useState('')
  const [answerType, setAnswerType] = useState<AnswerType>('text')
  const [phase, setPhase] = useState<QuestionPhase>(lockedPhase ?? 'weekly')
  const [points, setPoints] = useState(1)
  const [closesAt, setClosesAt] = useState('')
  const [config, setConfig] = useState<QuestionConfig>({})
  const [block, setBlock] = useState('')
  const [recent, setRecent] = useState<SeasonQuestion[]>([])

  async function loadRecent() {
    const { data } = await supabase
      .from('season_questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    const all = (data as SeasonQuestion[]) ?? []
    setRecent((lockedPhase ? all.filter((q) => q.phase === lockedPhase) : all).slice(0, 8))
  }

  useEffect(() => {
    loadRecent()
  }, [])

  async function addQuestion() {
    if (!question.trim()) return
    await supabase.from('season_questions').insert({
      competition,
      question,
      answer_type: answerType,
      phase,
      block: phase === 'initial' && block !== '' ? Number(block) : null,
      config,
      points,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    })
    setQuestion('')
    setPoints(1)
    setClosesAt('')
    setConfig({})
    setAnswerType('text')
    setBlock('')
    await loadRecent()
  }

  async function deleteQuestion(q: SeasonQuestion) {
    if (!confirm(`¿Borrar "${q.question}"? Se eliminan también todas las respuestas dadas. Esto no se puede deshacer.`)) return
    await supabase.from('season_questions').delete().eq('id', q.id)
    await loadRecent()
  }

  return (
    <section>
      <p className="mb-2 text-sm text-gray-500">
        {lockedPhase === 'initial' ? (
          <>Bloques iniciales: preguntas fijas desde el principio de temporada (Clasificación, premios, etc.).</>
        ) : lockedPhase === 'weekly' ? (
          <>Apuestas flash: preguntas que vas añadiendo durante la temporada ligadas a un partido/jornada.</>
        ) : (
          <>
            El resto de preguntas (texto, opción o predicción de resultado) se crean aquí. Márcalas como
            <strong> Inicial</strong> si son fijas desde el principio, o <strong>Semana</strong> si las vas añadiendo
            durante la temporada ligadas a un partido/jornada.
          </>
        )}
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <select value={competition} onChange={(e) => setCompetition(e.target.value)} className="rounded border border-gray-300 px-2 py-2 text-sm">
            <option value="liga">Liga</option>
            <option value="champions">Champions</option>
            <option value="otros">Otros</option>
          </select>
          {!lockedPhase && (
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as QuestionPhase)}
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="weekly">Semana</option>
              <option value="initial">Inicial</option>
            </select>
          )}
          {phase === 'initial' && (
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              title="Bloque del formulario inicial"
              className="rounded border border-gray-300 px-2 py-2 text-sm"
            >
              <option value="">Sin bloque</option>
              <option value="1">Bloque 1</option>
              <option value="2">Bloque 2</option>
              <option value="3">Bloque 3</option>
              <option value="4">Bloque 4</option>
            </select>
          )}
          <select
            value={answerType}
            onChange={(e) => {
              setAnswerType(e.target.value as AnswerType)
              setConfig({})
            }}
            className="rounded border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="text">Texto libre</option>
            <option value="choice">Elegir una opción</option>
            <option value="score_prediction">Predicción de resultado</option>
          </select>
          <input
            type="text"
            placeholder="Pregunta"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-w-[220px] flex-1 rounded border border-gray-300 px-2 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            title="Puntos (orientativo, o los que se aplican automáticamente si acierta)"
            className="w-20 rounded border border-gray-300 px-2 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="rounded border border-gray-300 px-2 py-2 text-sm"
          />
        </div>

        <ConfigBuilder answerType={answerType} config={config} onChange={setConfig} />

        <button
          onClick={addQuestion}
          className="self-start rounded bg-brand-700 px-3 py-2 text-sm font-medium text-white"
        >
          Añadir pregunta
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">Últimas creadas</p>
        <div className="flex flex-col gap-1.5">
          {recent.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white p-2.5 text-sm">
              <span>
                <span className={`mr-1 rounded px-1.5 py-0.5 text-xs ${q.phase === 'initial' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                  {q.phase === 'initial' ? 'Inicial' : 'Semana'}
                </span>
                [{q.competition}] {q.question} · <span className="text-gray-400">{q.answer_type}</span> ({q.points} pts)
              </span>
              <button
                onClick={() => deleteQuestion(q)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Borrar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------- Constructor de config según el tipo de pregunta ----------------
function ConfigBuilder({
  answerType,
  config,
  onChange,
}: {
  answerType: AnswerType
  config: QuestionConfig
  onChange: (c: QuestionConfig) => void
}) {
  if (answerType === 'choice') {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={!!config.player_choice}
            onChange={(e) => onChange({ ...config, player_choice: e.target.checked || undefined })}
          />
          Buscador de jugador (en vez de opciones de texto)
        </label>
        {config.player_choice ? (
          <>
            <input
              type="text"
              placeholder="Ids de equipos a excluir, separados por coma (opcional, p.ej. real-madrid,barcelona,atletico-madrid)"
              defaultValue={(config.exclude_team_ids ?? []).join(',')}
              onBlur={(e) =>
                onChange({
                  ...config,
                  exclude_team_ids: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
            <select
              value={config.player_position ?? ''}
              onChange={(e) =>
                onChange({ ...config, player_position: (e.target.value || undefined) as QuestionConfig['player_position'] })
              }
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Cualquier posición</option>
              <option value="POR">Solo porteros</option>
              <option value="DEF">Solo defensas</option>
              <option value="MED">Solo centrocampistas</option>
              <option value="DEL">Solo delanteros</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={config.player_nationality === 'ES'}
                onChange={(e) => onChange({ ...config, player_nationality: e.target.checked ? 'ES' : undefined })}
              />
              Solo jugadores españoles (p.ej. Trofeo Zarra)
            </label>
          </>
        ) : (
          <OptionsBuilder
            options={config.options ?? []}
            onChange={(opts) => onChange({ ...config, options: opts })}
          />
        )}
      </div>
    )
  }

  if (answerType === 'score_prediction') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Equipo local"
          value={config.home_team ?? ''}
          onChange={(e) => onChange({ ...config, home_team: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-gray-400">vs</span>
        <input
          type="text"
          placeholder="Equipo visitante"
          value={config.away_team ?? ''}
          onChange={(e) => onChange({ ...config, away_team: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
    )
  }

  return null
}

function OptionsBuilder({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva opción"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return
            onChange([...options, draft.trim()])
            setDraft('')
          }}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          Añadir opción
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs">
            {opt}
            <button type="button" onClick={() => onChange(options.filter((_, idx) => idx !== i))} className="text-gray-400">
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------- Resolver apuestas ----------------
function ResolveQuestionsSection({ lockedPhase }: { lockedPhase?: QuestionPhase }) {
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [answers, setAnswers] = useState<(SeasonAnswer & { profile?: Profile })[]>([])
  const [results, setResults] = useState<SeasonResult[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | QuestionPhase>('all')

  async function load() {
    const [{ data: qs }, { data: as_ }, { data: rs }] = await Promise.all([
      supabase.from('season_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('season_answers').select('*, profile:profiles(*)'),
      supabase.from('season_results').select('*'),
    ])
    setQuestions((qs as SeasonQuestion[]) ?? [])
    setAnswers((as_ as (SeasonAnswer & { profile?: Profile })[]) ?? [])
    setResults((rs as SeasonResult[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const visible = questions.filter((q) => (lockedPhase ? q.phase === lockedPhase : filter === 'all' || q.phase === filter))
  const resolvedCount = visible.filter((q) => results.some((r) => r.question_id === q.id)).length

  return (
    <section>
      {lockedPhase ? (
        visible.length > 0 && (
          <p className="mb-3 text-xs font-medium text-gray-500">
            {resolvedCount} / {visible.length} resueltas
          </p>
        )
      ) : (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="text-gray-500">Filtrar:</span>
          {(['all', 'initial', 'weekly'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 ${filter === f ? 'border-brand-700 bg-brand-700 text-white' : 'border-gray-300 text-gray-600'}`}
            >
              {f === 'all' ? 'Todas' : f === 'initial' ? 'Iniciales' : 'Semana'}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {visible.length === 0 && <p className="text-sm text-gray-400">No hay preguntas.</p>}
        {visible.map((q) => {
          const qAnswers = answers.filter((a) => a.question_id === q.id)
          const qResult = results.find((r) => r.question_id === q.id)
          const isOpen = expanded === q.id
          return (
            <div key={q.id} className="rounded border border-gray-200 bg-white text-sm">
              <button
                onClick={() => setExpanded(isOpen ? null : q.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left"
              >
                <span>
                  <span className={`mr-1 rounded px-1.5 py-0.5 text-xs ${q.phase === 'initial' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                    {q.phase === 'initial' ? 'Inicial' : 'Semana'}
                  </span>
                  <span className={`mr-1 rounded px-1.5 py-0.5 text-xs ${qResult ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {qResult ? 'Resuelta' : 'Pendiente'}
                  </span>
                  [{q.competition}] {q.question} · <span className="text-gray-400">{q.answer_type}</span> ({q.points} pts)
                  {' · '}
                  {qAnswers.length} respuesta{qAnswers.length === 1 ? '' : 's'}
                </span>
                <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 p-3">
                  <GradingPanel question={q} answers={qAnswers} result={qResult} onChanged={load} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------- Calificación: resultado real + puntos por usuario ----------------
function GradingPanel({
  question,
  answers,
  result,
  onChanged,
}: {
  question: SeasonQuestion
  answers: (SeasonAnswer & { profile?: Profile })[]
  result?: SeasonResult
  onChanged: () => void
}) {
  const emptyResult = (): AnswerValue =>
    question.answer_type === 'score_prediction' ? { home: 0, away: 0 } : question.answer_type === 'ranking' ? {} : ''

  const [resultDraft, setResultDraft] = useState<AnswerValue>(result?.result ?? emptyResult())
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [laligaLoading, setLaligaLoading] = useState(false)

  // Si el resultado guardado en el servidor cambia (p.ej. tras "Fijar
  // resultado" y el recarga que dispara onChanged), sincroniza el borrador
  // para que se vea reflejado -- si no, la rejilla se queda igual visualmente
  // aunque el guardado haya funcionado y parece que "no ha hecho nada".
  useEffect(() => {
    setResultDraft(result?.result ?? emptyResult())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.resolved_at])

  function rpcErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
    return err instanceof Error ? err.message : fallback
  }

  async function saveResult() {
    setStatus(null)
    const { error } = await supabase.rpc('set_season_result', { p_question_id: question.id, p_result: resultDraft })
    if (error) {
      setStatus({ type: 'error', text: `No se pudo fijar el resultado: ${rpcErrorMessage(error, 'error desconocido')}` })
      return
    }
    setStatus({ type: 'ok', text: 'Resultado fijado ✓' })
    await onChanged()
  }

  async function autoApply() {
    setStatus(null)
    const { error } = await supabase.rpc('apply_season_result_points', { p_question_id: question.id })
    if (error) {
      setStatus({ type: 'error', text: `No se pudo auto-aplicar: ${rpcErrorMessage(error, 'error desconocido')}` })
      return
    }
    setStatus({ type: 'ok', text: 'Puntos auto-aplicados ✓' })
    await onChanged()
  }

  async function saveAnswerPoints(answerId: string) {
    const raw = pointsDrafts[answerId]
    if (raw === undefined || raw === '') return
    const { error } = await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
    if (error) {
      setStatus({ type: 'error', text: `No se pudo guardar: ${rpcErrorMessage(error, 'error desconocido')}` })
      return
    }
    await onChanged()
  }

  function calculateRankingSuggestions() {
    const real = resultDraft as Record<string, number>
    const drafts: Record<string, string> = {}
    for (const a of answers) {
      drafts[a.id] = String(scoreRankingAnswer(real, (a.answer as Record<string, number>) ?? {}))
    }
    setPointsDrafts(drafts)
  }

  // Trae la clasificación real actual desde laliga.com (vía nuestro proxy en
  // /api/laliga-standings) y rellena la rejilla de arriba para que el admin
  // la revise y pulse "Fijar resultado" como siempre -- no guarda nada solo.
  async function fetchStandingsFromLaliga() {
    setStatus(null)
    setLaligaLoading(true)
    try {
      const resp = await fetch('/api/laliga-standings')
      const data = (await resp.json()) as { positions?: Record<string, number>; unmapped?: string[]; error?: string }
      if (!resp.ok || !data.positions) throw new Error(data.error ?? `El proxy respondió ${resp.status}`)
      setResultDraft(data.positions)
      const extra = data.unmapped && data.unmapped.length > 0 ? ` (sin mapear: ${data.unmapped.join(', ')})` : ''
      setStatus({ type: 'ok', text: `Clasificación traída de LaLiga.com${extra} — revisa y pulsa "Fijar resultado"` })
    } catch (err) {
      setStatus({ type: 'error', text: `No se pudo traer de LaLiga.com: ${err instanceof Error ? err.message : 'error desconocido'}` })
    } finally {
      setLaligaLoading(false)
    }
  }

  async function saveAllDrafts() {
    setSaving(true)
    setStatus(null)
    const entries = Object.entries(pointsDrafts).filter(([, v]) => v !== '')
    for (const [answerId, raw] of entries) {
      const { error } = await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
      if (error) {
        setStatus({ type: 'error', text: `No se pudo guardar todo: ${rpcErrorMessage(error, 'error desconocido')}` })
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setStatus({ type: 'ok', text: 'Todos los puntos guardados ✓' })
    await onChanged()
  }

  // Ordena las respuestas de texto/opción por su forma normalizada (sin mayúsculas
  // ni tildes) para que las variantes de una misma respuesta queden juntas y sea
  // más fácil calificarlas todas a la vez.
  const sortedAnswers = [...answers].sort((a, b) =>
    normalizeText(formatAnswer(question, a.answer)).localeCompare(normalizeText(formatAnswer(question, b.answer)))
  )

  const supportsAutoApply = question.answer_type === 'text' || question.answer_type === 'choice' || question.answer_type === 'score_prediction'

  return (
    <div className="flex flex-col gap-4">
      {status && (
        <p className={`rounded px-3 py-2 text-xs font-medium ${status.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {status.text}
        </p>
      )}

      {question.answer_type === 'ranking' && (
        <div className="rounded bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Clasificación real (para calcular los puntos sugeridos del Bloque 1)
          </p>
          <RankingAnswer
            items={question.config.items ?? []}
            tiers={question.config.tiers ?? []}
            value={(resultDraft as Record<string, number>) ?? {}}
            onChange={(next) => setResultDraft(next)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={saveResult} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
              Fijar resultado
            </button>
            <button onClick={calculateRankingSuggestions} className="rounded bg-brand-700 px-3 py-1.5 text-sm text-white">
              Calcular puntos sugeridos
            </button>
            <button
              onClick={fetchStandingsFromLaliga}
              disabled={laligaLoading}
              className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {laligaLoading ? 'Trayendo…' : 'Actualizar desde LaLiga.com'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Ya incluye el bonus por pleno de zona (Champions +3, Europa League +3, Descenso +5, sin importar el orden
            interno). Esta clasificación también es la que ven los usuarios en Información › Clasificación actual, y
            la que compara cada equipo (✓/✗) en Mis apuestas y Apuestas detalladas -- se puede volver a fijar cuantas
            veces haga falta según avance la temporada. "Actualizar desde LaLiga.com" solo rellena la rejilla de
            arriba con la clasificación real actual, no guarda nada por sí solo: revisa y pulsa "Fijar resultado".
          </p>
        </div>
      )}

      {supportsAutoApply && (
        <div className="rounded bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">Resultado real (para aplicar puntos automáticamente)</p>
          {question.answer_type === 'score_prediction' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={(resultDraft as { home: number; away: number })?.home ?? 0}
                onChange={(e) =>
                  setResultDraft((d) => ({
                    ...(d as { home: number; away: number }),
                    home: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                value={(resultDraft as { home: number; away: number })?.away ?? 0}
                onChange={(e) =>
                  setResultDraft((d) => ({
                    ...(d as { home: number; away: number }),
                    away: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
              />
            </div>
          ) : question.answer_type === 'choice' && question.config.player_choice ? (
            <PlayerSelect
              value={(resultDraft as string) ?? ''}
              onChange={(name) => setResultDraft(name)}
              excludeTeamIds={question.config.exclude_team_ids}
              position={question.config.player_position}
              nationality={question.config.player_nationality}
            />
          ) : question.answer_type === 'choice' ? (
            <select
              value={(resultDraft as string) ?? ''}
              onChange={(e) => setResultDraft(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Elige…</option>
              {(question.config.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={(resultDraft as string) ?? ''}
              onChange={(e) => setResultDraft(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={saveResult} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
              Fijar resultado
            </button>
            <button onClick={autoApply} className="rounded bg-brand-700 px-3 py-1.5 text-sm text-white">
              Auto-aplicar puntos a quien acertó
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">Respuestas y puntos (puedes ajustarlos a mano)</p>
          {Object.keys(pointsDrafts).length > 0 && (
            <button onClick={saveAllDrafts} disabled={saving} className="text-xs text-brand-700 hover:underline disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar todas'}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {answers.length === 0 && <p className="text-sm text-gray-400">Nadie ha respondido todavía.</p>}
          {sortedAnswers.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 px-3 py-2 text-sm">
              <span>
                <strong>{a.profile?.username ?? '—'}</strong>: {formatAnswer(question, a.answer)}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={a.points != null ? String(a.points) : 'pts'}
                  value={pointsDrafts[a.id] ?? ''}
                  onChange={(e) => setPointsDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                />
                <button onClick={() => saveAnswerPoints(a.id)} className="text-brand-700 hover:underline">
                  Guardar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------- Jugadores fantasy (alta manual, sin API) ----------------
// Formato: Nombre;POSICION;AAAA-MM-DD;id_equipo;nacionalidad;photo_url;nombre_completo
// Los últimos 3 campos son opcionales — se puede dejar un hueco vacío entre
// punto y coma para saltarse uno y rellenar el siguiente (p.ej.
// "Nombre;POR;1990-01-01;sevilla;;https://foto.jpg" salta la nacionalidad
// pero sí trae foto). Nombre y nombre_completo no se tocan si vienen vacíos.
const BULK_MIN_FIELDS = 4
const POSITIONS = ['POR', 'DEF', 'MED', 'DEL']

function FantasyPlayersSection() {
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkText, setBulkText] = useState('')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showTeamIds, setShowTeamIds] = useState(false)
  const [lastImportSummary, setLastImportSummary] = useState<string | null>(null)
  const [laligaSelected, setLaligaSelected] = useState<string[]>([])
  const [laligaLoading, setLaligaLoading] = useState(false)
  const [laligaErrors, setLaligaErrors] = useState<string[]>([])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('fantasy_players').select('*').order('name')
    setPlayers((data as FantasyPlayer[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function toggleLaligaTeam(teamId: string) {
    setLaligaSelected((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]))
  }

  // Trae las plantillas seleccionadas desde la API pública de laliga.com (vía
  // nuestro proxy en /api/laliga-players, que evita el problema de CORS y no
  // expone la clave en el navegador) y rellena el textarea de abajo con el
  // mismo formato que ya entiende parseBulk — no se guarda nada solo, el
  // usuario revisa y pulsa "Importar jugadores" como siempre.
  async function fetchFromLaliga() {
    if (laligaSelected.length === 0) return
    setLaligaLoading(true)
    setLaligaErrors([])
    try {
      const resp = await fetch(`/api/laliga-players?teams=${laligaSelected.join(',')}`)
      if (!resp.ok) throw new Error(`El proxy respondió ${resp.status}`)
      const data = (await resp.json()) as {
        results: Record<
          string,
          | { ok: true; players: { name: string; full_name: string | null; player_position: string; birth_date: string | null; nationality: string | null; photo_url: string | null }[] }
          | { ok: false; error: string }
        >
      }
      const lines: string[] = []
      const errors: string[] = []
      for (const teamId of laligaSelected) {
        const teamName = LALIGA_TEAMS_2026_27.find((t) => t.id === teamId)?.name ?? teamId
        const entry = data.results[teamId]
        if (!entry) {
          errors.push(`${teamName}: sin respuesta del proxy`)
          continue
        }
        if (!entry.ok) {
          errors.push(`${teamName}: ${entry.error}`)
          continue
        }
        for (const p of entry.players) {
          if (!p.birth_date) {
            errors.push(`${teamName}: "${p.name}" no trae fecha de nacimiento, se omite (añádelo a mano si hace falta)`)
            continue
          }
          lines.push(
            `${p.name};${p.player_position};${p.birth_date};${teamId};${p.nationality ?? ''};${p.photo_url ?? ''};${p.full_name ?? ''}`
          )
        }
      }
      setBulkText(lines.join('\n'))
      setLaligaErrors(errors)
    } catch (err) {
      setLaligaErrors([err instanceof Error ? err.message : 'Error desconocido al conectar con laliga.com'])
    } finally {
      setLaligaLoading(false)
    }
  }

  function parseBulk(): { rows: Omit<FantasyPlayer, 'api_player_id' | 'eligible_abuelonchos'>[]; errors: string[] } {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    const rows: Omit<FantasyPlayer, 'api_player_id' | 'eligible_abuelonchos'>[] = []
    const errors: string[] = []

    lines.forEach((line, i) => {
      const parts = line.split(';').map((p) => p.trim())
      if (parts.length < BULK_MIN_FIELDS) {
        errors.push(
          `Línea ${i + 1}: formato incorrecto (usa Nombre;POSICION;AAAA-MM-DD;id_equipo;nacionalidad;photo_url;nombre_completo): "${line}"`
        )
        return
      }
      const [name, posRaw, birthDate, teamIdRaw, nationalityRaw, photoUrlRaw, fullNameRaw] = parts
      const position = posRaw.toUpperCase()
      if (!POSITIONS.includes(position)) {
        errors.push(`Línea ${i + 1}: posición "${posRaw}" no válida (usa POR, DEF, MED o DEL): "${line}"`)
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        errors.push(`Línea ${i + 1}: fecha de nacimiento "${birthDate}" no tiene formato AAAA-MM-DD: "${line}"`)
        return
      }
      const teamId = teamIdRaw.toLowerCase()
      const team = LALIGA_TEAMS_2026_27.find((t) => t.id === teamId)
      if (!team) {
        errors.push(`Línea ${i + 1}: id de equipo "${teamIdRaw}" no reconocido, mira la lista de ids más abajo`)
        return
      }
      rows.push({
        name,
        player_position: position as FantasyPosition,
        birth_date: birthDate,
        team_id: team.id,
        api_team_id: null,
        photo_url: photoUrlRaw || null,
        nationality: nationalityRaw || null,
        full_name: fullNameRaw || null,
        active: true,
      })
    })

    return { rows, errors }
  }

  async function importBulk() {
    const { rows, errors } = parseBulk()
    setParseErrors(errors)
    if (errors.length > 0 || rows.length === 0) return

    setSaving(true)

    // Re-sincronizado inteligente: no es solo alta. Si un jugador pegado ya
    // existe (mismo nombre normalizado + mismo equipo), se actualiza en vez
    // de duplicarlo. Y para cada equipo que aparezca en el texto pegado, los
    // jugadores que YA estaban en ese equipo pero no vienen en esta nueva
    // lista se marcan inactivos (no se borran, para no perder puntos ya
    // acumulados en fantasy_player_stats) — así sirve para resincronizar
    // plantillas en ventana de fichajes pegando la lista actualizada.
    const { data: existingData } = await supabase.from('fantasy_players').select('*')
    const existing = (existingData as FantasyPlayer[] | null) ?? []
    const keyOf = (name: string, teamId: string | null) => `${normalizeText(name)}|${teamId ?? ''}`
    const existingByKey = new Map(existing.map((p) => [keyOf(p.name, p.team_id), p]))

    const teamsInPaste = new Set(rows.map((r) => r.team_id))
    const matchedIds = new Set<number>()
    const toInsert: (Omit<FantasyPlayer, 'api_player_id' | 'eligible_abuelonchos'> & { api_player_id: number })[] = []
    const toUpdate: {
      api_player_id: number
      player_position: FantasyPosition
      birth_date: string | null
      nationality: string | null
      photo_url: string | null
      full_name: string | null
      active: boolean
    }[] = []

    // IDs sintéticos (sin API real todavía): seguimos a partir del mayor id
    // ya usado en el rango reservado 9.000.000+ para altas manuales, para no
    // chocar el día que se conecte una API real (esa usaría ids más bajos).
    const { data: maxIdData } = await supabase
      .from('fantasy_players')
      .select('api_player_id')
      .gte('api_player_id', 9000000)
      .order('api_player_id', { ascending: false })
      .limit(1)
    let nextId = ((maxIdData as { api_player_id: number }[] | null)?.[0]?.api_player_id ?? 9000000) + 1

    for (const r of rows) {
      const match = existingByKey.get(keyOf(r.name, r.team_id))
      if (match) {
        matchedIds.add(match.api_player_id)
        toUpdate.push({
          api_player_id: match.api_player_id,
          player_position: r.player_position,
          birth_date: r.birth_date,
          // Los campos opcionales (nacionalidad, foto, nombre completo): si
          // la línea pegada no los trae, se conserva lo que ya hubiera en
          // vez de borrarlo — así una lista con menos campos no destruye
          // datos que ya se habían cargado en una importación anterior.
          nationality: r.nationality ?? match.nationality,
          photo_url: r.photo_url ?? match.photo_url,
          full_name: r.full_name ?? match.full_name,
          active: true,
        })
      } else {
        toInsert.push({ ...r, api_player_id: nextId++ })
      }
    }

    // De los equipos que aparecen en el texto pegado, quien ya no está en la
    // lista se marca inactivo (ya no es elegible, pero conserva histórico).
    const toDeactivate = existing.filter(
      (p) => p.team_id != null && teamsInPaste.has(p.team_id) && p.active && !matchedIds.has(p.api_player_id)
    )

    if (toInsert.length > 0) {
      const { error } = await supabase.from('fantasy_players').insert(toInsert)
      if (error) {
        setSaving(false)
        setParseErrors([error.message])
        return
      }
    }
    for (const u of toUpdate) {
      const { error } = await supabase
        .from('fantasy_players')
        .update({
          player_position: u.player_position,
          birth_date: u.birth_date,
          nationality: u.nationality,
          photo_url: u.photo_url,
          full_name: u.full_name,
          active: u.active,
        })
        .eq('api_player_id', u.api_player_id)
      if (error) {
        setSaving(false)
        setParseErrors([error.message])
        return
      }
    }
    if (toDeactivate.length > 0) {
      const { error } = await supabase
        .from('fantasy_players')
        .update({ active: false })
        .in('api_player_id', toDeactivate.map((p) => p.api_player_id))
      if (error) {
        setSaving(false)
        setParseErrors([error.message])
        return
      }
    }

    setSaving(false)
    setBulkText('')
    setLastImportSummary(
      `${toInsert.length} nuevos · ${toUpdate.length} actualizados · ${toDeactivate.length} marcados inactivos`
    )
    await load()
  }

  async function removePlayer(p: FantasyPlayer) {
    if (!confirm(`¿Borrar a ${p.name}? Esto no se puede deshacer.`)) return
    await supabase.from('fantasy_players').delete().eq('api_player_id', p.api_player_id)
    await load()
  }

  const filtered = search.trim()
    ? players.filter((p) => normalizeText(p.name).includes(normalizeText(search)))
    : players

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Importar desde LaLiga.com</p>
        <p className="mb-3 text-xs text-gray-500">
          Elige uno o varios equipos y trae su plantilla real (nombre, posición, nacimiento, nacionalidad y foto)
          directamente de laliga.com. Rellena el texto de abajo para que lo revises antes de pulsar "Importar
          jugadores", no se guarda nada automáticamente.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LALIGA_TEAMS_2026_27.map((t) => {
            const selected = laligaSelected.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleLaligaTeam(t.id)}
                title={t.name}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
                  selected ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.badge && <img src={t.badge} alt="" className="h-4 w-4 object-contain" />}
                {t.name}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setLaligaSelected(LALIGA_TEAMS_2026_27.map((t) => t.id))}
            className="text-xs text-brand-700 hover:underline"
          >
            Seleccionar todos
          </button>
          {laligaSelected.length > 0 && (
            <button type="button" onClick={() => setLaligaSelected([])} className="text-xs text-brand-700 hover:underline">
              Quitar selección
            </button>
          )}
          <button
            type="button"
            onClick={fetchFromLaliga}
            disabled={laligaLoading || laligaSelected.length === 0}
            className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {laligaLoading ? 'Trayendo…' : `Traer de LaLiga (${laligaSelected.length})`}
          </button>
        </div>
        {laligaErrors.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded bg-amber-50 p-2 text-xs text-amber-800">
            {laligaErrors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          placeholder={'Sergio Ramos;DEF;1986-03-30;sevilla;Spain\nDani Parejo;MED;1989-04-16;villarreal;Spain'}
          className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={importBulk}
            disabled={saving || !bulkText.trim()}
            className="rounded bg-brand-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Importando…' : 'Importar jugadores'}
          </button>
          <button type="button" onClick={() => setShowTeamIds((v) => !v)} className="text-xs text-brand-700 hover:underline">
            {showTeamIds ? 'Ocultar ids de equipo' : 'Ver ids de equipo'}
          </button>
        </div>

        {showTeamIds && (
          <p className="mt-2 text-xs text-gray-500">
            {LALIGA_TEAMS_2026_27.map((t) => `${t.name} → ${t.id}`).join(' · ')}
          </p>
        )}

        {parseErrors.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded bg-red-50 p-2 text-xs text-red-700">
            {parseErrors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}

        {lastImportSummary && parseErrors.length === 0 && (
          <p className="mt-2 rounded bg-green-50 p-2 text-xs text-green-700">{lastImportSummary}</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-500">
            Jugadores cargados ({players.length})
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-48 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.length === 0 && <p className="text-sm text-gray-400">Todavía no hay jugadores cargados.</p>}
            {filtered.map((p) => {
              const team = LALIGA_TEAMS_2026_27.find((t) => t.id === p.team_id)
              return (
                <div key={p.api_player_id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-gray-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {team?.badge && <img src={team.badge} alt="" className="h-5 w-5 object-contain" />}
                    <strong>{p.name}</strong>
                    <span className="text-xs text-gray-400">
                      {FANTASY_POSITION_LABELS[p.player_position]} · {team?.name ?? p.team_id} · {p.birth_date}
                    </span>
                    {p.eligible_abuelonchos && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Veterano 👴</span>
                    )}
                  </span>
                  <button onClick={() => removePlayer(p)} className="text-xs text-red-600 hover:underline">
                    Borrar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------- Puntuación fantasy (por jornada) ----------------

interface FantasyStatRow {
  minutes: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  own_goals: number
  clean_sheet: boolean
}

const EMPTY_FANTASY_ROW: FantasyStatRow = {
  minutes: 0,
  goals: 0,
  assists: 0,
  yellow_cards: 0,
  red_cards: 0,
  own_goals: 0,
  clean_sheet: false,
}

// Entrada manual de estadísticas por jornada. La lista de jugadores no es
// "todos los elegibles para Abuelonchos" (esos son decenas por equipo, la
// mayoría sin puntuar nunca) sino solo los que algún participante ha
// puesto realmente en su 11 — se sacan de fantasy_lineup_players cruzando
// con los lineups en modo 'abuelonchos'. Los puntos los calcula el trigger
// de BD (fantasy_calculate_points) al guardar; aquí también se
// previsualizan con la misma fórmula duplicada en src/lib/fantasyScoring.ts,
// para ver el resultado antes de pulsar "Guardar".
//
// El botón de "traer resultados automáticamente" (API-Football) se deja
// pendiente a propósito: hace falta decidir antes si hay cuenta/plan
// contratado (el endpoint de estadísticas por partido no suele ser
// gratuito) y cómo mapear cada partido a la jornada correcta. Hasta
// entonces, esta vía manual es la fuente de verdad.
function FantasyStatsSection() {
  const [players, setPlayers] = useState<FantasyPlayer[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [matchdayNum, setMatchdayNum] = useState(1)
  const [rows, setRows] = useState<Record<number, FantasyStatRow>>({})
  const [savedPoints, setSavedPoints] = useState<Record<number, number>>({})
  const [matchday, setMatchday] = useState<FantasyMatchday | null>(null)
  const [loadingMatchday, setLoadingMatchday] = useState(false)
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null)
  const [savingMatchday, setSavingMatchday] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlayers() {
      setLoadingPlayers(true)
      const { data: lineups } = await supabase.from('fantasy_lineups').select('id').eq('mode', 'abuelonchos')
      const lineupIds = ((lineups as { id: string }[]) ?? []).map((l) => l.id)

      let pickedIds = new Set<number>()
      if (lineupIds.length > 0) {
        const { data: picks } = await supabase
          .from('fantasy_lineup_players')
          .select('player_id')
          .in('lineup_id', lineupIds)
        pickedIds = new Set(((picks as { player_id: number }[]) ?? []).map((p) => p.player_id))
      }

      if (pickedIds.size === 0) {
        setPlayers([])
        setLoadingPlayers(false)
        return
      }

      const { data } = await supabase
        .from('fantasy_players')
        .select('*')
        .in('api_player_id', [...pickedIds])
        .order('player_position')
        .order('name')
      setPlayers((data as FantasyPlayer[]) ?? [])
      setLoadingPlayers(false)
    }
    loadPlayers()
  }, [])

  async function loadMatchday(num: number) {
    setLoadingMatchday(true)
    setMessage(null)
    const [{ data: statsData }, { data: mdData }] = await Promise.all([
      supabase.from('fantasy_player_stats').select('*').eq('matchday_num', num),
      supabase.from('fantasy_matchdays').select('*').eq('number', num).maybeSingle(),
    ])
    const nextRows: Record<number, FantasyStatRow> = {}
    const nextPoints: Record<number, number> = {}
    for (const s of (statsData as FantasyPlayerStats[]) ?? []) {
      nextRows[s.player_id] = {
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        yellow_cards: s.yellow_cards,
        red_cards: s.red_cards,
        own_goals: s.own_goals,
        clean_sheet: s.clean_sheet,
      }
      nextPoints[s.player_id] = s.points
    }
    setRows(nextRows)
    setSavedPoints(nextPoints)
    setMatchday((mdData as FantasyMatchday) ?? null)
    setLoadingMatchday(false)
  }

  useEffect(() => {
    loadMatchday(matchdayNum)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchdayNum])

  function rowFor(playerId: number): FantasyStatRow {
    return rows[playerId] ?? EMPTY_FANTASY_ROW
  }

  function updateRow(playerId: number, patch: Partial<FantasyStatRow>) {
    setRows((r) => ({ ...r, [playerId]: { ...rowFor(playerId), ...patch } }))
  }

  async function saveRow(player: FantasyPlayer) {
    setSavingPlayerId(player.api_player_id)
    setMessage(null)
    const row = rowFor(player.api_player_id)
    const { data, error } = await supabase
      .from('fantasy_player_stats')
      .upsert(
        {
          matchday_num: matchdayNum,
          player_id: player.api_player_id,
          player_position: player.player_position,
          ...row,
        },
        { onConflict: 'matchday_num,player_id' }
      )
      .select('points')
      .single()
    setSavingPlayerId(null)
    if (error) {
      setMessage(`Error guardando ${player.name}: ${error.message}`)
      return
    }
    setSavedPoints((p) => ({ ...p, [player.api_player_id]: (data as { points: number }).points }))
  }

  async function toggleMatchdayPlayed() {
    setSavingMatchday(true)
    setMessage(null)
    const nextPlayed = !(matchday?.played ?? false)
    const { data, error } = await supabase
      .from('fantasy_matchdays')
      .upsert(
        { number: matchdayNum, played: nextPlayed, played_at: nextPlayed ? new Date().toISOString() : null },
        { onConflict: 'number' }
      )
      .select('*')
      .single()
    setSavingMatchday(false)
    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }
    setMatchday(data as FantasyMatchday)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm text-gray-500">
          Puntuación del fantasy, jornada a jornada: solo aparecen los jugadores que algún participante ha puesto
          realmente en su 11 (no todos los elegibles). Los puntos se calculan solos según minutos, goles,
          asistencias, tarjetas, goles en propia y portería a cero.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Jornada
            <input
              type="number"
              min={1}
              value={matchdayNum}
              onChange={(e) => setMatchdayNum(Math.max(1, Number(e.target.value) || 1))}
              onFocus={(e) => e.target.select()}
              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={toggleMatchdayPlayed}
            disabled={savingMatchday}
            title={matchday?.played ? 'Vuelve a pulsar para desmarcarla' : undefined}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              matchday?.played ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {savingMatchday ? 'Guardando…' : matchday?.played ? '✓ Jornada jugada (pulsa para desmarcar)' : 'Marcar jornada como jugada'}
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
      </div>

      <div className="max-h-[70vh] overflow-auto rounded border border-gray-200 bg-white">
        {/* El wrapper necesita ser el propio contenedor de scroll (con una
            altura máxima real) para que el "sticky" de la cabecera funcione
            de verdad. Antes solo tenía overflow-x-auto, pero por cómo
            funciona overflow en CSS eso ya activa overflow-y:auto por
            debajo aunque no se vea — y al no tener una altura acotada, el
            "sticky" se quedaba pegado a un punto fijo dentro de la propia
            tabla en vez de seguir el scroll de la página, que es justo el
            solape raro que se veía. Con altura máxima + overflow-auto
            explícitos, y "top-0" (relativo a este contenedor, no a la
            página), se queda fijo arriba del todo mientras se hace scroll
            dentro de la tabla. */}
        {loadingPlayers || loadingMatchday ? (
          <p className="p-4 text-sm text-gray-500">Cargando…</p>
        ) : players.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">
            Todavía nadie ha puesto su 11, así que no hay jugadores que puntuar aquí.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              {/* El "sticky" va en cada <th>, no en la <tr> -- en varios
                  navegadores (sobre todo móviles) sticky en una fila entera
                  de tabla se renderiza mal y se solapa con las filas de
                  abajo. Puesto en cada celda es el patrón que funciona bien
                  en todos lados. */}
              <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="sticky top-0 z-10 bg-white px-3 py-2">Jugador</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">Min</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">Goles</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">Asist</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">🟨</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">🟥</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">En propia</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">Portería a 0</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2">Puntos</th>
                <th className="sticky top-0 z-10 bg-white px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((p) => {
                const row = rowFor(p.api_player_id)
                const team = LALIGA_TEAMS_2026_27.find((t) => t.id === p.team_id)
                const preview = calculateFantasyPoints({ player_position: p.player_position, ...row })
                const saved = savedPoints[p.api_player_id]
                const upToDate = saved != null && saved === preview
                return (
                  <tr key={p.api_player_id}>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        {team?.badge && <img src={team.badge} alt="" className="h-4 w-4 object-contain" />}
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className="text-[10px] text-gray-400">{FANTASY_POSITION_LABELS[p.player_position]}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={row.minutes}
                        onChange={(e) => updateRow(p.api_player_id, { minutes: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-14 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={row.goals}
                        onChange={(e) => updateRow(p.api_player_id, { goals: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-12 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={row.assists}
                        onChange={(e) => updateRow(p.api_player_id, { assists: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-12 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={2}
                        value={row.yellow_cards}
                        onChange={(e) => updateRow(p.api_player_id, { yellow_cards: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-12 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        value={row.red_cards}
                        onChange={(e) => updateRow(p.api_player_id, { red_cards: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-12 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        value={row.own_goals}
                        onChange={(e) => updateRow(p.api_player_id, { own_goals: Number(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className="w-12 rounded border border-gray-300 px-1.5 py-0.5"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={row.clean_sheet}
                        onChange={(e) => updateRow(p.api_player_id, { clean_sheet: e.target.checked })}
                      />
                    </td>
                    <td className={`px-2 py-1.5 text-center font-semibold ${upToDate ? 'text-gray-700' : 'text-amber-600'}`}>
                      {preview}
                      {!upToDate && <span title="Sin guardar todavía">*</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => saveRow(p)}
                        disabled={savingPlayerId === p.api_player_id}
                        className="rounded bg-brand-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {savingPlayerId === p.api_player_id ? '…' : 'Guardar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
