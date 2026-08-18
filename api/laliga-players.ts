// Proxy server-side hacia la API pública que usa el propio frontend de
// laliga.com (apim.laliga.com) para traer la plantilla de un equipo:
// nombre corto, nombre completo, posición, fecha de nacimiento, país y foto
// real. Vive como función serverless (no en src/) para que:
//  1. El navegador no tenga que pegarle directo a apim.laliga.com (CORS: esa
//     API no está pensada para terceros y probablemente lo bloquee).
//  2. La subscription-key no viaje en el bundle del cliente ni en cada
//     petición visible desde las devtools del usuario final.
//
// Uso: GET /api/laliga-players?teams=real-madrid,barcelona
// Devuelve: { results: { [nuestro_id_de_equipo]: { ok, players | error } } }
//
// Nota: esta subscription-key es la misma que usa laliga.com en su propio
// sitio público (viaja en claro en las peticiones que hace su web), no es un
// secreto nuestro — pero por si la rotan, se puede sobreescribir con la
// variable de entorno LALIGA_SUBSCRIPTION_KEY en Vercel sin tocar código.
import { TEAM_SLUGS } from './_laliga-teams'

const SUBSCRIPTION_KEY = process.env.LALIGA_SUBSCRIPTION_KEY || 'c13c3a8e2f6b46da9c5c425cf61fab3e'

const POSITION_MAP: Record<string, 'POR' | 'DEF' | 'MED' | 'DEL'> = {
  portero: 'POR',
  defensa: 'DEF',
  centrocampista: 'MED',
  delantero: 'DEL',
}

interface LaligaSquadEntry {
  position?: { slug?: string }
  person?: {
    name?: string
    nickname?: string
    date_of_birth?: string
    country?: { id?: string }
  }
  photos?: Record<string, Record<string, string>>
}

interface MappedPlayer {
  name: string
  full_name: string | null
  player_position: string
  birth_date: string | null
  nationality: string | null
  photo_url: string | null
}

function pickPhoto(photos: LaligaSquadEntry['photos']): string | null {
  if (!photos) return null
  const candidates = [photos['002']?.['512x512'], photos['001']?.['512x556'], photos['002']?.['256x256']]
  for (const url of candidates) {
    if (url && !url.includes('/default/')) return url
  }
  return null
}

async function fetchSquad(slug: string): Promise<MappedPlayer[]> {
  const url = `https://apim.laliga.com/public-service/api/v1/teams/${slug}/squad-manager?limit=50&offset=0&orderField=id&orderType=DESC&seasonYear=2026&contentLanguage=es&subscription-key=${SUBSCRIPTION_KEY}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`laliga.com respondió ${resp.status}`)
  const data = (await resp.json()) as { squads?: LaligaSquadEntry[] }
  const squads = data.squads ?? []

  return squads
    .filter((s) => POSITION_MAP[s.position?.slug ?? ''])
    .map((s) => {
      const nickname = s.person?.nickname?.trim() || s.person?.name?.trim() || 'Sin nombre'
      const fullName = s.person?.name?.trim() || null
      return {
        name: nickname,
        full_name: fullName && fullName !== nickname ? fullName : null,
        player_position: POSITION_MAP[s.position?.slug ?? ''],
        birth_date: s.person?.date_of_birth ? s.person.date_of_birth.slice(0, 10) : null,
        nationality: s.person?.country?.id ?? null,
        photo_url: pickPhoto(s.photos),
      }
    })
}

export default async function handler(req: { query: Record<string, string | string[] | undefined> }, res: {
  status: (code: number) => { json: (body: unknown) => void }
  setHeader: (name: string, value: string) => void
}) {
  const teamsParam = req.query.teams
  const teamIds = (Array.isArray(teamsParam) ? teamsParam[0] : teamsParam ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  if (teamIds.length === 0) {
    res.status(400).json({ error: 'Falta el parámetro ?teams=id1,id2 (ids de src/lib/teamData.ts)' })
    return
  }

  const results: Record<string, { ok: true; players: MappedPlayer[] } | { ok: false; error: string }> = {}

  await Promise.all(
    teamIds.map(async (teamId) => {
      const slug = TEAM_SLUGS[teamId]
      if (!slug) {
        results[teamId] = { ok: false, error: `Equipo "${teamId}" no tiene slug de laliga.com mapeado` }
        return
      }
      try {
        const players = await fetchSquad(slug)
        results[teamId] = { ok: true, players }
      } catch (err) {
        results[teamId] = { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
      }
    })
  )

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  res.status(200).json({ results })
}
