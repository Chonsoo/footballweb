import { LALIGA_TEAMS_2026_27 } from './teamData'

// El "Fiasco Europeo" y el "Podio Underdog" (Bloque 2) se pueden calcular
// directamente comparando la clasificación real ya fijada en el Bloque 1
// contra el grupo de equipos de cada pregunta -- no hace falta ninguna
// "clasificación prevista" aparte, basta con mirar dónde ha quedado cada uno.

// Fiasco Europeo: el peor colocado de los equipos elegibles (los que jugaron
// competición europea la temporada pasada), sea cual sea su posición real.
export function computeFiasco(block1Result: Record<string, number>, eligibleTeamIds: string[]): string | null {
  let worst: string | null = null
  let worstPos = -1
  for (const id of eligibleTeamIds) {
    const pos = block1Result[id]
    if (pos != null && pos > worstPos) {
      worstPos = pos
      worst = id
    }
  }
  return worst
}

export interface UnderdogPodium {
  gold: string | null
  silver: string | null
  bronze: string | null
}

// Podio Underdog: a diferencia del Fiasco, el oro/plata/bronce se calcula
// SOLO entre los equipos que algún participante haya elegido de verdad (no
// entre los 12 elegibles en abstracto) -- si nadie eligió al que de hecho
// acabó mejor colocado, el oro pasa al siguiente equipo mejor colocado que sí
// haya elegido alguien, y así sucesivamente, para que siempre haya oro, plata
// y bronce con opciones que alguien pueda haber acertado.
export function computeUnderdogPodium(block1Result: Record<string, number>, pickedTeamIds: string[]): UnderdogPodium {
  const uniqueIds = [...new Set(pickedTeamIds)]
  const ranked = uniqueIds
    .map((id) => ({ id, pos: block1Result[id] }))
    .filter((e): e is { id: string; pos: number } => e.pos != null)
    .sort((a, b) => a.pos - b.pos)
  return { gold: ranked[0]?.id ?? null, silver: ranked[1]?.id ?? null, bronze: ranked[2]?.id ?? null }
}

// Reparto de puntos del Podio Underdog (pregunta de 15 pts en total):
// acertar el equipo que queda oro vale el total, plata y bronce valen menos.
const UNDERDOG_POINTS = { gold: 15, silver: 8, bronze: 3 }

export function scoreUnderdogAnswer(podium: UnderdogPodium, answerTeamName: string | undefined): number {
  if (!answerTeamName) return 0
  const teamId = LALIGA_TEAMS_2026_27.find((t) => t.name === answerTeamName)?.id
  if (!teamId) return 0
  if (teamId === podium.gold) return UNDERDOG_POINTS.gold
  if (teamId === podium.silver) return UNDERDOG_POINTS.silver
  if (teamId === podium.bronze) return UNDERDOG_POINTS.bronze
  return 0
}
