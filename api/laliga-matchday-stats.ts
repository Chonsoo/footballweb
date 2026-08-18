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

const SUBSCRIPTION_KEY = process.env.LALIGA_SUBSCRIPTION_KEY || 'c13c3a8e2f6b46da9c5c425cf61fab3e'

// slug de equipo en laliga.com -> nuestro id interno (ver src/lib/teamData.ts).
//
// Ojo: la tabla equivalente está duplicada en api/laliga-players.ts a
// propósito. Se intentó compartirla en un fichero aparte y las funciones
// dejaron de arrancar en Vercel (FUNCTION_INVOCATION_FAILED al instante), así
// que cada función serverless se mantiene autocontenida, sin imports locales.
// Si cambias una, cambia la otra.
//
// Se incluyen además los alias que usa la ficha de un partido, que no siempre
// coincide con el slug de la plantilla (p.ej. el Espanyol).
const OUR_TEAM_BY_SLUG: Record<string, string> = {
  'real-madrid': 'real-madrid',
  'fc-barcelona': 'barcelona',
  'atletico-de-madrid': 'atletico-madrid',
  'athletic-club': 'athletic-club',
  'villarreal-cf': 'villarreal',
  'real-betis': 'real-betis',
  'real-sociedad': 'real-sociedad',
  'rayo-vallecano': 'rayo-vallecano',
  'rc-celta': 'celta-vigo',
  'c-a-osasuna': 'osasuna',
  'ca-osasuna': 'osasuna',
  'getafe-cf': 'getafe',
  'd-alaves': 'alaves',
  'rcd-espanyol': 'espanyol',
  'rcd-espanyol-de-barcelona': 'espanyol',
  'valencia-cf': 'valencia',
  'sevilla-fc': 'sevilla',
  'levante-ud': 'levante',
  'elche-c-f': 'elche',
  'elche-cf': 'elche',
  'r-racing-club': 'racing-santander',
  'rc-deportivo': 'deportivo-coruna',
  'malaga-cf': 'malaga',
}
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

interface MatchPage {
  info: MatchSummary
  page: {
    events?: MatchEvent[]
    data?: { lineups?: { home?: TeamLineup; away?: TeamLineup } }
    match?: {
      home_team?: { id?: number; slug?: string }
      away_team?: { id?: number; slug?: string }
      home_score?: number | null
      away_score?: number | null
      status?: string
    }
  }
}

// Descarga la ficha de un partido una sola vez y devuelve tanto sus datos
// generales (equipos, marcador) como el bloque de la página, para no tener que
// pedirla dos veces.
async function fetchMatchPage(slug: string): Promise<MatchPage> {
  const resp = await fetch(`https://www.laliga.com/partido/${slug}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PorraAbueloncha/1.0)' },
  })
  if (!resp.ok) throw new Error(`la ficha respondió ${resp.status}`)
  const html = await resp.text()

  const raw = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!raw) throw new Error('no se encontró __NEXT_DATA__ en la ficha (¿han cambiado la web?)')

  const parsed = JSON.parse(raw[1]) as { props?: { pageProps?: MatchPage['page'] } }
  const page = parsed.props?.pageProps ?? {}
  const m = page.match
  return {
    info: {
      slug,
      homeSlug: m?.home_team?.slug ?? '',
      awaySlug: m?.away_team?.slug ?? '',
      homeScore: m?.home_score ?? null,
      awayScore: m?.away_score ?? null,
      status: m?.status ?? 'Unknown',
    },
    page,
  }
}

async function fetchMatchInfo(slug: string): Promise<MatchSummary> {
  const { info } = await fetchMatchPage(slug)
  return info
}

// Reconstruye el estado de cada jugador de un partido a partir de su ficha.
async function fetchMatchPlayers(match: MatchSummary): Promise<PlayerState[]> {
  const { page } = await fetchMatchPage(match.slug)
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

// Vercel corta las funciones por tiempo. Descargar las 10 fichas de una
// jornada en una sola petición se pasaba del límite (FUNCTION_INVOCATION_FAILED),
// así que este endpoint tiene dos modos y es el navegador quien va pidiendo
// los partidos de uno en uno:
//
//   ?matchday=1            -> solo la LISTA de partidos de esa jornada
//   ?match=<slug-partido>  -> las estadísticas de ESE partido
export const config = { maxDuration: 30 }

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  }
) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const matchSlug = one(req.query.match)

  try {
    res.setHeader('Cache-Control', 'no-store')

    // --- Modo 2: un partido concreto ---
    if (matchSlug) {
      const info = await fetchMatchInfo(matchSlug)
      const states = await fetchMatchPlayers(info)
      const players = states.map((p) => {
        const isHome = p.teamSlug === info.homeSlug
        const conceded = isHome ? info.awayScore : info.homeScore
        return toStats(p, conceded === 0)
      })
      const unknownTeams = [...new Set(states.map((p) => p.teamSlug))].filter((slug) => !OUR_TEAM_BY_SLUG[slug])
      res.status(200).json({
        match: matchSlug,
        players,
        warnings: unknownTeams.map((t) => `Equipo desconocido "${t}" (añádelo al mapa OUR_TEAM_BY_SLUG de este fichero)`),
      })
      return
    }

    // --- Modo 1: lista de partidos de la jornada ---
    const rawDay = one(req.query.matchday)
    const matchday = Number(rawDay)
    if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) {
      res.status(400).json({ error: 'Usa ?matchday=1..38 para listar, o ?match=<slug> para un partido' })
      return
    }

    const matches = await fetchMatchList(matchday)
    res.status(200).json({
      matchday,
      matches: matches.map((m) => ({
        slug: m.slug,
        home: m.homeSlug,
        away: m.awaySlug,
        status: m.status,
        // Solo tiene sentido pedir los partidos ya terminados.
        finished: m.status === 'FullTime' && m.homeScore != null && m.awayScore != null,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error desconocido' })
  }
}
