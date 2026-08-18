// Estadísticas de Fantasy de una jornada completa, sacadas de laliga.com.
//
// Cómo funciona:
//  1. Pide a la API pública de laliga.com los partidos de esa jornada.
//  2. De cada partido descarga su ficha y saca el bloque __NEXT_DATA__ (el
//     JSON que Next.js incrusta en el HTML, el mismo truco que usa
//     api/laliga-standings.ts). Ahí vienen las alineaciones de LOS DOS
//     equipos y todos los eventos con jugador, equipo y minuto.
//  3. Con eso reconstruye, jugador a jugador: minutos, goles, asistencias,
//     tarjetas, goles en propia y portería a cero.
//
// NO guarda nada: solo devuelve los datos para que el panel de Admin los
// muestre y sea una persona quien decida guardarlos.
//
// Uso: GET /api/laliga-matchday-stats?matchday=1

import { OUR_TEAM_BY_SLUG } from './_laliga-teams'

const SUBSCRIPTION_KEY = process.env.LALIGA_SUBSCRIPTION_KEY || 'c13c3a8e2f6b46da9c5c425cf61fab3e'
const SEASON_YEAR = 2026
const SUBSCRIPTION_SLUG = 'laliga-easports-2026'

// Un partido dura 90 minutos a efectos de puntuación: el descuento no cuenta
// (si no, un cambio en el 93' daría minutos negativos y un titular podría
// aparecer con 99). Los minutos de los eventos se recortan a este tope.
const FULL_MATCH_MINUTES = 90

interface LaligaPerson {
  name?: string
  nickname?: string
  firstname?: string
  lastname?: string
}

interface LineupEntry {
  shirt_number?: number
  status?: string
  captain?: boolean
  person?: LaligaPerson
  photos?: Record<string, Record<string, string>>
}

interface TeamLineup {
  manager?: LineupEntry[]
  starts?: LineupEntry[]
  subs?: LineupEntry[]
}

interface MatchEvent {
  match_event_kind?: { id?: number; name?: string; collection?: string }
  decision?: string
  lineup?: { team?: { id?: number }; person?: LaligaPerson }
  lineup_off?: { team?: { id?: number }; person?: LaligaPerson }
  assist?: { team?: { id?: number }; person?: LaligaPerson }
  minute?: number
}

interface MatchSummary {
  slug: string
  homeSlug: string
  awaySlug: string
  homeScore: number | null
  awayScore: number | null
  status: string
}

export interface PlayerMatchStats {
  // Id de jugador de laliga.com, sacado de la url de su foto (.../p176245/...).
  // Es la forma fiable de cruzarlo con nuestra tabla, porque nuestro photo_url
  // viene de la misma fuente y lleva el mismo id. Puede ser null si esa foto
  // no viniera, y entonces habrá que tirar de nombre.
  laliga_id: number | null
  name: string
  nickname: string
  team_id: string | null
  minutes: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  own_goals: number
  clean_sheet: boolean
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// El id del jugador viaja dentro de la url de su foto:
// https://assets.laliga.com/squad/2026/t173/p176245/64x64/...
function playerIdFromPhotos(photos: LineupEntry['photos']): number | null {
  if (!photos) return null
  for (const sizes of Object.values(photos)) {
    for (const url of Object.values(sizes ?? {})) {
      const m = typeof url === 'string' ? url.match(/\/p(\d+)\//) : null
      if (m) return Number(m[1])
    }
  }
  return null
}

// Estado de un jugador dentro de UN partido, antes de convertirlo a la fila
// final de estadísticas.
interface PlayerState {
  laligaId: number | null
  name: string
  nickname: string
  teamLaligaId: number | null
  teamSlug: string
  // Minuto en el que entra al campo (0 si es titular, null si no llegó a jugar)
  onMinute: number | null
  // Minuto en el que se va (cambio o roja); null = terminó el partido
  offMinute: number | null
  goals: number
  assists: number
  yellow: number
  red: number
  ownGoals: number
}

function clampMinute(minute: number | undefined): number {
  if (minute == null || Number.isNaN(minute)) return FULL_MATCH_MINUTES
  return Math.max(0, Math.min(minute, FULL_MATCH_MINUTES))
}

async function fetchJson(url: string): Promise<unknown> {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PorraAbueloncha/1.0)' } })
  if (!resp.ok) throw new Error(`laliga.com respondió ${resp.status}`)
  return resp.json()
}

async function fetchMatchList(matchday: number): Promise<MatchSummary[]> {
  const url =
    `https://apim.laliga.com/public-service/api/v1/matches?subscription-key=${SUBSCRIPTION_KEY}` +
    `&seasonYear=${SEASON_YEAR}&subscriptionSlug=${SUBSCRIPTION_SLUG}&week=${matchday}` +
    `&limit=20&orderField=date&orderType=ASC&contentLanguage=es`
  const data = (await fetchJson(url)) as {
    matches?: {
      slug?: string
      status?: string
      home_score?: number | null
      away_score?: number | null
      home_team?: { slug?: string }
      away_team?: { slug?: string }
    }[]
  }
  return (data.matches ?? [])
    .filter((m) => m.slug && m.home_team?.slug && m.away_team?.slug)
    .map((m) => ({
      slug: m.slug!,
      homeSlug: m.home_team!.slug!,
      awaySlug: m.away_team!.slug!,
      homeScore: m.home_score ?? null,
      awayScore: m.away_score ?? null,
      status: m.status ?? 'Unknown',
    }))
}

// Descarga la ficha de un partido y devuelve el estado de cada jugador.
async function fetchMatchPlayers(match: MatchSummary): Promise<PlayerState[]> {
  const resp = await fetch(`https://www.laliga.com/partido/${match.slug}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PorraAbueloncha/1.0)' },
  })
  if (!resp.ok) throw new Error(`la ficha respondió ${resp.status}`)
  const html = await resp.text()

  const raw = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!raw) throw new Error('no se encontró __NEXT_DATA__ en la ficha (¿han cambiado la web?)')

  const parsed = JSON.parse(raw[1]) as {
    props?: {
      pageProps?: {
        events?: MatchEvent[]
        data?: { lineups?: { home?: TeamLineup; away?: TeamLineup } }
        match?: { home_team?: { id?: number }; away_team?: { id?: number } }
      }
    }
  }
  const page = parsed.props?.pageProps
  const lineups = page?.data?.lineups
  if (!lineups?.home?.starts || !lineups?.away?.starts) {
    throw new Error('la ficha no trae alineaciones (puede que el partido no se haya jugado todavía)')
  }

  const homeTeamId = page?.match?.home_team?.id ?? null
  const awayTeamId = page?.match?.away_team?.id ?? null

  const players: PlayerState[] = []
  // Índice por nombre normalizado para localizar al jugador de cada evento:
  // los eventos NO traen foto (y por tanto no traen id), solo el nombre.
  const byName = new Map<string, PlayerState>()

  function addSide(side: TeamLineup | undefined, teamLaligaId: number | null, teamSlug: string) {
    const register = (entry: LineupEntry, isStarter: boolean) => {
      const person = entry.person ?? {}
      const name = (person.name ?? person.nickname ?? '').trim()
      const nickname = (person.nickname ?? person.name ?? '').trim()
      if (!name && !nickname) return
      const state: PlayerState = {
        laligaId: playerIdFromPhotos(entry.photos),
        name,
        nickname,
        teamLaligaId,
        teamSlug,
        onMinute: isStarter ? 0 : null,
        offMinute: null,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        ownGoals: 0,
      }
      players.push(state)
      // Se indexa por las dos formas del nombre: los eventos unas veces traen
      // el nombre completo y otras el apodo.
      for (const key of [normalize(name), normalize(nickname)]) {
        if (key && !byName.has(key)) byName.set(key, state)
      }
    }
    // Los entrenadores se dejan fuera a propósito: también reciben tarjetas
    // (en este partido el técnico del Getafe vio una amarilla) y no deben
    // aparecer como jugadores.
    for (const e of side?.starts ?? []) register(e, true)
    for (const e of side?.subs ?? []) register(e, false)
  }

  addSide(lineups.home, homeTeamId, match.homeSlug)
  addSide(lineups.away, awayTeamId, match.awaySlug)

  function find(person: LaligaPerson | undefined): PlayerState | undefined {
    if (!person) return undefined
    for (const candidate of [person.name, person.nickname]) {
      if (!candidate) continue
      const hit = byName.get(normalize(candidate))
      if (hit) return hit
    }
    return undefined
  }

  for (const ev of page?.events ?? []) {
    const kind = ev.match_event_kind
    const collection = (kind?.collection ?? '').toLowerCase()
    const kindName = (kind?.name ?? '').toLowerCase()

    // Los eventos de VAR describen revisiones (y algunas quedan anuladas);
    // la tarjeta o el gol que finalmente cuenta llega como su propio evento.
    if (collection === 'var' || ev.decision === 'cancelled') continue

    if (collection === 'booking') {
      const p = find(ev.lineup?.person)
      if (!p) continue
      if (kindName.includes('red')) {
        p.red += 1
        // Se queda sin jugar el resto del partido.
        const minute = clampMinute(ev.minute)
        p.offMinute = p.offMinute == null ? minute : Math.min(p.offMinute, minute)
      } else if (kindName.includes('yellow')) {
        p.yellow += 1
      }
      continue
    }

    if (collection === 'substitution') {
      const inPlayer = find(ev.lineup?.person)
      const outPlayer = find(ev.lineup_off?.person)
      const minute = clampMinute(ev.minute)
      if (inPlayer && inPlayer.onMinute == null) inPlayer.onMinute = minute
      if (outPlayer && outPlayer.offMinute == null) outPlayer.offMinute = minute
      continue
    }

    if (collection === 'goal') {
      const scorer = find(ev.lineup?.person)
      if (scorer) {
        if (kindName.includes('own')) scorer.ownGoals += 1
        else scorer.goals += 1
      }
      const assistant = find(ev.assist?.person)
      if (assistant && !kindName.includes('own')) assistant.assists += 1
      continue
    }
  }

  return players
}

function toStats(p: PlayerState, cleanSheet: boolean): PlayerMatchStats {
  const off = p.offMinute ?? FULL_MATCH_MINUTES
  const minutes = p.onMinute == null ? 0 : Math.max(0, off - p.onMinute)
  return {
    laliga_id: p.laligaId,
    name: p.name,
    nickname: p.nickname,
    team_id: OUR_TEAM_BY_SLUG[p.teamSlug] ?? null,
    minutes,
    goals: p.goals,
    assists: p.assists,
    yellow_cards: p.yellow,
    red_cards: p.red,
    own_goals: p.ownGoals,
    // La portería a cero la decide el marcador; que el jugador sume por ella
    // (y que haga falta jugar 60 minutos) ya lo resuelve la función de
    // puntuación de la base de datos, aquí solo se informa del hecho.
    clean_sheet: cleanSheet && minutes > 0,
  }
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  }
) {
  const raw = req.query.matchday
  const matchday = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) {
    res.status(400).json({ error: 'Falta el parámetro ?matchday=1..38' })
    return
  }

  try {
    const matches = await fetchMatchList(matchday)
    if (matches.length === 0) {
      res.status(200).json({ matchday, players: [], matches: [], warnings: ['No se encontraron partidos de esa jornada.'] })
      return
    }

    const players: PlayerMatchStats[] = []
    const warnings: string[] = []
    const matchReports: { slug: string; ok: boolean; status: string; detail?: string }[] = []

    // En serie a propósito: son 10 fichas y no queremos parecer un robot
    // agresivo contra laliga.com ni pasarnos del tiempo límite de la función.
    for (const m of matches) {
      const label = `${m.homeSlug} vs ${m.awaySlug}`
      if (m.homeScore == null || m.awayScore == null || m.status !== 'FullTime') {
        matchReports.push({ slug: m.slug, ok: false, status: m.status, detail: 'todavía no ha terminado' })
        warnings.push(`${label}: todavía no ha terminado, no se han cargado sus datos.`)
        continue
      }
      try {
        const statesInMatch = await fetchMatchPlayers(m)
        for (const p of statesInMatch) {
          const isHome = p.teamSlug === m.homeSlug
          const conceded = isHome ? m.awayScore : m.homeScore
          players.push(toStats(p, conceded === 0))
          if (!OUR_TEAM_BY_SLUG[p.teamSlug]) {
            const msg = `Equipo desconocido "${p.teamSlug}" (hay que añadirlo a api/_laliga-teams.ts)`
            if (!warnings.includes(msg)) warnings.push(msg)
          }
        }
        matchReports.push({ slug: m.slug, ok: true, status: m.status })
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'error desconocido'
        matchReports.push({ slug: m.slug, ok: false, status: m.status, detail })
        warnings.push(`${label}: ${detail}`)
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ matchday, players, matches: matchReports, warnings })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error desconocido' })
  }
}
