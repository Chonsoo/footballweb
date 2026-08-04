// Proxy server-side hacia la página pública de laliga.com para traer la
// clasificación real (posición de cada equipo, puntos, etc.).
//
// A diferencia de laliga-players.ts (que pega directo a la API JSON
// apim.laliga.com), la clasificación no tiene un endpoint JSON accesible
// desde fuera del propio sitio -- laliga.com la sirve ya renderizada por el
// servidor (Next.js) dentro del HTML de la página de standings, en un bloque
// <script id="__NEXT_DATA__" type="application/json">. Así que aquí se
// descarga esa página pública y se extrae ese bloque en vez de llamar a una
// API "de verdad".
//
// Uso: GET /api/laliga-standings
// Devuelve: { positions: { [nuestro_id_de_equipo]: posicion }, unmapped: string[], updated_at }
//   - positions: listo para pegar directo en el editor de "Clasificación real"
//     de Admin > Resolver apuestas (mismo formato que espera resultDraft).
//   - unmapped: slugs de laliga.com que salieron en la tabla pero no tenemos
//     mapeados (no debería pasar con los 20 equipos de Primera, pero por si
//     laliga.com cambia algo).

const STANDINGS_URL = 'https://www.laliga.com/en-GB/laliga-easports/standing'

// Mismo mapeo id_interno -> slug_real de laliga.com que usa laliga-players.ts
// (ver ese archivo para el porqué de los slugs "raros" en varios equipos).
const TEAM_SLUGS: Record<string, string> = {
  'real-madrid': 'real-madrid',
  barcelona: 'fc-barcelona',
  'atletico-madrid': 'atletico-de-madrid',
  'athletic-club': 'athletic-club',
  villarreal: 'villarreal-cf',
  'real-betis': 'real-betis',
  'real-sociedad': 'real-sociedad',
  'rayo-vallecano': 'rayo-vallecano',
  'celta-vigo': 'rc-celta',
  osasuna: 'c-a-osasuna',
  getafe: 'getafe-cf',
  alaves: 'd-alaves',
  espanyol: 'rcd-espanyol',
  valencia: 'valencia-cf',
  sevilla: 'sevilla-fc',
  levante: 'levante-ud',
  elche: 'elche-c-f',
  'racing-santander': 'r-racing-club',
  'deportivo-coruna': 'rc-deportivo',
  malaga: 'malaga-cf',
}

const SLUG_TO_TEAM_ID: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_SLUGS).map(([teamId, slug]) => [slug, teamId])
)

interface StandingsRow {
  position: number
  team?: { slug?: string; shortname?: string; name?: string }
}

export default async function handler(
  _req: unknown,
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  }
) {
  try {
    const resp = await fetch(STANDINGS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PorraAbueloncha/1.0)' },
    })
    if (!resp.ok) throw new Error(`laliga.com respondió ${resp.status}`)
    const html = await resp.text()

    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!match) {
      throw new Error('No se encontró la clasificación en la página de laliga.com (puede que hayan cambiado el sitio)')
    }

    const json = JSON.parse(match[1]) as { props?: { pageProps?: { standings?: StandingsRow[] } } }
    const standings = json.props?.pageProps?.standings ?? []
    if (standings.length === 0) {
      throw new Error('La página de laliga.com no trajo clasificación (formato inesperado)')
    }

    const positions: Record<string, number> = {}
    const unmapped: string[] = []
    for (const row of standings) {
      const slug = row.team?.slug
      const teamId = slug ? SLUG_TO_TEAM_ID[slug] : undefined
      if (teamId) {
        positions[teamId] = row.position
      } else {
        unmapped.push(slug ?? row.team?.shortname ?? '?')
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ positions, unmapped, updated_at: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error desconocido' })
  }
}
