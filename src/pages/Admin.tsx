import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatAnswer } from '../lib/answerFormat'
import { normalizeText } from '../lib/textNormalize'
import { scoreRankingAnswer } from '../lib/rankingScoring'
import RankingAnswer from '../components/RankingAnswer'
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

type Tab = 'users' | 'create' | 'resolve' | 'matchdays'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Usuarios' },
  { id: 'create', label: 'Crear apuesta' },
  { id: 'resolve', label: 'Resolver apuestas' },
  { id: 'matchdays', label: 'Jornadas y partidos' },
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
              tab === t.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
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
                    <button onClick={() => toggleAdmin(u)} className="text-blue-600 hover:underline">
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
          className="self-start rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
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
      <OptionsBuilder
        options={config.options ?? []}
        onChange={(opts) => onChange({ ...config, options: opts })}
      />
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
            className={`rounded-full border px-3 py-1 ${filter === f ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600'}`}
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
            <button onClick={calculateRankingSuggestions} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
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
            <button onClick={autoApply} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
              Auto-aplicar puntos a quien acertó
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500">Respuestas y puntos (puedes ajustarlos a mano)</p>
          {Object.keys(pointsDrafts).length > 0 && (
            <button onClick={saveAllDrafts} disabled={saving} className="text-xs text-blue-600 hover:underline disabled:opacity-50">
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
                <button onClick={() => saveAnswerPoints(a.id)} className="text-blue-600 hover:underline">
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
        <button onClick={addMatchday} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
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
        <button onClick={addMatch} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
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
                <button onClick={() => settleMatch(m)} className="text-blue-600 hover:underline">
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
