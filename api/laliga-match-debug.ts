// Endpoint TEMPORAL de diagnóstico: sirve para descubrir qué datos trae de
// verdad la página de un partido de laliga.com dentro de su bloque
// __NEXT_DATA__ (el JSON que Next.js incrusta en el HTML, el mismo truco que
// ya usa api/laliga-standings.ts).
//
// El objetivo es saber si ahí vienen las alineaciones de LOS DOS equipos y
// los eventos del partido, porque en el HTML visible solo se renderiza la
// alineación del equipo local (la del visitante está tras una pestaña que
// carga con JavaScript).
//
// Uso:  /api/laliga-match-debug
//       /api/laliga-match-debug?match=<slug-del-partido>
//       /api/laliga-match-debug?path=props.pageProps.match   (para asomarse
//                                a una rama concreta una vez sepamos cuál)
//
// Una vez tengamos el importador funcionando, este fichero se puede borrar.

const DEFAULT_MATCH = 'temporada-2026-2027-laliga-ea-sports-deportivo-alaves-getafe-cf-1'

// Palabras que delatan la rama del JSON que nos interesa.
const INTERESTING = ['lineup', 'alineac', 'player', 'jugador', 'event', 'squad', 'stat', 'card', 'goal', 'substit']

interface Summary {
  path: string
  type: string
  size?: number
  keys?: string[]
  sample?: unknown
}

// Recorre el JSON y devuelve un mapa de "qué hay y dónde", sin volcar el
// documento entero (que son cientos de KB).
function summarize(node: unknown, path: string, out: Summary[], depth: number, maxDepth: number) {
  if (depth > maxDepth || out.length > 400) return

  if (Array.isArray(node)) {
    out.push({ path, type: 'array', size: node.length, sample: node.length > 0 ? shallow(node[0]) : undefined })
    if (node.length > 0) summarize(node[0], `${path}[0]`, out, depth + 1, maxDepth)
    return
  }

  if (node && typeof node === 'object') {
    const keys = Object.keys(node as Record<string, unknown>)
    out.push({ path, type: 'object', size: keys.length, keys: keys.slice(0, 40) })
    for (const k of keys) {
      const child = (node as Record<string, unknown>)[k]
      const childPath = path ? `${path}.${k}` : k
      const looksInteresting = INTERESTING.some((w) => k.toLowerCase().includes(w))
      // Las ramas "interesantes" se exploran más hondo que el resto.
      summarize(child, childPath, out, depth + 1, looksInteresting ? maxDepth + 2 : maxDepth)
    }
  }
}

// Versión reducida de un objeto, para hacerse una idea sin volcarlo entero.
function shallow(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node
  if (Array.isArray(node)) return `[array de ${node.length}]`
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node as Record<string, unknown>).slice(0, 25)) {
    out[k] = v === null || typeof v !== 'object' ? v : Array.isArray(v) ? `[array de ${v.length}]` : '{objeto}'
  }
  return out
}

function getByPath(root: unknown, path: string): unknown {
  let node: unknown = root
  for (const part of path.split('.')) {
    if (!part) continue
    const arrayMatch = part.match(/^(.*)\[(\d+)\]$/)
    const key = arrayMatch ? arrayMatch[1] : part
    if (node && typeof node === 'object' && key in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[key]
    } else {
      return undefined
    }
    if (arrayMatch && Array.isArray(node)) node = node[Number(arrayMatch[2])]
  }
  return node
}

export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  }
) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const slug = one(req.query.match) || DEFAULT_MATCH
  const path = one(req.query.path)

  try {
    const url = `https://www.laliga.com/partido/${slug}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PorraAbueloncha/1.0)' },
    })
    if (!resp.ok) throw new Error(`laliga.com respondió ${resp.status}`)
    const html = await resp.text()

    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!match) {
      res.status(200).json({
        ok: false,
        htmlLength: html.length,
        error: 'No se encontró __NEXT_DATA__ en el HTML de esta página.',
        // Pistas por si el dato viniera en el HTML plano en vez de en JSON.
        pistas: {
          tieneTitulares: html.includes('Titulares'),
          vecesTitulares: (html.match(/Titulares/g) ?? []).length,
          vecesSuplentes: (html.match(/Suplentes/g) ?? []).length,
        },
      })
      return
    }

    const data = JSON.parse(match[1]) as unknown

    if (path) {
      const node = getByPath(data, path)
      res.status(200).json({ ok: true, path, value: node ?? null })
      return
    }

    const out: Summary[] = []
    summarize(data, '', out, 0, 4)

    // Lo más útil de un vistazo: las rutas cuyo nombre suena a lo que
    // buscamos (alineaciones, jugadores, eventos...).
    const interesantes = out.filter((s) => INTERESTING.some((w) => s.path.toLowerCase().includes(w)))

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
      ok: true,
      slug,
      jsonLength: match[1].length,
      rutasInteresantes: interesantes.slice(0, 120),
      estructura: out.slice(0, 200),
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Error desconocido' })
  }
}
