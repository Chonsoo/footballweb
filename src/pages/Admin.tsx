import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import { normalizeText } from '../lib/textNormalize'
import { scoreRankingAnswer } from '../lib/rankingScoring'
import RankingAnswer from '../components/RankingAnswer'
import PlayerSelect from '../components/PlayerSelect'
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
  Match,
  Matchday,
  Profile,
  QuestionConfig,
  QuestionPhase,
  SeasonAnswer,
  SeasonQuestion,
  SeasonResult,
} from '../lib/database.types'

type Tab = 'users' | 'create' | 'resolve' | 'matchdays' | 'fantasy' | 'fantasy-stats'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Usuarios' },
  { id: 'create', label: 'Crear apuesta' },
  { id: 'resolve', label: 'Resolver apuestas' },
  { id: 'matchdays', label: 'Jornadas y partidos' },
  { id: 'fantasy', label: 'Jugadores fantasy' },
  { id: 'fantasy-stats', label: 'Puntuación fantasy' },
]

export default function Admin() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Panel de administración</h1>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'border-b-2 border-brand-700 text-brand-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersSection />}
      {tab === 'create' && <CreateQuestionSection />}
      {tab === 'resolve' && <ResolveQuestionsSection />}
      {tab === 'matchdays' && <MatchdaysSection />}
      {tab === 'fantasy' && <FantasyPlayersSection />}
      {tab === 'fantasy-stats' && <FantasyStatsSection />}
    </div>
  )
}

// ---------------- Usuarios / admins ----------------
function UsersSection() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

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
    await load()
  }

  async function removeUser(u: Profile) {
    if (!confirm(`¿Borrar a ${u.username}? Se eliminan también todas sus apuestas. Esto no se puede deshacer.`)) return
    const { error } = await supabase.rpc('delete_user', { p_user_id: u.id })
    if (error) {
      alert(error.message)
      return
    }
    await load()
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
              <th className="px-4 py-2">Admin</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {u.username}
                  {!u.email_confirmed && (
                    <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                      sin confirmar
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{u.is_admin ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => toggleAdmin(u)} className="text-brand-700 hover:underline">
                      {u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => removeUser(u)} className="text-red-600 hover:underline">
                        Borrar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// ---------------- Crear apuesta ----------------
function CreateQuestionSection() {
  const [competition, setCompetition] = useState('liga')
  const [question, setQuestion] = useState('')
  const [answerType, setAnswerType] = useState<AnswerType>('text')
  const [phase, setPhase] = useState<QuestionPhase>('weekly')
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
      .limit(8)
    setRecent((data as SeasonQuestion[]) ?? [])
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
        El resto de preguntas (texto, opción o predicción de resultado) se crean aquí. Márcalas como
        <strong> Inicial</strong> si son fijas desde el principio, o <strong>Semana</strong> si las vas añadiendo
        durante la temporada ligadas a un partido/jornada.
      </p>

      <div className="mb-4 flex flex-col gap-3 rounded border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <select value={competition} onChange={(e) => setCompetition(e.target.value)} className="rounded border border-gray-300 px-2 py-2 text-sm">
            <option value="liga">Liga</option>
            <option value="champions">Champions</option>
            <option value="otros">Otros</option>
          </select>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value as QuestionPhase)}
            className="rounded border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="weekly">Semana</option>
            <option value="initial">Inicial</option>
          </select>
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
function ResolveQuestionsSection() {
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

  const visible = questions.filter((q) => filter === 'all' || q.phase === filter)

  return (
    <section>
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
  const [resultDraft, setResultDraft] = useState<AnswerValue>(
    result?.result ??
      (question.answer_type === 'score_prediction' ? { home: 0, away: 0 } : question.answer_type === 'ranking' ? {} : '')
  )
  const [pointsDrafts, setPointsDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function saveResult() {
    await supabase.rpc('set_season_result', { p_question_id: question.id, p_result: resultDraft })
    await onChanged()
  }

  async function autoApply() {
    await supabase.rpc('apply_season_result_points', { p_question_id: question.id })
    await onChanged()
  }

  async function saveAnswerPoints(answerId: string) {
    const raw = pointsDrafts[answerId]
    if (raw === undefined || raw === '') return
    await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
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

  async function saveAllDrafts() {
    setSaving(true)
    const entries = Object.entries(pointsDrafts).filter(([, v]) => v !== '')
    for (const [answerId, raw] of entries) {
      await supabase.rpc('set_answer_points', { p_answer_id: answerId, p_points: Number(raw) })
    }
    setSaving(false)
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
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Solo calcula el Bloque 1 base (posición exacta / margen de error). Los bonus por pleno de zona (Champions,
            Europa League, Descenso…) hay que sumarlos a mano si aplican, revisando cada respuesta abajo antes de guardar.
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

// ---------------- Jornadas y partidos ----------------
function MatchdaysSection() {
  const [matchdays, setMatchdays] = useState<Matchday[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [competition, setCompetition] = useState('liga')
  const [number, setNumber] = useState(1)
  const [deadline, setDeadline] = useState('')

  const [selectedMatchday, setSelectedMatchday] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { home: string; away: string }>>({})

  async function load() {
    const { data: mds } = await supabase.from('matchdays').select('*').order('deadline', { ascending: false })
    const { data: ms } = await supabase.from('matches').select('*').order('kickoff', { ascending: true })
    setMatchdays((mds as Matchday[]) ?? [])
    setMatches((ms as Match[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function addMatchday() {
    if (!deadline) return
    await supabase.from('matchdays').insert({
      competition,
      number,
      deadline: new Date(deadline).toISOString(),
    })
    setNumber((n) => n + 1)
    setDeadline('')
    await load()
  }

  async function addMatch() {
    if (!selectedMatchday || !homeTeam || !awayTeam || !kickoff) return
    await supabase.from('matches').insert({
      matchday_id: selectedMatchday,
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff: new Date(kickoff).toISOString(),
    })
    setHomeTeam('')
    setAwayTeam('')
    setKickoff('')
    await load()
  }

  async function settleMatch(m: Match) {
    const draft = scoreDrafts[m.id]
    if (!draft || draft.home === '' || draft.away === '') return
    await supabase.rpc('settle_match', {
      p_match_id: m.id,
      p_home_score: Number(draft.home),
      p_away_score: Number(draft.away),
    })
    await load()
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-4">
        <select value={competition} onChange={(e) => setCompetition(e.target.value)} className="rounded border border-gray-300 px-2 py-2 text-sm">
          <option value="liga">Liga</option>
          <option value="champions">Champions</option>
        </select>
        <input
          type="number"
          min={1}
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
          className="w-20 rounded border border-gray-300 px-2 py-2 text-sm"
          placeholder="Jornada nº"
        />
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <button onClick={addMatchday} className="rounded bg-brand-700 px-3 py-2 text-sm font-medium text-white">
          Crear jornada
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-4">
        <select
          value={selectedMatchday}
          onChange={(e) => setSelectedMatchday(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        >
          <option value="">Elige jornada…</option>
          {matchdays.map((m) => (
            <option key={m.id} value={m.id}>
              {m.competition} J{m.number}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Local"
          value={homeTeam}
          onChange={(e) => setHomeTeam(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Visitante"
          value={awayTeam}
          onChange={(e) => setAwayTeam(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <button onClick={addMatch} className="rounded bg-brand-700 px-3 py-2 text-sm font-medium text-white">
          Añadir partido
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {matches.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 bg-white p-3 text-sm">
            <span>
              {m.home_team} vs {m.away_team} · {m.status}
              {m.status === 'finished' && ` (${m.home_score}-${m.away_score})`}
            </span>
            {m.status !== 'finished' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="w-14 rounded border border-gray-300 px-2 py-1"
                  onChange={(e) =>
                    setScoreDrafts((d) => ({ ...d, [m.id]: { home: e.target.value, away: d[m.id]?.away ?? '' } }))
                  }
                />
                <span>-</span>
                <input
                  type="number"
                  min={0}
                  className="w-14 rounded border border-gray-300 px-2 py-1"
                  onChange={(e) =>
                    setScoreDrafts((d) => ({ ...d, [m.id]: { home: d[m.id]?.home ?? '', away: e.target.value } }))
                  }
                />
                <button onClick={() => settleMatch(m)} className="text-brand-700 hover:underline">
                  Cerrar partido
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
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
          `Línea ${i + 1}: formato incorrecto (usa Nombre;POSICION;AAAA-MM-DD;id_equipo;nacionalidad;photo_url;nombre_completo) — "${line}"`
        )
        return
      }
      const [name, posRaw, birthDate, teamIdRaw, nationalityRaw, photoUrlRaw, fullNameRaw] = parts
      const position = posRaw.toUpperCase()
      if (!POSITIONS.includes(position)) {
        errors.push(`Línea ${i + 1}: posición "${posRaw}" no válida (usa POR, DEF, MED o DEL) — "${line}"`)
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        errors.push(`Línea ${i + 1}: fecha de nacimiento "${birthDate}" no tiene formato AAAA-MM-DD — "${line}"`)
        return
      }
      const teamId = teamIdRaw.toLowerCase()
      const team = LALIGA_TEAMS_2026_27.find((t) => t.id === teamId)
      if (!team) {
        errors.push(`Línea ${i + 1}: id de equipo "${teamIdRaw}" no reconocido — mira la lista de ids más abajo`)
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
          jugadores" — no se guarda nada automáticamente.
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
          Puntuación del fantasy, jornada a jornada — solo aparecen los jugadores que algún participante ha puesto
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

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        {loadingPlayers || loadingMatchday ? (
          <p className="p-4 text-sm text-gray-500">Cargando…</p>
        ) : players.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">
            Todavía nadie ha puesto su 11, así que no hay jugadores que puntuar aquí.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="sticky top-16 z-10 border-b border-gray-200 bg-white text-left text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2">Jugador</th>
                <th className="px-2 py-2">Min</th>
                <th className="px-2 py-2">Goles</th>
                <th className="px-2 py-2">Asist</th>
                <th className="px-2 py-2">🟨</th>
                <th className="px-2 py-2">🟥</th>
                <th className="px-2 py-2">En propia</th>
                <th className="px-2 py-2">Portería a 0</th>
                <th className="px-2 py-2">Puntos</th>
                <th className="px-2 py-2"></th>
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
