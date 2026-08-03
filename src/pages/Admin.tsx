import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Match, Matchday, Profile, SeasonQuestion } from '../lib/database.types'

export default function Admin() {
  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-xl font-semibold">Panel de administración</h1>
      <UsersSection />
      <SeasonQuestionsSection />
      <MatchdaysSection />
    </div>
  )
}

// ---------------- Usuarios / admins ----------------
function UsersSection() {
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
                <td className="px-4 py-2">{u.username}</td>
                <td className="px-4 py-2">{u.is_admin ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggleAdmin(u)} className="text-blue-600 hover:underline">
                    {u.is_admin ? 'Quitar admin' : 'Hacer admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// ---------------- Preguntas de apuestas iniciales ----------------
function SeasonQuestionsSection() {
  const [questions, setQuestions] = useState<SeasonQuestion[]>([])
  const [competition, setCompetition] = useState('liga')
  const [question, setQuestion] = useState('')
  const [points, setPoints] = useState(1)
  const [closesAt, setClosesAt] = useState('')
  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({})

  async function load() {
    const { data } = await supabase
      .from('season_questions')
      .select('*')
      .order('created_at', { ascending: true })
    setQuestions((data as SeasonQuestion[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  async function addQuestion() {
    if (!question.trim()) return
    await supabase.from('season_questions').insert({
      competition,
      question,
      points,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    })
    setQuestion('')
    setPoints(1)
    setClosesAt('')
    await load()
  }

  async function setResult(q: SeasonQuestion) {
    const result = resultDrafts[q.id]?.trim()
    if (!result) return
    await supabase.rpc('set_season_result', { p_question_id: q.id, p_result: result })
    await load()
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">Apuestas iniciales</h2>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-gray-200 bg-white p-4">
        <select value={competition} onChange={(e) => setCompetition(e.target.value)} className="rounded border border-gray-300 px-2 py-2 text-sm">
          <option value="liga">Liga</option>
          <option value="champions">Champions</option>
          <option value="otros">Otros</option>
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
          className="w-20 rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="rounded border border-gray-300 px-2 py-2 text-sm"
        />
        <button onClick={addQuestion} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
          Añadir
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 bg-white p-3 text-sm">
            <span>
              [{q.competition}] {q.question} ({q.points} pts)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Resultado real"
                onChange={(e) => setResultDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
                className="rounded border border-gray-300 px-2 py-1"
              />
              <button onClick={() => setResult(q)} className="text-blue-600 hover:underline">
                Fijar resultado
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <h2 className="mb-3 text-lg font-medium">Jornadas y partidos</h2>

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
